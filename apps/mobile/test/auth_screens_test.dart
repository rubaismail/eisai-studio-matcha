import 'package:eisai_mobile/screens/account_screen.dart';
import 'package:eisai_mobile/screens/check_email_screen.dart';
import 'package:eisai_mobile/screens/login_screen.dart';
import 'package:eisai_mobile/screens/register_screen.dart';
import 'package:eisai_mobile/services/auth_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'auth_test_helpers.dart';
import 'package:eisai_mobile/screens/forgot_password_screen.dart';

void useTallViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(390, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void install(FakeApi api, [MemorySessionStore? store]) {
  AuthService.instance = AuthService(
    client: api.client,
    store: store ?? MemorySessionStore(),
  );
}

Future<void> tapText(WidgetTester tester, String text) async {
  final finder = find.text(text);
  await tester.ensureVisible(finder);
  await tester.pump();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> fillLogin(WidgetTester tester, String email, String password) async {
  await tester.enterText(find.byType(TextField).at(0), email);
  await tester.enterText(find.byType(TextField).at(1), password);
}

void main() {
  group('LoginScreen', () {
    testWidgets('successful login stores the session and calls back', (
      tester,
    ) async {
      useTallViewport(tester);
      final store = MemorySessionStore();
      install(FakeApi((_) => jsonResponse(200, loginBody())), store);
      var succeeded = false;

      await tester.pumpWidget(
        MaterialApp(
          home: LoginScreen(onLoginSuccess: () => succeeded = true),
        ),
      );
      await fillLogin(tester, 'user@example.com', 'secret');
      await tapText(tester, 'Log in →');

      expect(succeeded, isTrue);
      expect(store.values[tokenKey], 'token-abc');
    });

    testWidgets('invalid email is rejected before any request', (tester) async {
      useTallViewport(tester);
      final api = FakeApi((_) => jsonResponse(200, loginBody()));
      install(api);

      await tester.pumpWidget(const MaterialApp(home: LoginScreen()));
      await fillLogin(tester, 'not-an-email', 'secret');
      await tapText(tester, 'Log in →');

      expect(find.text('Please enter a valid email address.'), findsOneWidget);
      expect(api.requests, isEmpty);
    });

    testWidgets('401 shows invalid credentials message', (tester) async {
      useTallViewport(tester);
      install(FakeApi((_) => jsonResponse(401, {'error': 'nope'})));

      await tester.pumpWidget(const MaterialApp(home: LoginScreen()));
      await fillLogin(tester, 'user@example.com', 'wrong');
      await tapText(tester, 'Log in →');

      expect(
        find.text('Invalid email or password. Please try again.'),
        findsOneWidget,
      );
    });

    testWidgets('403 offers a new verification link', (tester) async {
      useTallViewport(tester);
      install(FakeApi((_) => jsonResponse(403, {'error': 'unverified'})));

      await tester.pumpWidget(const MaterialApp(home: LoginScreen()));
      await fillLogin(tester, 'user@example.com', 'secret');
      await tapText(tester, 'Log in →');

      expect(
        find.text('Check your inbox for the verification link.'),
        findsOneWidget,
      );
      expect(
        find.text('No email? Request a new verification link.'),
        findsOneWidget,
      );
    });

    testWidgets('network failure shows the service message', (tester) async {
      useTallViewport(tester);
      install(FakeApi((_) => throw StateError('boom')));

      await tester.pumpWidget(const MaterialApp(home: LoginScreen()));
      await fillLogin(tester, 'user@example.com', 'secret');
      await tapText(tester, 'Log in →');

      expect(
        find.text('An unexpected error occurred. Please try again.'),
        findsOneWidget,
      );
    });
  });

  group('RegisterScreen', () {
    Future<void> fillRegister(
      WidgetTester tester, {
      String password = 'password1',
      String confirm = 'password1',
    }) async {
      final fields = find.byType(TextField);
      await tester.enterText(fields.at(0), 'Ada');
      await tester.enterText(fields.at(1), 'Lovelace');
      await tester.enterText(fields.at(2), 'ada@example.com');
      await tester.enterText(fields.at(3), password);
      await tester.enterText(fields.at(4), confirm);
    }

    testWidgets('successful registration opens the check-email screen', (
      tester,
    ) async {
      useTallViewport(tester);
      final api = FakeApi((_) => jsonResponse(201, {'message': 'ok'}));
      install(api);

      await tester.pumpWidget(const MaterialApp(home: RegisterScreen()));
      await fillRegister(tester);
      await tapText(tester, 'Create account →');

      expect(api.last.url.path, endsWith('/auth/register'));
      expect(find.byType(CheckEmailScreen), findsOneWidget);
    });

    testWidgets('mismatched passwords are rejected locally', (tester) async {
      useTallViewport(tester);
      final api = FakeApi((_) => jsonResponse(201, {}));
      install(api);

      await tester.pumpWidget(const MaterialApp(home: RegisterScreen()));
      await fillRegister(tester, confirm: 'different1');
      await tapText(tester, 'Create account →');

      expect(find.text('Passwords do not match.'), findsOneWidget);
      expect(api.requests, isEmpty);
    });

    testWidgets('409 shows already-registered message', (tester) async {
      useTallViewport(tester);
      install(FakeApi((_) => jsonResponse(409, {'error': 'exists'})));

      await tester.pumpWidget(const MaterialApp(home: RegisterScreen()));
      await fillRegister(tester);
      await tapText(tester, 'Create account →');

      expect(find.text('Email address already registered.'), findsOneWidget);
      expect(find.byType(CheckEmailScreen), findsNothing);
    });
  });

  group('AccountScreen', () {
    testWidgets('shows the stored email when signed in', (tester) async {
      useTallViewport(tester);
      install(
        FakeApi((_) => jsonResponse(200, {})),
        MemorySessionStore({tokenKey: 't', emailKey: 'me@example.com'}),
      );

      await tester.pumpWidget(const MaterialApp(home: AccountScreen()));
      await tester.pumpAndSettle();

      expect(find.text('My account.'), findsOneWidget);
      expect(find.text('me@example.com'), findsOneWidget);
    });

    testWidgets('signing in from the embedded login shows the account', (
      tester,
    ) async {
      useTallViewport(tester);
      install(FakeApi((_) => jsonResponse(200, loginBody(email: 'new@example.com'))));

      await tester.pumpWidget(const MaterialApp(home: AccountScreen()));
      await tester.pumpAndSettle();
      await fillLogin(tester, 'new@example.com', 'secret');
      await tapText(tester, 'Log in →');

      expect(find.text('My account.'), findsOneWidget);
      expect(find.text('new@example.com'), findsOneWidget);
    });

    testWidgets('logout clears the session and shows login', (tester) async {
      useTallViewport(tester);
      final store = MemorySessionStore({tokenKey: 't', emailKey: 'me@example.com'});
      install(FakeApi((_) => jsonResponse(200, {})), store);

      await tester.pumpWidget(const MaterialApp(home: AccountScreen()));
      await tester.pumpAndSettle();
      await tapText(tester, 'LOG OUT');

      expect(store.values, isEmpty);
      expect(find.text('Welcome back!'), findsOneWidget);
      expect(find.text('me@example.com'), findsNothing);
    });

    testWidgets(
      'stacked account screens do not reveal the old email after logout + back',
      (tester) async {
        useTallViewport(tester);
        install(
          FakeApi((_) => jsonResponse(200, {})),
          MemorySessionStore({tokenKey: 't', emailKey: 'old@example.com'}),
        );
        final nav = GlobalKey<NavigatorState>();

        await tester.pumpWidget(
          MaterialApp(
            navigatorKey: nav,
            home: const Scaffold(body: Text('HOME')),
          ),
        );
        for (var i = 0; i < 2; i++) {
          nav.currentState!.push(
            MaterialPageRoute<void>(builder: (_) => const AccountScreen()),
          );
          await tester.pumpAndSettle();
        }
        expect(find.text('old@example.com'), findsOneWidget);

        await tapText(tester, 'LOG OUT');
        expect(find.text('Welcome back!'), findsOneWidget);

        nav.currentState!.pop();
        await tester.pumpAndSettle();
        expect(find.text('old@example.com'), findsNothing);
        expect(find.text('My account.'), findsNothing);
        expect(find.text('Welcome back!'), findsOneWidget);

        nav.currentState!.pop();
        await tester.pumpAndSettle();
        expect(find.text('HOME'), findsOneWidget);
        expect(find.text('old@example.com'), findsNothing);
      },
    );
  });

  group('CheckEmailScreen', () {
  testWidgets('resend button sends email and shows success', (
    tester,
  ) async {
    useTallViewport(tester);

    final api = FakeApi(
      (_) => jsonResponse(200, {
        'message': 'Verification email sent!',
      }),
    );

    install(api);

    await tester.pumpWidget(
      const MaterialApp(
        home: CheckEmailScreen(
          email: 'user@example.com',
        ),
      ),
    );

    await tapText(tester, 'RESEND EMAIL');

    expect(
      api.last.url.path,
      endsWith('/auth/resend-verification'),
    );

    expect(
      api.lastBody['email'],
      'user@example.com',
    );

    expect(
      find.text('Verification email sent!'),
      findsOneWidget,
    );
  });

  testWidgets('resend button shows API error', (
    tester,
  ) async {
    useTallViewport(tester);

    final api = FakeApi(
      (_) => jsonResponse(429, {
        'error': 'Too many requests',
      }),
    );

    install(api);

    await tester.pumpWidget(
      const MaterialApp(
        home: CheckEmailScreen(
          email: 'user@example.com',
        ),
      ),
    );

    await tapText(tester, 'RESEND EMAIL');

    expect(
      find.text(
        'Too many requests. Please wait before trying again.',
      ),
      findsOneWidget,
    );
  });
});

group('ForgotPasswordScreen', () {
  testWidgets('reset button sends email and shows confirmation', (
    tester,
  ) async {
    useTallViewport(tester);

    final api = FakeApi(
      (_) => jsonResponse(200, {
        'message': 'Reset email sent',
      }),
    );

    install(api);

    await tester.pumpWidget(
      const MaterialApp(
        home: ForgotPasswordScreen(),
      ),
    );

    await tester.enterText(
      find.byType(TextField).first,
      'user@example.com',
    );

    await tapText(tester, 'SEND RESET LINK →');

    expect(
      api.last.url.path,
      endsWith('/auth/forgot-password'),
    );

    expect(
      api.lastBody['email'],
      'user@example.com',
    );

    expect(
      find.text('Check your inbox.'),
      findsOneWidget,
    );

    expect(
      find.text(
        'If an account exists, we’ll email a reset link.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('invalid email prevents API request', (
    tester,
  ) async {
    useTallViewport(tester);

    final api = FakeApi(
      (_) => jsonResponse(200, {}),
    );

    install(api);

    await tester.pumpWidget(
      const MaterialApp(
        home: ForgotPasswordScreen(),
      ),
    );

    await tester.enterText(
      find.byType(TextField).first,
      'invalid-email',
    );

    await tapText(tester, 'SEND RESET LINK →');

    expect(
      find.text('Please enter a valid email address.'),
      findsOneWidget,
    );

    expect(api.requests, isEmpty);
  });

  testWidgets('server error appears on reset screen', (
    tester,
  ) async {
    useTallViewport(tester);

    final api = FakeApi(
      (_) => jsonResponse(500, {
        'error': 'Server unavailable',
      }),
    );

    install(api);

    await tester.pumpWidget(
      const MaterialApp(
        home: ForgotPasswordScreen(),
      ),
    );

    await tester.enterText(
      find.byType(TextField).first,
      'user@example.com',
    );

    await tapText(tester, 'SEND RESET LINK →');

    expect(
      find.text('Server unavailable'),
      findsOneWidget,
    );
  });
});

}
