import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:eisai_mobile/screens/our_story_screen.dart';
import 'package:eisai_mobile/screens/our_location_screen.dart';
import 'package:eisai_mobile/widgets/eisai_instagram_link.dart';

void main() {
  testWidgets('Story renders Figma narrative and social link', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: OurStoryScreen()));
    expect(find.text('Our story'), findsOneWidget);
    expect(find.text('You became part of the story.'), findsOneWidget);
    expect(find.byType(EisaiInstagramLink), findsOneWidget);
  });

  testWidgets('Location renders three pop-up direction buttons', (
    tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: OurLocationScreen()));
    expect(find.text('Find us this week.'), findsOneWidget);
    expect(find.text('UCF STUDENT UNION'), findsWidgets);
    expect(find.text('SANFORD FARMERS MARKET'), findsWidgets);
    expect(find.text('MOUNT DORA'), findsWidgets);
    expect(find.text('GET DIRECTIONS  →'), findsNWidgets(3));
  });

  testWidgets('Story hamburger navigation calls Location destination', (
    tester,
  ) async {
    var called = false;
    await tester.pumpWidget(
      MaterialApp(
        home: OurStoryScreen(
          onGoLocation: () {
            called = true;
          },
        ),
      ),
    );
    await tester.tap(find.byTooltip('Open navigation'));
    await tester.pumpAndSettle();

    expect(find.byTooltip('Close navigation'), findsOneWidget);
    expect(called, isFalse);
  });
}
