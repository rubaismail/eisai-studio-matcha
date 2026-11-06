import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:eisai_mobile/screens/home_screen.dart';
import 'package:eisai_mobile/models/menu_item.dart';

void main() {
  testWidgets('Hamburger Our Location navigates to location destination', (
    tester,
  ) async {
    final navigatorKey = GlobalKey<NavigatorState>();
    var locationCallbackCalled = false;

    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: navigatorKey,
        home: HomeScreen(
          onViewMenu: () {},
          fetchMenu: () async => <MenuItem>[],
          onGoLocation: () {
            locationCallbackCalled = true;

            navigatorKey.currentState!.push(
              MaterialPageRoute<void>(
                builder: (_) => const Scaffold(
                  body: Center(child: Text('LOCATION DESTINATION')),
                ),
              ),
            );
          },
        ),
      ),
    );

    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Open navigation'));
    await tester.pumpAndSettle();

    final locationItem = find.text('OUR LOCATION');

    expect(locationItem, findsOneWidget);

    await tester.ensureVisible(locationItem);
    await tester.tap(locationItem);
    await tester.pumpAndSettle();

    expect(locationCallbackCalled, isTrue);

    expect(find.text('LOCATION DESTINATION'), findsOneWidget);
  });
}
