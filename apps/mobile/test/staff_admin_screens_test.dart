import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:eisai_mobile/services/staff_menu_repository.dart';
import 'package:eisai_mobile/screens/admin/staff_menu_editor_screen.dart';
import 'package:eisai_mobile/screens/admin/staff_status_screens.dart';

void main() {
  testWidgets('Staff menu editor shows Figma labels and full list', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: StaffMenuEditorScreen(
          repository: PreviewStaffMenuRepository(),
          onLogout: () {},
          onStaffMenu: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('STAFF · MENU EDITOR'), findsOneWidget);
    expect(find.text('Menu'), findsOneWidget);
    expect(find.text('Golden Hour'), findsWidgets);
    await tester.scrollUntilVisible(find.text('Mango Dango'), 150, scrollable: find.byType(Scrollable).first);
    expect(find.text('Mango Dango'), findsOneWidget);
    expect(find.text('VIEW LIVE MENU  →'), findsOneWidget);
    expect(find.text('LOG OUT'), findsOneWidget);
  });

  testWidgets('Access denied has a 403 path', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: StaffAccessDeniedScreen(onLogout: () {}, onStaffMenu: () {}),
      ),
    );

    expect(find.text('Access denied'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('SIGN IN WITH ANOTHER ACCOUNT'),
      150,
      scrollable: find.byType(Scrollable).first,
    );

    expect(find.text('SIGN IN WITH ANOTHER ACCOUNT'), findsOneWidget);
  });
}
