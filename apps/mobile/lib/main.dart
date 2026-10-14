import 'package:flutter/material.dart';
import 'screens/menu_screen.dart';

void main() => runApp(const EisaiApp());

class EisaiApp extends StatelessWidget {
  const EisaiApp({super.key, this.home});

  // Tests can pass a different first screen.
  final Widget? home;

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Eisai Studio',
    // Replace with the client's brand colors from Figma.
    theme: ThemeData(colorSchemeSeed: const Color(0xff345b40)),
    home: home ?? const MenuScreen(),
  );
}
