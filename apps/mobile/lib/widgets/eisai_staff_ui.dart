import '../main.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class StaffColors {
  static const ink = Color(0xFF1A1A1A);
  static const muted = Color(0xFF4A4A4A);
  static const periwinkle = Color(0xFF8C91C9);
  static const line = Color(0xFFE4E4E4);
  static const panel = Color(0xFFF4F4F4);
  static const danger = Color(0xFFA83B38);
  static const errorBg = Color(0xFFFFF3F2);
}

TextStyle staffText(
  double size, {
  bool mono = false,
  Color color = StaffColors.ink,
  double? letterSpacing,
  double? height,
}) => TextStyle(
  fontFamily: mono ? 'Anonymous Pro' : 'Questrial',
  fontSize: size,
  fontWeight: FontWeight.w400,
  color: color,
  letterSpacing: letterSpacing,
  height: height,
);

Future<bool> openEisaiWebsite(Uri? url) async {
  if (url == null) return false;
  return launchUrl(url, mode: LaunchMode.externalApplication);
}

void openStaffLiveMenu(BuildContext context) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      settings: const RouteSettings(name: '/staff/live-menu'),
      builder: (_) =>
          const MainNavigation(initialIndex: 1, returnToStaff: true),
    ),
  );
}

void openStaffHome(BuildContext context) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      settings: const RouteSettings(name: '/staff/home'),
      builder: (_) => const MainNavigation(
        initialIndex: 0,
        returnToStaff: true,
      ),
    ),
  );
}

class StaffChrome extends StatelessWidget {
  const StaffChrome({
    super.key,
    required this.body,
    required this.onLogout,
    required this.onMenu,
    required this.publicMenuUrl,
    this.logoAsset,
    this.onHome,
    this.showFooter = true,
  });
  final Widget body;
  final VoidCallback onLogout, onMenu;
  final VoidCallback? onHome;
  final Uri? publicMenuUrl;

