import 'package:flutter/material.dart';

class EisaiHomeLogo extends StatelessWidget {
  const EisaiHomeLogo({
    super.key,
    required this.onTap,
    required this.assetPath,
    this.width = 112,
    this.height = 29,
  });

  final VoidCallback onTap;
  final String assetPath;
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Go to home',
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        child: SizedBox(
          width: width + 16,
          height: 48,
          child: Center(
            child: Image.asset(
              assetPath,
              width: width,
              height: height,
              fit: BoxFit.contain,
              excludeFromSemantics: true,
            ),
          ),
        ),
      ),
    );
  }
}
