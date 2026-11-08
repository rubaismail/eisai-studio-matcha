import 'package:flutter/material.dart';
import '../main.dart';
import '../widgets/eisai_navigation_overlay.dart';

class EisaiAuthStyle {
  static const ink = Color(0xFF202020);
  static const muted = Color(0xFF757575);
  static const border = Color(0xFF8C8C8C);
  static const error = Color(0xFFB63D3D);
  static TextStyle questrial(double size, {Color color = ink}) => TextStyle(
    fontFamily: 'Questrial',
    fontSize: size,
    color: color,
    height: 1.3,
  );
  static TextStyle mono(double size, {Color color = ink}) => TextStyle(
    fontFamily: 'Anonymous Pro',
    fontSize: size,
    color: color,
    height: 1.2,
  );
}

class EisaiAuthShell extends StatefulWidget {
  const EisaiAuthShell({super.key, required this.children});
  final List<Widget> children;

  @override
  State<EisaiAuthShell> createState() => _EisaiAuthShellState();
}

class _EisaiAuthShellState extends State<EisaiAuthShell> {
  bool _menuOpen = false;

  void _openDestination(int index) {
    setState(() => _menuOpen = false);
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => MainNavigation(initialIndex: index),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.white,
    body: SafeArea(
      bottom: false,
      child: Column(
        children: [
          SizedBox(
            height: 98,
            child: Stack(
              children: [
                Positioned(
                  left: 22,
                  bottom: 20,
                  child: Image.asset(
                    'assets/images/eisai_logo_periwinkle.png',
                    width: 112,
                    height: 29,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => Text(
                      'EISAI STUDIO',
                      style: EisaiAuthStyle.mono(
                        16,
                        color: const Color(0xFF8B91C7),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  right: 16,
                  bottom: 15,
                  child: IconButton(
                    tooltip: 'Navigation menu',
                    icon: const Text(
                      '☰',
                      style: TextStyle(fontSize: 24, color: EisaiAuthStyle.ink),
                    ),
                    onPressed: () => setState(() => _menuOpen = !_menuOpen),
                  ),
                ),
                const Align(
                  alignment: Alignment.bottomCenter,
                  child: Divider(
                    height: 1,
                    thickness: 1,
                    color: Color(0xFFEEEEEE),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Stack(
              children: [
                SingleChildScrollView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 430),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(24, 46, 24, 54),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: widget.children,
                        ),
                      ),
                    ),
                  ),
                ),
                if (_menuOpen)
                  Positioned.fill(
                    child: EisaiNavigationOverlay(
                      onClose: () => setState(() => _menuOpen = false),
                      onHome: () => _openDestination(0),
                      onDrinks: () => _openDestination(1),
                      onStory: () => _openDestination(2),
                      onLocation: () => _openDestination(3),
                      onAccount: () => setState(() => _menuOpen = false),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class AuthEyebrow extends StatelessWidget {
  const AuthEyebrow(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) =>
      Text(text, style: EisaiAuthStyle.mono(12));
}

class AuthHeading extends StatelessWidget {
  const AuthHeading(this.text, {super.key, this.size = 43});
  final String text;
  final double size;
  @override
  Widget build(BuildContext context) =>
      Text(text, style: EisaiAuthStyle.questrial(size).copyWith(height: 1.13));
}

class AuthField extends StatelessWidget {
  const AuthField({
    super.key,
    required this.title,
    required this.hint,
    required this.controller,
    this.password = false,
    this.email = false,
    this.enabled = true,
    this.errorText,
    this.onChanged,
  });
  final String title, hint;
  final TextEditingController controller;
  final bool password, email;
  final bool enabled;
  final String? errorText;
  final ValueChanged<String>? onChanged;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text(title, style: EisaiAuthStyle.mono(12)),
      const SizedBox(height: 15),
      SizedBox(
        height: 54,
        child: TextField(
          controller: controller,
          obscureText: password,
          enabled: enabled,
          onChanged: onChanged,
          keyboardType: email ? TextInputType.emailAddress : TextInputType.text,
          textInputAction: TextInputAction.next,
          autofillHints: email ? const [AutofillHints.email] : null,
          style: EisaiAuthStyle.questrial(16),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: EisaiAuthStyle.questrial(
              16,
              color: const Color(0xFF909090),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 16,
            ),
            filled: true,
            fillColor: Colors.white,
            enabledBorder: const OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: EisaiAuthStyle.border),
            ),
            focusedBorder: const OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: EisaiAuthStyle.ink, width: 1.5),
            ),
          ),
        ),
      ),
      if (errorText != null) ...[
        const SizedBox(height: 8),
        Text(
          errorText!,
          style: EisaiAuthStyle.mono(13, color: EisaiAuthStyle.error),
        ),
      ],
    ],
  );
}

class AuthButton extends StatelessWidget {
  const AuthButton(
    this.label, {
    super.key,
    this.onPressed,
    this.outline = false,
    this.height = 44,
  });
  final String label;
  final VoidCallback? onPressed;
  final bool outline;
  final double height;
  @override
  Widget build(BuildContext context) => SizedBox(
    height: height,
    child: OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        backgroundColor: outline ? Colors.white : EisaiAuthStyle.ink,
        foregroundColor: outline ? EisaiAuthStyle.ink : Colors.white,
        disabledForegroundColor: Colors.grey,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        side: BorderSide(
          color: outline ? const Color(0xFFD6D6D6) : EisaiAuthStyle.ink,
        ),
      ),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          label,
          style: EisaiAuthStyle.mono(
            14,
            color: onPressed == null
                ? Colors.grey
                : (outline ? EisaiAuthStyle.ink : Colors.white),
          ),
        ),
      ),
    ),
  );
}

class AuthInlineLink extends StatelessWidget {
  const AuthInlineLink(
    this.text, {
    super.key,
    required this.onTap,
    this.align = TextAlign.left,
  });
  final String text;
  final VoidCallback onTap;
  final TextAlign align;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Text(text, textAlign: align, style: EisaiAuthStyle.mono(13)),
    ),
  );
}
