import 'package:flutter/material.dart';

class EisaiNavigationOverlay extends StatelessWidget {
  const EisaiNavigationOverlay({
    super.key,
    required this.onClose,
    required this.onHome,
    required this.onDrinks,
    required this.onStory,
    required this.onLocation,
    this.onAccount,
  });

  final VoidCallback onClose;
  final VoidCallback onHome;
  final VoidCallback onDrinks;
  final VoidCallback onStory;
  final VoidCallback onLocation;
  final VoidCallback? onAccount;

  static const _ink = Color(0xFF1F1F1F);
  static const _muted = Color(0xFF6B6B6B);
  static const _divider = Color(0xFFD1D1D1);

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, bounds) {
        final scale = (bounds.maxWidth / 390).clamp(0.75, 1.45).toDouble();
        final panelWidth = (328 * scale).clamp(0.0, bounds.maxWidth);

        return Stack(
          children: [
            // Dims the Home screen, but not its white header.
            Positioned.fill(
              child: GestureDetector(
                onTap: onClose,
                behavior: HitTestBehavior.opaque,
                child: Container(
                  color: const Color(0xFF36363B).withValues(alpha: 0.64),
                ),
              ),
            ),
            Positioned(
              top: 0,
              right: 0,
              bottom: 0,
              width: panelWidth,
              child: Material(
                color: Colors.white,
                child: SingleChildScrollView(
                  padding: EdgeInsets.only(
                    left: 26 * scale,
                    right: 36 * scale,
                    top: 31 * scale,
                    bottom: 45 * scale,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Align(
                        alignment: Alignment.centerRight,
                        child: InkWell(
                          onTap: onClose,
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: 4 * scale),
                            child: Text(
                              'CLOSE  ×',
                              style: TextStyle(
                                fontFamily: 'Anonymous Pro',
                                fontSize: 14 * scale,
                                color: _ink,
                              ),
                            ),
                          ),
                        ),
                      ),
                      SizedBox(height: 43 * scale),
                      Text(
                        'EXPLORE EISAI',
                        style: TextStyle(
                          fontFamily: 'Anonymous Pro',
                          fontSize: 12 * scale,
                          color: _muted,
                        ),
                      ),
                      SizedBox(height: 31 * scale),
                      _item('HOME', onHome, scale),
                      _item('OUR DRINKS', onDrinks, scale),
                      _item('OUR STORY', onStory, scale),
                      _item('OUR LOCATION', onLocation, scale),
                      _item('ACCOUNT', onAccount, scale),
                      SizedBox(height: 108 * scale),
                      Text(
                        '@eisaistudio',
                        style: TextStyle(
                          fontFamily: 'Questrial',
                          fontSize: 14 * scale,
                          color: _muted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _item(String title, VoidCallback? onTap, double scale) {
    return SizedBox(
      height: 91 * scale,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: 15 * scale),
            Text(
              title,
              style: TextStyle(
                fontFamily: 'Questrial',
                fontSize: 20 * scale,
                color: _ink,
              ),
            ),
            const Spacer(),
            const Divider(height: 1, thickness: 1, color: _divider),
          ],
        ),
      ),
    );
  }
}
