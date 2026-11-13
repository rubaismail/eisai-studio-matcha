import 'package:eisai_mobile/main.dart';
import 'package:eisai_mobile/screens/drink_details_screen.dart';
import 'package:eisai_mobile/screens/eisai_auth_ui.dart';
import 'package:eisai_mobile/widgets/eisai_staff_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class _RouteRecorder extends NavigatorObserver {
  Route<dynamic>? latestRoute;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    latestRoute = route;
  }
}

void _usePhoneViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  testWidgets('Authentication menu sends OUR PRODUCTS to tab 4', (
    tester,
  ) async {
    _usePhoneViewport(tester);
    final recorder = _RouteRecorder();

    await tester.pumpWidget(
      MaterialApp(
        navigatorObservers: [recorder],
        home: const EisaiAuthShell(children: [Text('Authentication screen')]),
      ),
    );

    await tester.tap(find.byTooltip('Navigation menu'));
    await tester.pumpAndSettle();

    final products = find.text('OUR PRODUCTS');
    expect(products, findsOneWidget);
    await tester.ensureVisible(products);
    await tester.tap(products);

    // Verify the actual navigation target without building unrelated
    // home-screen video players or making network requests in the test.
    final route = recorder.latestRoute;
    expect(route, isA<MaterialPageRoute<void>>());
    final target = (route! as MaterialPageRoute<void>).builder(
      tester.element(find.byType(EisaiAuthShell)),
    );
    expect(target, isA<MainNavigation>());
    expect((target as MainNavigation).initialIndex, 4);
  });

  testWidgets('Drink details menu opens OUR PRODUCTS destination', (
    tester,
  ) async {
    _usePhoneViewport(tester);
    final navigatorKey = GlobalKey<NavigatorState>();
    var productsCallbackCalled = false;

    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: navigatorKey,
        home: const Scaffold(body: Text('DRINKS ROOT')),
      ),
    );

    navigatorKey.currentState!.push(
      MaterialPageRoute<void>(
        builder: (_) => DrinkDetailsScreen(
          name: 'Mango Dango',
          description: 'Mango matcha drink',
          onGoProducts: () {
            productsCallbackCalled = true;
            navigatorKey.currentState!.push(
              MaterialPageRoute<void>(
                builder: (_) => const Scaffold(
                  body: Center(child: Text('PRODUCTS DESTINATION')),
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

    final products = find.text('OUR PRODUCTS');
    expect(products, findsOneWidget);
    await tester.ensureVisible(products);
    await tester.tap(products);
    await tester.pumpAndSettle();

    expect(productsCallbackCalled, isTrue);
    expect(find.text('PRODUCTS DESTINATION'), findsOneWidget);
  });

  testWidgets('Staff home logo is actionable through accessibility', (
    tester,
  ) async {
    _usePhoneViewport(tester);
    var homeCalls = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: StaffChrome(
          body: const SizedBox.shrink(),
          onLogout: () {},
          onMenu: () {},
          onHome: () => homeCalls++,
          publicMenuUrl: null,
          showFooter: false,
        ),
      ),
    );

    final logo = find.semantics.byLabel('Go to home');
    expect(logo, findsOneWidget);

    // This fails if the Semantics widget has a label but no tap action.
    tester.semantics.tap(logo);
    await tester.pump();
    expect(homeCalls, 1);
  });
}
