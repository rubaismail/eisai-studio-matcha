import 'dart:async';
import 'dart:io';

import 'package:eisai_mobile/services/auth_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'auth_test_helpers.dart';

AuthService serviceWith(http.Client client, [MemorySessionStore? store]) =>
    AuthService(client: client, store: store ?? MemorySessionStore());

class PausedSessionStore extends MemorySessionStore {
  PausedSessionStore(super.initial);

  final readStarted = Completer<void>();
  final resumeRead = Completer<void>();

  bool _pausedOnce = false;

  @override
  Future<String?> read(String key) async {
    if (key == tokenKey && !_pausedOnce) {
      _pausedOnce = true;

      final oldValue = await super.read(key);

      readStarted.complete();

      await resumeRead.future;

      return oldValue;
    }

    return super.read(key);
  }
}

class PausedWriteStore extends MemorySessionStore {
  PausedWriteStore() : super();

  final writeStarted = Completer<void>();
  final resumeWrite = Completer<void>();
  bool _pausedOnce = false;

  @override
  Future<void> write(String key, String value) async {
    if (key == tokenKey && !_pausedOnce) {
      _pausedOnce = true;
      writeStarted.complete();
      await resumeWrite.future;
    }
    await super.write(key, value);
  }
}

void main() {
  group('login', () {
    test(
      'stores token + email, notifies listeners, normalises email',
      () async {
        final api = FakeApi((_) => jsonResponse(200, loginBody()));
        final store = MemorySessionStore();
        final service = serviceWith(api.client, store);
        final seen = <String?>[];
        service.signedInEmailListenable.addListener(
          () => seen.add(service.currentEmail),
        );

        final user = await service.login(
          email: '  User@Example.COM ',
          password: ' pw ',
        );

        expect(user.email, 'user@example.com');
        expect(api.last.url.path, endsWith('/auth/login'));
        expect(api.lastBody['email'], 'user@example.com');
        expect(api.lastBody['password'], ' pw '); // passwords are not trimmed
        expect(store.values[tokenKey], 'token-abc');
        expect(store.values[emailKey], 'user@example.com');
        expect(service.currentEmail, 'user@example.com');
        expect(seen, ['user@example.com']);
      },
    );

    test('accepts a token that looks expired by the device clock', () async {
      final api = FakeApi(
        (_) => jsonResponse(200, loginBody(token: expiredLookingToken())),
      );
      final store = MemorySessionStore();
      final service = serviceWith(api.client, store);

      await service.login(email: 'user@example.com', password: 'pw');

      expect(store.values[tokenKey], expiredLookingToken());
      expect(service.currentEmail, 'user@example.com');
      expect(await service.validToken(), expiredLookingToken());
    });

    test('401 surfaces the server error and stores nothing', () async {
      final api = FakeApi(
        (_) => jsonResponse(401, {'error': 'Invalid credentials'}),
      );
      final store = MemorySessionStore();
      final service = serviceWith(api.client, store);

      await expectLater(
        service.login(email: 'a@b.co', password: 'x'),
        throwsA(
          isA<AuthException>()
              .having((e) => e.statusCode, 'statusCode', 401)
              .having((e) => e.message, 'message', 'Invalid credentials'),
        ),
      );
      expect(store.values, isEmpty);
      expect(service.currentEmail, isNull);
    });

    test('429 uses the rate-limit message', () async {
      final api = FakeApi((_) => jsonResponse(429, {}));
      await expectLater(
        serviceWith(api.client).login(email: 'a@b.co', password: 'x'),
        throwsA(
          isA<AuthException>().having(
            (e) => e.message,
            'message',
            'Too many requests. Please wait before trying again.',
          ),
        ),
      );
    });

    test('pending login cannot sign in after logout', () async {
      final requestStarted = Completer<void>();
      final response = Completer<http.Response>();
      final client = MockClient((request) {
        requestStarted.complete();
        return response.future;
      });
      final store = MemorySessionStore();
      final service = serviceWith(client, store);

      final loginFuture = service.login(
        email: 'user@example.com',
        password: 'secret',
      );
      final loginExpectation = expectLater(
        loginFuture,
        throwsA(isA<AuthException>()),
      );
      await requestStarted.future;
      await service.logout();
      response.complete(jsonResponse(200, loginBody()));
      await loginExpectation;

      expect(store.values, isEmpty);
      expect(service.currentEmail, isNull);
      expect(await service.validToken(), isNull);
    });

    test('logout wins during token storage write', () async {
      final api = FakeApi((_) => jsonResponse(200, loginBody()));
      final store = PausedWriteStore();
      final service = serviceWith(api.client, store);
      final loginFuture = service.login(
        email: 'user@example.com',
        password: 'secret',
      );
      final loginExpectation = expectLater(
        loginFuture,
        throwsA(isA<AuthException>()),
      );

      await store.writeStarted.future;
      final logoutFuture = service.logout();
      expect(service.currentEmail, isNull);
      store.resumeWrite.complete();
      await loginExpectation;
      await logoutFuture;

      expect(store.values, isEmpty);
      expect(service.currentEmail, isNull);
      expect(await service.validToken(), isNull);
    });
    test('missing token or user is an invalid response', () async {
      final api = FakeApi((_) => jsonResponse(200, {'user': {}}));
      final store = MemorySessionStore();
      await expectLater(
        serviceWith(api.client, store).login(email: 'a@b.co', password: 'x'),
        throwsA(
          isA<AuthException>().having(
            (e) => e.message,
            'message',
            'Invalid login response from server.',
          ),
        ),
      );
      expect(store.values, isEmpty);
    });
  });

  group('network and parsing errors', () {
    Future<void> expectMessage(Object error, String message) async {
      final client = MockClient((_) async => throw error);
      await expectLater(
        serviceWith(client).login(email: 'a@b.co', password: 'x'),
        throwsA(
          isA<AuthException>().having((e) => e.message, 'message', message),
        ),
      );
    }

    test(
      'socket error',
      () => expectMessage(
        const SocketException('down'),
        'Cannot connect to the server. Make sure the API is running.',
      ),
    );

    test(
      'client error',
      () => expectMessage(
        http.ClientException('boom'),
        'Unable to reach the server. Check your connection.',
      ),
    );

    test(
      'timeout',
      () => expectMessage(
        TimeoutException('slow'),
        'The server took too long to respond. Please try again.',
      ),
    );

    test(
      'unknown error',
      () => expectMessage(
        StateError('?'),
        'An unexpected error occurred. Please try again.',
      ),
    );

    test('non-JSON body', () async {
      final client = MockClient((_) async => http.Response('<html>', 502));
      await expectLater(
        serviceWith(client).login(email: 'a@b.co', password: 'x'),
        throwsA(
          isA<AuthException>()
              .having(
                (e) => e.message,
                'message',
                'Unexpected server response.',
              )
              .having((e) => e.statusCode, 'statusCode', 502),
        ),
      );
    });
  });

  group('register', () {
    test('trims names, lowercases email, returns server message', () async {
      final api = FakeApi((_) => jsonResponse(201, {'message': 'Sent!'}));
      final message = await serviceWith(api.client).register(
        firstName: ' Ada ',
        lastName: ' Lovelace ',
        email: ' ADA@Example.com ',
        password: 'password1',
      );

      expect(message, 'Sent!');
      expect(api.last.url.path, endsWith('/auth/register'));
      expect(api.lastBody, {
        'firstName': 'Ada',
        'lastName': 'Lovelace',
        'email': 'ada@example.com',
        'password': 'password1',
      });
    });

    test('falls back to a default message', () async {
      final api = FakeApi((_) => jsonResponse(201, {}));
      expect(
        await serviceWith(api.client).register(
          firstName: 'A',
          lastName: 'B',
          email: 'a@b.co',
          password: 'password1',
        ),
        'Check your email to verify your account.',
      );
    });

    test('409 keeps the status code', () async {
      final api = FakeApi((_) => jsonResponse(409, {'error': 'exists'}));
      await expectLater(
        serviceWith(api.client).register(
          firstName: 'A',
          lastName: 'B',
          email: 'a@b.co',
          password: 'password1',
        ),
        throwsA(
          isA<AuthException>().having((e) => e.statusCode, 'statusCode', 409),
        ),
      );
    });
  });

  group('resend verification and forgot password', () {
    test('resend posts normalised email', () async {
      final api = FakeApi((_) => jsonResponse(200, {'message': 'ok'}));
      expect(
        await serviceWith(api.client).resendVerification(' A@B.co '),
        'ok',
      );
      expect(api.last.url.path, endsWith('/auth/resend-verification'));
      expect(api.lastBody, {'email': 'a@b.co'});
    });

    test('resend default message', () async {
      final api = FakeApi((_) => jsonResponse(200, {}));
      expect(
        await serviceWith(api.client).resendVerification('a@b.co'),
        'If verification is needed, an email has been sent.',
      );
    });

    test('forgot-password posts normalised email', () async {
      final api = FakeApi((_) => jsonResponse(200, {'message': 'sent'}));
      expect(await serviceWith(api.client).forgotPassword(' A@B.co '), 'sent');
      expect(api.last.url.path, endsWith('/auth/forgot-password'));
      expect(api.lastBody, {'email': 'a@b.co'});
    });

    test('forgot-password default message', () async {
      final api = FakeApi((_) => jsonResponse(200, {}));
      expect(
        await serviceWith(api.client).forgotPassword('a@b.co'),
        'If an account exists for this email, a password-reset link has been sent.',
      );
    });

    test('forgot-password error is surfaced', () async {
      final api = FakeApi((_) => jsonResponse(500, {'error': 'Server down'}));
      await expectLater(
        serviceWith(api.client).forgotPassword('a@b.co'),
        throwsA(
          isA<AuthException>().having(
            (e) => e.message,
            'message',
            'Server down',
          ),
        ),
      );
    });
  });

  group('secure storage and logout', () {
    test('restoreSession loads a stored session', () async {
      final store = MemorySessionStore({
        tokenKey: 'tok',
        emailKey: 'saved@example.com',
      });
      final service = serviceWith(
        MockClient((_) async => http.Response('', 500)),
        store,
      );

      expect(await service.restoreSession(), 'saved@example.com');
      expect(service.currentEmail, 'saved@example.com');
    });

    test('restoreSession with nothing stored is signed out', () async {
      final service = serviceWith(
        MockClient((_) async => http.Response('', 500)),
      );
      expect(await service.restoreSession(), isNull);
      expect(service.currentEmail, isNull);
    });

    test('logout clears storage and notifies listeners', () async {
      final store = MemorySessionStore({
        tokenKey: 'tok',
        emailKey: 'saved@example.com',
      });
      final service = serviceWith(
        MockClient((_) async => http.Response('', 500)),
        store,
      );
      await service.restoreSession();
      var notified = 0;
      service.signedInEmailListenable.addListener(() => notified++);

      await service.logout();

      expect(store.values, isEmpty);
      expect(service.currentEmail, isNull);
      expect(notified, 1);
      expect(await service.validToken(), isNull);
    });
  });

  test('logout prevents an old session restoration', () async {
    final store = PausedSessionStore({
      tokenKey: 'old-token',
      emailKey: 'old@example.com',
    });

    final service = serviceWith(
      MockClient((_) async => http.Response('', 500)),
      store,
    );

    final restoreFuture = service.restoreSession();
    await store.readStarted.future;

    await service.logout();

    expect(service.currentEmail, isNull);
    expect(store.values, isEmpty);

    store.resumeRead.complete();
    final restoredEmail = await restoreFuture;

    expect(restoredEmail, isNull);
    expect(service.currentEmail, isNull);
    expect(await service.validToken(), isNull);
  });
}
