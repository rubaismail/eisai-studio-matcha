import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class EisaiInstagramLink extends StatelessWidget {
  const EisaiInstagramLink({super.key, required this.style});

  final TextStyle style;

  static final Uri profile = Uri.parse(
    'https://www.instagram.com/eisaistudio/',
  );

  static Future<void> open(BuildContext context) async {
    var opened = false;
    try {
      opened = await launchUrl(profile, mode: LaunchMode.externalApplication);
    } catch (_) {
      opened = false;
    }
    if (opened || !context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Could not open Instagram. Visit instagram.com/eisaistudio.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final color =
        style.color ??
        DefaultTextStyle.of(context).style.color ??
        Theme.of(context).colorScheme.onSurface;

    return Semantics(
      link: true,
      label: 'Eisai Studio Instagram profile',
      child: InkWell(
        onTap: () => open(context),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CustomPaint(
              size: const Size(20, 20),
              painter: _InstagramLogoPainter(color),
            ),
            const SizedBox(width: 8),
            Text(
              '@eisaistudio',
              style: style.copyWith(
                color: color,
                decoration: TextDecoration.underline,
                decorationColor: color,
                decorationThickness: 1.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InstagramLogoPainter extends CustomPainter {
  const _InstagramLogoPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 24, size.height / 24);

    final outline = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6;

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(3, 3, 18, 18),
        const Radius.circular(5),
      ),
      outline,
    );
    canvas.drawCircle(const Offset(12, 12), 4.2, outline);
    canvas.drawCircle(const Offset(17.4, 6.6), 1, Paint()..color = color);

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _InstagramLogoPainter old) => old.color != color;
}
