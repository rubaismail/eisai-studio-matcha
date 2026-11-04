import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:eisai_mobile/models/menu_item.dart';
import 'package:eisai_mobile/screens/menu_screen.dart';

const goldenHour = MenuItem(
  id: 'golden-hour',
  name: 'Golden Hour',
  description: 'Banana milk and matcha',
  price: 7.50,
  teaBases: ['matcha'],
  isRecommended: true,
);

const hojichaDrink = MenuItem(
  id: 'toasted-hojicha',
  name: 'Toasted Hojicha',
  description: 'Roasted tea and milk',
  price: 6.50,
  teaBases: ['hojicha'],
);

Future<void> showMenu(
  WidgetTester tester,
  Future<List<MenuItem>> Function() loader,
) async {
  // Use the 390-pixel reference width of the approved mobile Figma design.
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });

  await tester.pumpWidget(MaterialApp(home: MenuScreen(fetchMenu: loader)));
}

Future<void> scrollToAndTap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pump();
  await tester.tap(finder);
  await tester.pump();
}

void main() {
  testWidgets('shows Figma skeletons while the menu loads', (tester) async {
    final pending = Completer<List<MenuItem>>();
    await showMenu(tester, () => pending.future);

    expect(find.text('LOADING THE MENU…'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsNothing);

    pending.complete([goldenHour]);
    await tester.pump();

    expect(find.text('LOADING THE MENU…'), findsNothing);
    expect(find.text('GOLDEN HOUR'), findsOneWidget);
  });

  testWidgets('renders API-model drinks and drink images', (tester) async {
    await showMenu(tester, () async => [goldenHour]);
    await tester.pump();

    expect(find.text('GOLDEN HOUR'), findsOneWidget);
    expect(find.byType(Image), findsWidgets);
    expect(find.text('RECOMMENDED'), findsOneWidget);
  });

  testWidgets('shows empty menu state when API returns no items', (
    tester,
  ) async {
    await showMenu(tester, () async => <MenuItem>[]);
    await tester.pump();

    expect(find.text('No items yet.'), findsOneWidget);
  });

  testWidgets('shows Figma retrieval error when loading fails', (tester) async {
    await showMenu(tester, () async => throw Exception('Network unavailable'));
    await tester.pump();

    expect(find.text('Couldn’t load the menu.'), findsOneWidget);
    expect(find.text('TRY AGAIN ↻'), findsOneWidget);
    expect(
      find.text('Your connection may be interrupted. Please try again.'),
      findsOneWidget,
    );
  });

  testWidgets('TRY AGAIN reloads menu after a temporary error', (tester) async {
    var attempts = 0;

    await showMenu(tester, () async {
      attempts++;
      if (attempts == 1) {
        throw Exception('Temporary error');
      }
      return [goldenHour];
    });

    await tester.pump();

    expect(find.text('TRY AGAIN ↻'), findsOneWidget);

    await scrollToAndTap(tester, find.text('TRY AGAIN ↻'));
    await tester.pumpAndSettle();

    expect(attempts, 2);
    expect(find.text('GOLDEN HOUR'), findsOneWidget);
  });

  testWidgets('no matches can be cleared without losing menu data', (
    tester,
  ) async {
    await showMenu(tester, () async => [goldenHour]);
    await tester.pump();

    final search = find.byType(TextField);
    await tester.ensureVisible(search);
    await tester.pump();
    await tester.enterText(search, 'nonexistent drink xyz');
    await tester.pump();

    expect(find.text('No matches found.'), findsOneWidget);
    expect(find.text('NO DRINKS FOUND'), findsOneWidget);
    await scrollToAndTap(tester, find.text('CLEAR FILTERS'));

    expect(find.text('GOLDEN HOUR'), findsOneWidget);
    expect(find.text('No matches found.'), findsNothing);
    expect(find.byType(TextField), findsOneWidget);
  });

  testWidgets('teaBases and isRecommended drive menu filters', (tester) async {
    await showMenu(tester, () async => [goldenHour, hojichaDrink]);
    await tester.pump();

    await scrollToAndTap(tester, find.text('HOJICHA (1)'));
    expect(find.text('TOASTED HOJICHA'), findsOneWidget);
    expect(find.text('GOLDEN HOUR'), findsNothing);

    await scrollToAndTap(tester, find.text('RECOMMENDED (1)'));
    expect(find.text('GOLDEN HOUR'), findsOneWidget);
    expect(find.text('TOASTED HOJICHA'), findsNothing);
  });
}
