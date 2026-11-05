import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:eisai_mobile/models/menu_item.dart';
import 'package:eisai_mobile/screens/drink_details_screen.dart';
import 'package:eisai_mobile/screens/home_screen.dart';

const updatedDrink = MenuItem(
  id: 'golden-hour',
  name: 'Golden Hour',
  description: 'Updated backend recipe with oat milk',
  price: 8.00,
  isFeatured: true,
);

Future<void> useMobileViewport(WidgetTester tester) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
}

void main() {
  testWidgets('drink details show the API description for a known drink',
      (tester) async {
    await useMobileViewport(tester);
    await tester.pumpWidget(const MaterialApp(
      home: DrinkDetailsScreen(
        name: 'Golden Hour',
        description: 'Updated backend recipe with oat milk',
      ),
    ));

    expect(find.text('Updated backend recipe with oat milk'), findsOneWidget);
    expect(
      find.text('Matcha or hojicha with Eisai’s banana milk and Banana sea salt Foam.'),
      findsNothing,
    );
  });

  testWidgets('Home can retry a failed shared-menu load', (tester) async {
    await useMobileViewport(tester);
    var attempts = 0;
    await tester.pumpWidget(MaterialApp(
      home: HomeScreen(
        onViewMenu: () {},
        fetchMenu: () async {
          attempts++;
          if (attempts == 1) throw Exception('Temporary failure');
          return [updatedDrink];
        },
      ),
    ));
    await tester.pump();

    expect(find.text('Featured drinks could not be loaded.'), findsOneWidget);
    final retry = find.text('TRY AGAIN');
    await tester.ensureVisible(retry);
    await tester.tap(retry);
    await tester.pumpAndSettle();

    expect(attempts, 2);
    expect(find.text('Golden Hour'), findsOneWidget);
    expect(find.text('Updated backend recipe with oat milk'), findsOneWidget);
  });
}
