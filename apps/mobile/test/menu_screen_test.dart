import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:eisai_mobile/main.dart';
import 'package:eisai_mobile/models/menu_item.dart';
import 'package:eisai_mobile/screens/menu_screen.dart';

void main() {
  testWidgets('shows menu items from the loader', (tester) async {
    await tester.pumpWidget(
      EisaiApp(
        home: MenuScreen(
          loadMenu: () async => [
            const MenuItem(
              id: '1',
              name: 'Sample Matcha',
              description: '',
              price: 6,
            ),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Sample Matcha'), findsOneWidget);
    expect(find.text('\$6.00'), findsOneWidget);
  });

  testWidgets('can retry after the API fails', (tester) async {
    var attempts = 0;
    await tester.pumpWidget(
      EisaiApp(
        home: MenuScreen(
          loadMenu: () async {
            if (attempts++ == 0) throw Exception('offline');
            return [];
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining("Couldn't load"), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, 'Retry'));
    await tester.pumpAndSettle();
    expect(find.text('No items yet.'), findsOneWidget);
  });
}
