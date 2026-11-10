import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:eisai_mobile/screens/admin/staff_menu_editor_screen.dart';
import 'package:eisai_mobile/services/staff_menu_repository.dart';
import 'package:eisai_mobile/widgets/eisai_staff_ui.dart';

void main() {
  test('admin toggle sends only isAvailable', () async {
    final client = MockClient((request) async {
      expect(request.method, 'PUT');
      expect(request.url.path, '/api/menu/drink123');
      expect(request.headers['authorization'], 'Bearer test-admin-token');

      final body = jsonDecode(request.body) as Map<String, dynamic>;

      expect(body, {'isAvailable': false});

      return http.Response(
        jsonEncode({
          'item': {
            '_id': 'drink123',
            'name': 'Golden Hour',
            'description': 'Banana milk matcha',
            'price': 6.50,
            'category': 'Drinks',
            'teaBases': ['matcha'],
            'isAvailable': false,
            'isRecommended': true,
            'isFeatured': true,
            'isSeasonal': false,
            'inspiredBy': 'Banana bread',
            'imageAlt': '',
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    });

    final repository = HttpStaffMenuRepository(
      baseUrl: 'https://example.com/api',
      getToken: () async => 'test-admin-token',
      client: client,
    );

    final updated = await repository.updateDrinkFields('drink123', {
      'isAvailable': false,
    });

    expect(updated.onMenu, false);
    expect(updated.recommended, true);
    expect(updated.onHome, true);
  });

  test('admin toggle preserves HTTP 500 error', () async {
    final client = MockClient((request) async {
      expect(request.method, 'PUT');
      expect(jsonDecode(request.body), {'isAvailable': false});

      return http.Response(
        jsonEncode({'error': 'Database temporarily unavailable'}),
        500,
        headers: {'content-type': 'application/json'},
      );
    });

    final repository = HttpStaffMenuRepository(
      baseUrl: 'https://example.com/api',
      getToken: () async => 'test-admin-token',
      client: client,
    );

    await expectLater(
      repository.updateDrinkFields('drink123', {'isAvailable': false}),
      throwsA(
        isA<StaffMenuException>()
            .having((error) => error.statusCode, 'statusCode', 500)
            .having(
              (error) => error.message,
              'message',
              'Database temporarily unavailable',
            ),
      ),
    );
  });

  testWidgets('failed checkbox update rolls back and shows error', (
    tester,
  ) async {
    final repository = _FailingToggleRepository();

    await tester.pumpWidget(
      MaterialApp(
        home: StaffMenuEditorScreen(
          repository: repository,
          onLogout: () {},
          onStaffMenu: () {},
        ),
      ),
    );

    await tester.pumpAndSettle();
    final firstCheck = find.byType(StaffCheck).first;

    expect(tester.widget<StaffCheck>(firstCheck).value, isTrue);
    await tester.tap(firstCheck);
    await tester.pump();
    expect(tester.widget<StaffCheck>(firstCheck).value, isFalse);
    repository.failPendingUpdate();
    await tester.pumpAndSettle();
    expect(tester.widget<StaffCheck>(firstCheck).value, isTrue);
    expect(find.textContaining('Changes couldn’t be saved'), findsOneWidget);
  });
}

class _FailingToggleRepository extends PreviewStaffMenuRepository {
  final Completer<void> _pendingUpdate = Completer<void>();

  @override
  Future<StaffDrink> updateDrinkFields(
    String drinkId,
    Map<String, dynamic> changes,
  ) async {
    await _pendingUpdate.future;

    throw const StaffMenuException(
      'Database temporarily unavailable',
      statusCode: 500,
    );
  }

  void failPendingUpdate() {
    if (!_pendingUpdate.isCompleted) {
      _pendingUpdate.complete();
    }
  }
}
