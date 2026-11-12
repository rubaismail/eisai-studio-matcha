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
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CustomPaint(
            size: const Size(20, 20),
            painter: _InstagramLogoPainter(const Color(0xFFF5F5F5)),
          ),
          const SizedBox(width: 8),
          Text(
            '@eisaistudio',
            style: style.copyWith(
              color: const Color(0xFFF5F5F5),
              decoration: TextDecoration.underline,
              decorationColor: const Color(0xFFF5F5F5),
              decorationThickness: 1.2,
            ),
          ),
        ],
      ),
    ),
  );
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
