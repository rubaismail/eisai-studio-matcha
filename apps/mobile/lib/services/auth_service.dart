import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../config.dart';

class AuthException implements Exception {
  const AuthException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class AuthUser {
  const AuthUser({required this.id, required this.email, required this.role});
  final String id;
  final String email;
  final String role;

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
    id: json['_id'] as String? ?? '',
    email: json['email'] as String? ?? '',
    role: json['role'] as String? ?? 'customer',
  );
}

abstract class SessionStore {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

class SecureSessionStore implements SessionStore {
  SecureSessionStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}

class AuthService {
  AuthService({http.Client? client, SessionStore? store})
    : _client = client ?? http.Client(),
      _store = store ?? SecureSessionStore();

  static AuthService instance = AuthService();

  static const _tokenKey = 'eisai_auth_token';
  static const _emailKey = 'eisai_auth_email';
  static const _roleKey = 'eisai_auth_role';

  final SessionStore _store;
  final http.Client _client;

  final ValueNotifier<String?> _signedInEmail = ValueNotifier<String?>(null);
  final ValueNotifier<String?> _signedInRole = ValueNotifier<String?>(null);
  int _sessionRevision = 0;

  Future<void> _storageQueue = Future<void>.value();

  Future<T> _withStorageLock<T>(Future<T> Function() operation) {
    final result = _storageQueue.then((_) => operation());
    _storageQueue = result.then<void>(
      (_) {},
      onError: (Object error, StackTrace stackTrace) {},
    );
    return result;
  }

  void _checkLoginRevision(int revision) {
    if (revision != _sessionRevision) {
      throw const AuthException(
        'Login was cancelled because the session changed.',
      );
    }
  }

  ValueListenable<String?> get signedInEmailListenable => _signedInEmail;
  String? get currentEmail => _signedInEmail.value;
  String? get currentRole => _signedInRole.value;
  bool get isAdmin => currentRole == 'admin';
  ValueListenable<String?> get signedInRoleListenable => _signedInRole;

  Uri _url(String path) =>
      Uri.parse('${apiUrl.replaceFirst(RegExp(r'/$'), '')}/auth/$path');

  Future<Map<String, dynamic>> _post(
    String path,
    Map<String, String> payload,
  ) async {
    late http.Response response;
    try {
      response = await _client
          .post(
            _url(path),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 15));
    } on TimeoutException {
      throw const AuthException(
        'The server took too long to respond. Please try again.',
      );
    } on SocketException {
      throw const AuthException(
        'Cannot connect to the server. Make sure the API is running.',
      );
    } on http.ClientException {
      throw const AuthException(
        'Unable to reach the server. Check your connection.',
      );
    } catch (_) {
      throw const AuthException(
        'An unexpected error occurred. Please try again.',
      );
    }

    Map<String, dynamic> data;
    try {
      final decoded = jsonDecode(response.body);
      data = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
    } catch (_) {
      throw AuthException(
        'Unexpected server response.',
        statusCode: response.statusCode,
      );
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = response.statusCode == 429
          ? 'Too many requests. Please wait before trying again.'
          : (data['error'] is String
                ? data['error'] as String
                : 'Request failed.');
      throw AuthException(message, statusCode: response.statusCode);
    }
    return data;
  }

  Future<String> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
  }) async {
    final data = await _post('register', {
      'firstName': firstName.trim(),
      'lastName': lastName.trim(),
      'email': email.trim().toLowerCase(),
      'password': password,
    });
    return data['message'] as String? ??
        'Check your email to verify your account.';
  }

  Future<AuthUser> login({
    required String email,
    required String password,
  }) async {
    final revision = ++_sessionRevision;
    final data = await _post('login', {
      'email': email.trim().toLowerCase(),
      'password': password,
    });
    _checkLoginRevision(revision);

    final token = data['token'];
    final userData = data['user'];
    if (token is! String ||
        token.isEmpty ||
        userData is! Map<String, dynamic>) {
      throw const AuthException('Invalid login response from server.');
    }
    final user = AuthUser.fromJson(userData);

    return _withStorageLock<AuthUser>(() async {
      _checkLoginRevision(revision);
      await _store.write(_tokenKey, token);
      await _store.write(_emailKey, user.email);
      await _store.write(_roleKey, user.role);
      _checkLoginRevision(revision);
      _signedInRole.value = user.role;
      _signedInEmail.value = user.email;
      return user;
    });
  }

  Future<String> resendVerification(String email) async {
    final data = await _post('resend-verification', {
      'email': email.trim().toLowerCase(),
    });
    return data['message'] as String? ??
        'If verification is needed, an email has been sent.';
  }

  Future<String> forgotPassword(String email) async {
    final data = await _post('forgot-password', {
      'email': email.trim().toLowerCase(),
    });
    return data['message'] as String? ??
        'If an account exists for this email, a password-reset link has been sent.';
  }

  Future<String?> restoreSession() async {
    final revision = _sessionRevision;
    final token = await _store.read(_tokenKey);
    if (revision != _sessionRevision) {
      return null;
    }
    if (token == null || token.isEmpty) {
      _signedInRole.value = null;
      _signedInEmail.value = null;
      return null;
    }
    final email = await _store.read(_emailKey);
    if (revision != _sessionRevision) {
      return null;
    }

    final role = await _store.read(_roleKey);
    if (revision != _sessionRevision) return null;
    _signedInRole.value = role;
    _signedInEmail.value = email;
    return email;
  }

  Future<String?> validToken() async {
    final token = await _store.read(_tokenKey);
    return (token == null || token.isEmpty) ? null : token;
  }

  Future<String?> signedInEmail() => restoreSession();

  Future<void> logout() async {
    _sessionRevision++;
    _signedInEmail.value = null;
    _signedInRole.value = null;

    return _withStorageLock<void>(() async {
      try {
        await _store.delete(_tokenKey);
      } finally {
        try {
          await _store.delete(_emailKey);
        } finally {
          await _store.delete(_roleKey);
        }
      }
    });
  }
}