  final String? logoAsset;
  final bool showFooter;
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.white,
    body: SafeArea(
      child: Column(
        children: [
          Container(
            height: 71,
            width: double.infinity,
            color: StaffColors.ink,
            child: Stack(
              children: [              
              Positioned(
                left: 8,
                top: 0,
                width: 112,
                height: 48,
                child: Semantics(
                  button: true,
                  label: 'Go to home',
                  child: InkWell(
                    excludeFromSemantics: true,
                    onTap: onHome ?? () => openStaffHome(context),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Image.asset(
                          logoAsset ?? 'assets/images/eisai_logo_white.png',
                          width: 80,
                          height: 21,
                          fit: BoxFit.contain,
                          excludeFromSemantics: true,
                          errorBuilder: (_, __, ___) => Text(
                            'Eisai',
                            style: staffText(22, color: Colors.white),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
                Positioned(
                  left: 16,
                  top: 44,
                  child: Text(
                    'STAFF · MENU EDITOR',
                    style: staffText(
                      12,
                      mono: true,
                      color: StaffColors.periwinkle,
                    ),
                  ),
                ),
                Positioned(
                  right: 16,
                  top: 12,
                  child: PopupMenuButton<String>(
                    tooltip: 'Open staff navigation',
                    icon: const Icon(Icons.menu, color: Colors.white, size: 27),
                    onSelected: (selection) {
                      switch (selection) {
                        case 'menu':
                          onMenu();
                          break;
                        case 'live':
                          openStaffLiveMenu(context);
                          break;
                        case 'logout':
                          onLogout();
                          break;
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem<String>(
                        value: 'menu',
                        child: Text('Staff menu'),
                      ),
                      const PopupMenuItem<String>(
                        value: 'live',
                        child: Text('View live menu'),
                      ),
                      const PopupMenuItem<String>(
                        value: 'logout',
                        child: Text('Log out'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(child: body),
          if (showFooter)
            Container(
              height: 76,
              width: double.infinity,
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: Color(0xFFD9D9D9), width: 1),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => openStaffLiveMenu(context),
                      style: TextButton.styleFrom(
                        foregroundColor: StaffColors.ink,
                        alignment: Alignment.centerLeft,
                        padding: const EdgeInsets.only(left: 20),
                      ),
                      child: Text(
                        'VIEW LIVE MENU  →',
                        style: staffText(13, mono: true),
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: onLogout,
                    style: TextButton.styleFrom(
                      foregroundColor: StaffColors.ink,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                    ),
                    child: Text('LOG OUT', style: staffText(13, mono: true)),
                  ),
                ],
              ),
            ),
        ],
      ),
    ),
  );
}

class StaffBody extends StatelessWidget {
  const StaffBody({
    super.key,
    required this.children,
    this.padding = const EdgeInsets.fromLTRB(16, 28, 16, 56),
  });
  final List<Widget> children;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) =>
      ListView(padding: padding, children: children);
}

class StaffPrimaryButton extends StatelessWidget {
  const StaffPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.outline = false,
  });
  final String label;
  final VoidCallback? onPressed;
  final bool outline;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    height: 48,
    child: OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        backgroundColor: outline ? Colors.white : StaffColors.ink,
        foregroundColor: outline ? StaffColors.ink : Colors.white,
        disabledForegroundColor: Colors.white54,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        side: const BorderSide(color: StaffColors.ink),
      ),
      child: Text(
        label.toUpperCase(),
        style: staffText(
          13,
          mono: true,
          color: outline ? StaffColors.ink : Colors.white,
          letterSpacing: 1.04,
        ),
      ),
    ),
  );
}

class StaffField extends StatelessWidget {
  const StaffField({
    super.key,
    required this.label,
    required this.controller,
    this.hint,
    this.helper,
    this.error,
    this.maxLines = 1,
    this.keyboardType,
  });
  final String label;
  final TextEditingController controller;
  final String? hint, helper, error;
  final int maxLines;
  final TextInputType? keyboardType;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label.toUpperCase(),
        style: staffText(13, mono: true, letterSpacing: 1.04),
      ),
      const SizedBox(height: 8),
      TextField(
        controller: controller,
        maxLines: maxLines,
        keyboardType: keyboardType,
        style: staffText(16),
        decoration: InputDecoration(
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 13,
          ),
          hintText: hint,
          hintStyle: staffText(15, color: StaffColors.muted),
          enabledBorder: const OutlineInputBorder(
            borderRadius: BorderRadius.zero,
            borderSide: BorderSide(color: StaffColors.ink),
          ),
          focusedBorder: const OutlineInputBorder(
            borderRadius: BorderRadius.zero,
            borderSide: BorderSide(color: StaffColors.ink, width: 2),
          ),
          errorText: error,
          errorStyle: staffText(12, color: StaffColors.danger),
          errorMaxLines: 3,
          errorBorder: const OutlineInputBorder(
            borderRadius: BorderRadius.zero,
            borderSide: BorderSide(color: StaffColors.danger),
          ),
        ),
      ),
      if (helper != null) ...[
        const SizedBox(height: 8),
        Text(
          helper!,
          style: staffText(13, color: StaffColors.muted, height: 1.4),
        ),
      ],
    ],
  );
}

class StaffCheck extends StatelessWidget {
  const StaffCheck({
    super.key,
    required this.text,
    required this.value,
    required this.onChanged,
  });
  final String text;
  final bool value;
  final ValueChanged<bool> onChanged;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: () => onChanged(!value),
    child: ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 44),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: value ? StaffColors.ink : Colors.white,
              border: Border.all(color: StaffColors.ink),
            ),
            child: value
                ? const Icon(Icons.check, size: 17, color: Colors.white)
                : null,
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Text(
              text.toUpperCase(),
              style: staffText(12, mono: true, letterSpacing: .72),
            ),
          ),
        ],
      ),
    ),
  );
}

class StaffSectionHeader extends StatelessWidget {
  const StaffSectionHeader({
    super.key,
    required this.title,
    required this.subtitle,
  });
  final String title, subtitle;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(title, style: staffText(44, letterSpacing: -.88)),
      const SizedBox(height: 8),
      Text(
        subtitle.toUpperCase(),
        style: staffText(
          12,
          mono: true,
          color: StaffColors.muted,
          letterSpacing: .96,
        ),
      ),
    ],
  );
}

class StaffAlert extends StatelessWidget {
  const StaffAlert({
    super.key,
    required this.message,
    this.color = StaffColors.danger,
  });
  final String message;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: StaffColors.errorBg,
      border: Border.all(color: color),
    ),
    child: Text(message, style: staffText(14, color: color, height: 1.4)),
  );
}
