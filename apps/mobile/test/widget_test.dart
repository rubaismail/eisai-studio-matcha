import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:eisai_mobile/main.dart';
import 'package:eisai_mobile/menu_api.dart';

void main() {
  testWidgets('displays data from the API loader', (tester) async {
    await tester.pumpWidget(
      EisaiApp(
        loadMenu: () async => [
          const MenuItem(
            name: 'Sample Matcha',
            description: 'Fixture',
            priceCents: 600,
          ),
        ],
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Sample Matcha'), findsOneWidget);
    expect(find.text('\$6.00'), findsOneWidget);
  });
  testWidgets('supports retry after a failed API request', (tester) async {
    var attempts = 0;
    await tester.pumpWidget(
      EisaiApp(
        loadMenu: () async {
          if (attempts++ == 0) throw Exception('offline');
          return [];
        },
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('Cannot reach the API'), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, 'Retry'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Connected.'), findsOneWidget);
  });
}
