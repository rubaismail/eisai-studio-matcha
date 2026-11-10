import 'package:eisai_mobile/screens/account_screen.dart';
import 'package:eisai_mobile/screens/admin/staff_menu_editor_screen.dart';
import 'package:eisai_mobile/screens/login_screen.dart';
import 'package:eisai_mobile/services/auth_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'auth_test_helpers.dart';

void main() {
  Future<void> showAccount(WidgetTester tester) async {
    tester.view.physicalSize = const Size(390, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(const MaterialApp(home: AccountScreen()));
    await tester.pumpAndSettle();
  }

  Future<void> submitLogin(WidgetTester tester) async {
    await tester.enterText(find.byType(TextField).at(0), 'staff@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    final button = find.text('Log in →');
    await tester.ensureVisible(button);
    await tester.tap(button);
    await tester.pumpAndSettle();
  }

  setUp(() {
    AuthService.instance = AuthService(
      client: FakeApi((_) => jsonResponse(404, {})).client,
      store: MemorySessionStore(),
    );
  });

  tearDown(() {
    AuthService.instance = AuthService(
      client: FakeApi((_) => jsonResponse(404, {})).client,
      store: MemorySessionStore(),
    );
  });

  testWidgets('admin login opens staff menu without requiring Manage Menu tap', (
    tester,
  ) async {
    final store = MemorySessionStore();
    final api = FakeApi((request) {
      expect(request.url.path, endsWith('/auth/login'));
      return jsonResponse(200, {
        'token': 'admin-test-token',
        'user': {
          '_id': 'admin-1',
          'email': 'staff@example.com',
          'role': 'admin',
        },
      });
    });
    AuthService.instance = AuthService(client: api.client, store: store);

    await showAccount(tester);
    expect(find.byType(LoginScreen), findsOneWidget);

    await submitLogin(tester);

    expect(AuthService.instance.isAdmin, isTrue);
    expect(find.byType(StaffMenuEditorScreen), findsOneWidget);
    expect(find.text('STAFF · MENU EDITOR'), findsOneWidget);
    expect(store.values['eisai_auth_token'], 'admin-test-token');
    expect(api.requests, hasLength(1));
  });

  testWidgets('customer login stays on account and cannot see staff editor', (
    tester,
  ) async {
    final api = FakeApi((_) => jsonResponse(200, {
      'token': 'customer-test-token',
      'user': {
        '_id': 'customer-1',
        'email': 'staff@example.com',
        'role': 'customer',
      },
    }));
    AuthService.instance = AuthService(
      client: api.client,
      store: MemorySessionStore(),
    );

    await showAccount(tester);
    await submitLogin(tester);

    expect(AuthService.instance.isAdmin, isFalse);
    expect(find.text('My account.'), findsOneWidget);
    expect(find.byType(StaffMenuEditorScreen), findsNothing);
    expect(find.text('MANAGE MENU →'), findsNothing);
  });

  testWidgets('admin logout clears credentials and returns to login', (
    tester,
  ) async {
    final store = MemorySessionStore();
    AuthService.instance = AuthService(
      client: FakeApi((_) => jsonResponse(200, {
        'token': 'admin-test-token',
        'user': {
          '_id': 'admin-1',
          'email': 'staff@example.com',
          'role': 'admin',
        },
      })).client,
      store: store,
    );

    await showAccount(tester);
    await submitLogin(tester);
    expect(find.byType(StaffMenuEditorScreen), findsOneWidget);

    final logout = find.text('LOG OUT');
    await tester.tap(logout);
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.byType(StaffMenuEditorScreen), findsNothing);
    expect(AuthService.instance.currentEmail, isNull);
    expect(AuthService.instance.currentRole, isNull);
    expect(store.values.containsKey('eisai_auth_token'), isFalse);
    expect(store.values.containsKey('eisai_auth_email'), isFalse);
    expect(store.values.containsKey('eisai_auth_role'), isFalse);
  });
}
