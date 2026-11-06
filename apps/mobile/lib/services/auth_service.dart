import 'dart:async';
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../config.dart';
import 'dart:io';

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

class AuthService {
  AuthService({http.Client? client, FlutterSecureStorage? storage})
    : _client = client ?? http.Client(),
      _storage = storage ?? const FlutterSecureStorage();

  static final AuthService instance = AuthService();

  static const _tokenKey = 'eisai_auth_token';
  static const _emailKey = 'eisai_auth_email';
  final FlutterSecureStorage _storage;
  final http.Client _client;

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
      'password': password, // Do not trim passwords.
    });
    return data['message'] as String? ??
        'Check your email to verify your account.';
  }

  Future<AuthUser> login({
    required String email,
    required String password,
  }) async {
    final data = await _post('login', {
      'email': email.trim().toLowerCase(),
      'password': password,
    });
    final token = data['token'];
    final userData = data['user'];
    if (token is! String ||
        token.isEmpty ||
        userData is! Map<String, dynamic>) {
      throw const AuthException('Invalid login response from server.');
    }
    if (_expired(token)) {
      throw const AuthException(
        'Server returned an expired token. Please try again.',
      );
    }
    final user = AuthUser.fromJson(userData);
    await _storage.write(key: _tokenKey, value: token);
    await _storage.write(key: _emailKey, value: user.email);
    return user;
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

  Future<String?> validToken() async {
    final token = await _storage.read(key: _tokenKey);
    if (token == null) return null;
    if (_expired(token)) {
      await logout();
      return null;
    }
    return token;
  }

  Future<String?> signedInEmail() async {
    if (await validToken() == null) return null;
    return _storage.read(key: _emailKey);
  }

  Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _emailKey);
  }

  bool _expired(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return true;
      final payload = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
      );
      if (payload is! Map || payload['exp'] is! num) return true;
      final expiresAt = DateTime.fromMillisecondsSinceEpoch(
        (payload['exp'] as num).toInt() * 1000,
        isUtc: true,
      );
      return !expiresAt.isAfter(DateTime.now().toUtc());
    } catch (_) {
      return true;
    }
  }
}
