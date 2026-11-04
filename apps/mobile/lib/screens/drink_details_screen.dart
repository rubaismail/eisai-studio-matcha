import 'package:flutter/material.dart';

import '../widgets/eisai_navigation_overlay.dart';


class DrinkDetailsScreen extends StatefulWidget {
  const DrinkDetailsScreen({
    super.key,
    required this.name,
    required this.description,
    this.asset = '',
    this.imageUrl = '',
    this.onGoHome,
    this.onGoStory,
    this.onGoLocation,
    this.onGoAccount,
  });

  final String name;
  final String description;
  final String asset;
  final String imageUrl;
  final VoidCallback? onGoHome;
  final VoidCallback? onGoStory;
  final VoidCallback? onGoLocation;
  final VoidCallback? onGoAccount;

  @override
  State<DrinkDetailsScreen> createState() => _DrinkDetailsScreenState();
}

class _DrinkDetailsScreenState extends State<DrinkDetailsScreen> {
  static const _ink = Color(0xFF202020);
  static const _muted = Color(0xFF757575);
  static const _lavender = Color(0xFFEEF0FF);
  bool _menuOpen = false;

  // Exact approved Figma copy for the six separate detail frames.
  static const _figmaText = <String, (String, String)>{
    'golden hour': (
      'Banana bread matcha',
      'Matcha or hojicha with Eisai’s banana milk and Banana sea salt Foam.',
    ),
    'mango dango': (
      'Mango sticky rice matcha',
      'Matcha with mango purée, whole milk, and coconut sauce.',
    ),
    'tokyo rose': (
      'Rose syrup matcha',
      'Matcha or hojicha with whole milk and housemade rose syrup.',
    ),
    'toasted coconut': (
      'Toasted coconut matcha',
      'Matcha or hojicha with Eisai’s toasted coconut milk and toasted coconut foam.',
    ),
    'kyoto fog': (
      'Earl Grey matcha',
      'Matcha with whole milk, housemade Earl Grey syrup, and Earl Grey foam.',
    ),
    'okinawa breeze': (
      'Coconut water matcha',
      'Matcha with coconut water and agave syrup.',
    ),
  };

  TextStyle _q(double size, {Color color = _ink}) => TextStyle(
        fontFamily: 'Questrial',
        fontSize: size,
        color: color,
      );

  TextStyle _a(double size, {Color color = _ink}) => TextStyle(
        fontFamily: 'Anonymous Pro',
        fontSize: size,
        color: color,
      );

  Widget _header(double s) => SizedBox(
        height: 122 * s,
        child: Stack(
          children: [
            Positioned(
              left: 22 * s,
              top: 73 * s,
              child: Image.asset(
                'assets/images/eisai_logo.png',
                width: 112 * s,
                height: 29 * s,
                fit: BoxFit.contain,
              ),
            ),
            Positioned(
              right: 16 * s,
              top: 67 * s,
              child: IconButton(
                tooltip: _menuOpen ? 'Close navigation' : 'Open navigation',
                onPressed: () => setState(() => _menuOpen = !_menuOpen),
                icon: Icon(
                  _menuOpen ? Icons.close : Icons.menu,
                  size: 24 * s,
                  color: _ink,
                ),
              ),
            ),
            const Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Divider(
                height: 1,
                thickness: 1,
                color: Color(0xFFEEEEEE),
              ),
            ),
          ],
        ),
      );

  Widget _drinkImage() {
    final local = widget.asset.isNotEmpty
        ? Image.asset(
            'assets/images/${widget.asset}',
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => _missingImage(),
          )
        : _missingImage();

    if (widget.imageUrl.isNotEmpty) {
      return Image.network(
        widget.imageUrl,
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => local,
      );
    }
    return local;
  }

  Widget _missingImage() => const Center(
        child: Icon(
          Icons.local_cafe_outlined,
          size: 72,
          color: Color(0xFF9792CC),
        ),
      );

  void _goBackToDrinks() {
    Navigator.of(context).pop();
  }

  void _leaveFor(VoidCallback? callback) {
    setState(() => _menuOpen = false);
    Navigator.of(context).pop();
    callback?.call();
  }

  @override
  Widget build(BuildContext context) {
    final key = widget.name.trim().toLowerCase();
    final figma = _figmaText[key];
    final subtitle = figma?.$1 ?? '';
    final description = figma?.$2 ?? widget.description;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final s = (constraints.maxWidth / 390)
                .clamp(.75, 1.45)
                .toDouble();

            return Stack(
              children: [
                SingleChildScrollView(
                  child: Center(
                    child: SizedBox(
                      width: 390 * s,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _header(s),
                          Padding(
                            padding: EdgeInsets.symmetric(
                              horizontal: 24 * s,
                            ),
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                SizedBox(height: 48 * s),
                                Text(
                                  'OUR DRINKS',
                                  style: _a(12 * s, color: _muted),
                                ),
                                SizedBox(height: 24 * s),
                                Text(
                                  '${widget.name}.',
                                  style: _q(39 * s),
                                ),
                                SizedBox(height: 20 * s),
                                Text(
                                  subtitle,
                                  style: _q(16 * s, color: _muted),
                                ),
                                SizedBox(height: 57 * s),
                                SizedBox(
                                  width: double.infinity,
                                  height: 371 * s,
                                  child: Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      Positioned.fill(
                                        child: Container(
                                          color: _lavender,
                                        ),
                                      ),
                                      // Figma image fills much of its
                                      // photo tile, with no clipped edges.
                                      SizedBox(
                                        width: 302 * s,
                                        height: 354 * s,
                                        child: _drinkImage(),
                                      ),
                                    ],
                                  ),
                                ),
                                SizedBox(height: 40 * s),
                                Text(
                                  widget.name.toUpperCase(),
                                  style: _a(12 * s, color: _muted),
                                ),
                                SizedBox(height: 22 * s),
                                Text(
                                  description,
                                  style: _q(16 * s),
                                ),
                                SizedBox(height: 86 * s),
                                SizedBox(
                                  width: double.infinity,
                                  height: 49 * s,
                                  child: FilledButton(
                                    onPressed: _goBackToDrinks,
                                    style: FilledButton.styleFrom(
                                      backgroundColor: _ink,
                                      foregroundColor: Colors.white,
                                      shape:
                                          const RoundedRectangleBorder(),
                                      padding: EdgeInsets.zero,
                                    ),
                                    child: Text(
                                      '← BACK TO OUR DRINKS',
                                      style: _a(
                                        13 * s,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ),
                                SizedBox(height: 110 * s),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (_menuOpen)
                  Positioned.fill(
                    top: 122 * s,
                    child: EisaiNavigationOverlay(
                      onClose: () => setState(
                        () => _menuOpen = false,
                      ),
                      onHome: () => _leaveFor(widget.onGoHome),
                      onDrinks: _goBackToDrinks,
                      onStory: () => _leaveFor(widget.onGoStory),
                      onLocation: () =>
                          _leaveFor(widget.onGoLocation),
                      onAccount: widget.onGoAccount == null
                          ? null
                          : () => _leaveFor(widget.onGoAccount),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
