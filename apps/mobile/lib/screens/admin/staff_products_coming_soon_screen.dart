import 'package:flutter/material.dart';
import '../../widgets/eisai_staff_ui.dart';

class EisaiProductsComingSoonScreen extends StatelessWidget {
  const EisaiProductsComingSoonScreen({
    super.key,
    required this.onBackToMenu,
    required this.onFollowInstagram,
    this.logoAsset,
  });
  final VoidCallback onBackToMenu, onFollowInstagram;
  final String? logoAsset;
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.white,
    body: SafeArea(
      child: Column(
        children: [
          Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: StaffColors.line)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: logoAsset == null
                      ? Text(
                          'eisai studio',
                          style: staffText(23, color: StaffColors.periwinkle),
                        )
                      : Image.asset(
                          logoAsset!,
                          height: 28,
                          alignment: Alignment.centerLeft,
                          errorBuilder: (_, __, ___) => Text(
                            'eisai studio',
                            style: staffText(23, color: StaffColors.periwinkle),
                          ),
                        ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 120, 16, 50),
              children: [
                Center(
                  child: Text('PRODUCTS', style: staffText(13, mono: true)),
                ),
                const SizedBox(height: 35),
                Text(
                  'Coming soon.',
                  textAlign: TextAlign.center,
                  style: staffText(44),
                ),
                const SizedBox(height: 22),
                Text(
                  'Follow @eisaistudio to hear when it’s ready.',
                  textAlign: TextAlign.center,
                  style: staffText(15, color: StaffColors.muted),
                ),
                const SizedBox(height: 35),
                StaffPrimaryButton(
                  label: 'See the menu',
                  onPressed: onBackToMenu,
                ),
                const SizedBox(height: 20),
                StaffPrimaryButton(
                  label: 'Follow on Instagram',
                  outline: true,
                  onPressed: onFollowInstagram,
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
