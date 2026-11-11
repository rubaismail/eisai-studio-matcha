import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:eisai_mobile/screens/admin/staff_drink_form_screen.dart';
import 'package:eisai_mobile/services/staff_menu_repository.dart';

void main() {
  testWidgets('Editing a drink prompts before discarding changes', (
    tester,
  ) async {
    final repository = PreviewStaffMenuRepository();
    final drinks = await repository.listDrinks();

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => StaffDrinkFormScreen(
                    repository: repository,
                    drink: drinks.first,
                    onLogout: () {},
                    onStaffMenu: () {},
                  ),
                ),
              ),
              child: const Text('Open editor'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open editor'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, 'Updated drink name');
    await tester.pump();

    await tester.tap(find.text('← BACK TO THE LIST'));
    await tester.pumpAndSettle();

    expect(find.text('Discard changes?'), findsOneWidget);

    await tester.tap(find.text('Keep editing'));
    await tester.pumpAndSettle();

    expect(find.text('Updated drink name'), findsOneWidget);

    await tester.tap(find.text('← BACK TO THE LIST'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Discard changes'));
    await tester.pumpAndSettle();

    expect(find.text('Open editor'), findsOneWidget);
  });
}
