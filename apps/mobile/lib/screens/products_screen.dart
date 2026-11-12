import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../widgets/eisai_info_scaffold.dart';
import '../widgets/eisai_footer.dart';
import '../widgets/eisai_instagram_link.dart';

class ProductsScreen extends StatelessWidget {
  const ProductsScreen({
    super.key,
    this.onGoHome,
    this.onGoDrinks,
    this.onGoStory,
    this.onGoLocation,
    this.onGoAccount,
  });

  final VoidCallback? onGoHome;
  final VoidCallback? onGoDrinks;
  final VoidCallback? onGoStory;
  final VoidCallback? onGoLocation;
  final VoidCallback? onGoAccount;

  static const _ink = Color(0xFF1F1F1F);
  static const _muted = Color(0xFF6B6B6B);

  TextStyle _q(double size, {Color color = _ink}) =>
      TextStyle(fontFamily: 'Questrial', fontSize: size, color: color);

  TextStyle _a(double size, {Color color = _ink}) =>
      TextStyle(fontFamily: 'Anonymous Pro', fontSize: size, color: color);

  Future<void> _openInstagram() async {
    await launchUrl(
      EisaiInstagramLink.profile,
      mode: LaunchMode.externalApplication,
    );
  }

  @override
  Widget build(BuildContext context) => EisaiInfoScaffold(
    onGoHome: onGoHome,
    onGoDrinks: onGoDrinks,
    onGoStory: onGoStory,
    onGoLocation: onGoLocation,
    onGoProducts: () {},
    onGoAccount: onGoAccount,
    body: (s) => Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(16 * s, 120 * s, 16 * s, 110 * s),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'PRODUCTS',
                textAlign: TextAlign.center,
                style: _a(12 * s, color: _muted),
              ),

              SizedBox(height: 22 * s),

              Text(
                'Coming soon.',
                textAlign: TextAlign.center,
                style: _q(56 * s),
              ),

              SizedBox(height: 22 * s),

              Text(
                'Follow @eisaistudio to hear when it’s ready.',
                textAlign: TextAlign.center,
                style: _q(16 * s, color: _muted).copyWith(height: 1.55),
              ),

              SizedBox(height: 28 * s),

              SizedBox(
                height: 52 * s,
                child: FilledButton(
                  onPressed: onGoDrinks,
                  style: FilledButton.styleFrom(
                    backgroundColor: _ink,
                    foregroundColor: Colors.white,
                    shape: const RoundedRectangleBorder(),
                  ),
                  child: Text(
                    'SEE THE MENU',
                    style: _a(13 * s, color: Colors.white),
                  ),
                ),
              ),

              SizedBox(height: 22 * s),

              SizedBox(
                height: 52 * s,
                child: OutlinedButton(
                  onPressed: _openInstagram,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _ink,
                    side: const BorderSide(color: _ink),
                    shape: const RoundedRectangleBorder(),
                  ),
                  child: Text('FOLLOW ON INSTAGRAM', style: _a(13 * s)),
                ),
              ),
            ],
          ),
        ),

        EisaiFooter(scale: s),
      ],
    ),
  );
}
