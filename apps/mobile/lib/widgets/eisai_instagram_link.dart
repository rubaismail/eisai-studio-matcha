import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class EisaiInstagramLink extends StatelessWidget {
  const EisaiInstagramLink({super.key, required this.style});

  final TextStyle style;

  static final Uri profile = Uri.parse(
    'https://www.instagram.com/eisaistudio/',
  );

  Future<void> _open() async {
    await launchUrl(profile, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) => Semantics(
    link: true,
    label: 'Eisai Studio Instagram profile',
    child: InkWell(
      onTap: _open,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Text(
          '@eisaistudio',
          style: style.copyWith(decoration: TextDecoration.underline),
        ),
      ),
    ),
  );
}
