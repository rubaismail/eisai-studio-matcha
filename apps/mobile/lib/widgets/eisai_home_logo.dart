import 'package:flutter/material.dart';

class EisaiHomeLogo extends StatelessWidget {
  const EisaiHomeLogo({
    super.key,
    required this.onTap,
    required this.assetPath,
    this.width = 112,
    this.height = 29,
    this.scale = 1,
    this.errorBuilder,
  });

  final VoidCallback onTap;
  final String assetPath;
  final double width;
  final double height;
  final double scale;
  final ImageErrorWidgetBuilder? errorBuilder;

  @override
  Widget build(BuildContext context) {
    final scaledTargetHeight = 48 * scale;

    return Semantics(
      button: true,
      label: 'Go to home',
      onTap: onTap,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        excludeFromSemantics: true,
        borderRadius: BorderRadius.circular(4),
        child: SizedBox(
          width: width + 16 * scale,
          height: scaledTargetHeight < 48 ? 48 : scaledTargetHeight,
          child: Center(
            child: Image.asset(
              assetPath,
              width: width,
              height: height,
              fit: BoxFit.contain,
              excludeFromSemantics: true,
              errorBuilder: errorBuilder,
            ),
          ),
        ),
      ),
    );
  }
}
