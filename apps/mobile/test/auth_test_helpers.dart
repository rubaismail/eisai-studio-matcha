import 'dart:convert';

import 'package:eisai_mobile/services/auth_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class MemorySessionStore implements SessionStore {
  MemorySessionStore([Map<String, String>? initial])
    : values = {...?initial};

  final Map<String, String> values;

  @override
  Future<String?> read(String key) async => values[key];

  @override
  Future<void> write(String key, String value) async => values[key] = value;

  @override
  Future<void> delete(String key) async => values.remove(key);
}

const tokenKey = 'eisai_auth_token';
const emailKey = 'eisai_auth_email';

String expiredLookingToken() {
  final payload = base64Url.encode(utf8.encode('{"exp":1}'));
  return 'header.$payload.signature';
}

Map<String, dynamic> loginBody({
  String email = 'user@example.com',
  String? token,
}) => {
  'token': token ?? 'token-abc',
  'user': {'_id': 'u1', 'email': email, 'role': 'customer'},
};

class FakeApi {
  FakeApi(this._handler);

  final http.Response Function(http.Request request) _handler;
  final List<http.Request> requests = [];

  http.Request get last => requests.last;
  Map<String, dynamic> get lastBody =>
      jsonDecode(last.body) as Map<String, dynamic>;

  MockClient get client => MockClient((request) async {
    requests.add(request);
    return _handler(request);
  });
}

http.Response jsonResponse(int status, Map<String, dynamic> body) =>
    http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json'},
    );
