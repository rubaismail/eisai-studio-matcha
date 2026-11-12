import 'package:flutter/material.dart';
import 'eisai_navigation_overlay.dart';
import 'eisai_home_logo.dart';

class EisaiInfoScaffold extends StatefulWidget {
  const EisaiInfoScaffold({
    super.key,
    required this.body,
    this.onGoHome,
    this.onGoDrinks,
    this.onGoStory,
    this.onGoLocation,
    this.onGoProducts,
    this.onGoAccount,
  });

  final Widget Function(double scale) body;
  final VoidCallback? onGoHome;
  final VoidCallback? onGoDrinks;
  final VoidCallback? onGoStory;
  final VoidCallback? onGoLocation;
  final VoidCallback? onGoProducts;
  final VoidCallback? onGoAccount;

  @override
  State<EisaiInfoScaffold> createState() => _EisaiInfoScaffoldState();
}

class _EisaiInfoScaffoldState extends State<EisaiInfoScaffold> {
  bool _menuOpen = false;

  void _navigate(VoidCallback? action) {
    setState(() => _menuOpen = false);
    action?.call();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.white,
    body: SafeArea(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final s = (constraints.maxWidth / 390).clamp(.75, 1.45).toDouble();
          return Stack(
            children: [
              SingleChildScrollView(
                child: Center(
                  child: SizedBox(
                    width: 390 * s,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SizedBox(
                          height: 122 * s,
                          child: Stack(
                            children: [
                              Positioned(
                                top: 64 * s,
                                left: 14 * s,
                                child: EisaiHomeLogo(
                                  assetPath: 'assets/images/eisai_logo.png',
                                  width: 112 * s,
                                  height: 29 * s,
                                  onTap: () => _navigate(widget.onGoHome),
                                ),
                              ),
                              Positioned(
                                top: 67 * s,
                                right: 16 * s,
                                child: IconButton(
                                  tooltip: _menuOpen
                                      ? 'Close navigation'
                                      : 'Open navigation',
                                  onPressed: () =>
                                      setState(() => _menuOpen = !_menuOpen),
                                  icon: Icon(
                                    _menuOpen ? Icons.close : Icons.menu,
                                    size: 24 * s,
                                    color: const Color(0xFF202020),
                                  ),
                                ),
                              ),
                              const Positioned(
                                left: 0,
                                right: 0,
                                bottom: 0,
                                child: Divider(
                                  height: 1,
                                  thickness: 1,
                                  color: Color(0xFFEEEEEE),
                                ),
                              ),
                            ],
                          ),
                        ),
                        widget.body(s),
                      ],
                    ),
                  ),
                ),
              ),
              if (_menuOpen)
                Positioned.fill(
                  top: 122 * s,
                  child: EisaiNavigationOverlay(
                    onClose: () => setState(() => _menuOpen = false),
                    onHome: () => _navigate(widget.onGoHome),
                    onDrinks: () => _navigate(widget.onGoDrinks),
                    onStory: () => _navigate(widget.onGoStory),
                    onProducts: () => _navigate(widget.onGoProducts),
                    onLocation: () => _navigate(widget.onGoLocation),
                    onAccount: widget.onGoAccount == null
                        ? null
                        : () => _navigate(widget.onGoAccount),
                  ),
                ),
            ],
          );
        },
      ),
    ),
  );
}
