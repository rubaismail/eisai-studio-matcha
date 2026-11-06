import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'screens/menu_screen.dart';
import 'screens/our_story_screen.dart';
import 'screens/our_location_screen.dart';

void main() {
  runApp(const EisaiApp());
}

class EisaiApp extends StatelessWidget {
  const EisaiApp({super.key, this.home});

  final Widget? home;

  static const Color periwinkle = Color(0xFF8B91C7);
  static const Color peach = Color(0xFFFFD9BD);
  static const Color darkText = Color(0xFF11121B);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Eisai Studio',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: Colors.white,
        colorScheme: ColorScheme.fromSeed(
          seedColor: periwinkle,
          primary: periwinkle,
          secondary: peach,
          surface: Colors.white,
          onSurface: darkText,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: darkText,
          elevation: 0,
        ),
      ),
      home: home ?? const MainNavigation(),
    );
  }
}

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _selectedIndex = 0;

  void _selectTab(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return IndexedStack(
      index: _selectedIndex,
      children: [
        HomeScreen(
          onViewMenu: () => _selectTab(1),
          onGoStory: () => _selectTab(2),
          onGoLocation: () => _selectTab(3),
        ),
        MenuScreen(
          onGoHome: () => _selectTab(0),
          onGoStory: () => _selectTab(2),
          onGoLocation: () => _selectTab(3),
        ),
        OurStoryScreen(
          onGoHome: () => _selectTab(0),
          onGoDrinks: () => _selectTab(1),
          onGoLocation: () => _selectTab(3),
        ),
        OurLocationScreen(
          onGoHome: () => _selectTab(0),
          onGoDrinks: () => _selectTab(1),
          onGoStory: () => _selectTab(2),
        ),
      ],
    );
  }
}
