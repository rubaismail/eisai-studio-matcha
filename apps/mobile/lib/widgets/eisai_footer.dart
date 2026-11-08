import 'package:flutter/material.dart';
import 'eisai_instagram_link.dart';

class EisaiFooter extends StatelessWidget {
  const EisaiFooter({super.key, required this.scale});
  final double scale;
  static const _lime = Color(0xFFE3FF23);
  TextStyle _q(double size, {Color color = Colors.white}) =>
      TextStyle(fontFamily: 'Questrial', fontSize: size, color: color);
  TextStyle _a(double size, {Color color = Colors.white}) =>
      TextStyle(fontFamily: 'Anonymous Pro', fontSize: size, color: color);
  Widget _schedule(String title, String hours, double s) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(title, style: _a(13 * s)),
      SizedBox(height: 7 * s),
      Text(hours, style: _q(14 * s, color: const Color(0xFFD7D7D7))),
    ],
  );
  @override
  Widget build(BuildContext context) {
    final s = scale;
    return Container(
      color: const Color(0xFF1A1A1A),
      padding: EdgeInsets.fromLTRB(24 * s, 38 * s, 24 * s, 30 * s),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Image.asset(
            'assets/images/eisai_logo_white.png',
            width: 112 * s,
            height: 29 * s,
            errorBuilder: (_, __, ___) => Text('EISAI', style: _q(24 * s)),
          ),
          SizedBox(height: 23 * s),
          Text(
            'A little Zen. A little\nunexpected. Seriously\ngood matcha.',
            style: _q(25 * s).copyWith(height: 1.05),
          ),
          SizedBox(height: 47 * s),
          const Divider(color: Color(0xFF484848)),
          SizedBox(height: 28 * s),
          Text('WHISKING SCHEDULE', style: _a(12 * s, color: _lime)),
          SizedBox(height: 24 * s),
          _schedule('UCF STUDENT UNION', 'Wednesdays · 9AM – 5PM', s),
          SizedBox(height: 20 * s),
          _schedule('SANFORD FARMERS MARKET', 'Saturdays · 10AM – 3PM', s),
          SizedBox(height: 20 * s),
          _schedule('MOUNT DORA', 'Sundays · 9AM – 2PM', s),
          SizedBox(height: 46 * s),
          const Divider(color: Color(0xFF484848)),
          SizedBox(height: 24 * s),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('FOLLOW ALONG', style: _a(12 * s, color: _lime)),
                    SizedBox(height: 20 * s),
                    EisaiInstagramLink(style: _a(13 * s)),
                    SizedBox(height: 30 * s),
                    Text('CONTACT', style: _a(12 * s, color: _lime)),
                    SizedBox(height: 19 * s),
                    Text(
                      '[contact@eisaistudio]',
                      softWrap: true,
                      style: _a(12 * s, color: const Color(0xFFD7D7D7)),
                    ),
                  ],
                ),
              ),
              SizedBox(width: 8 * s),
              Image.asset(
                'assets/images/monk_white.png',
                width: 118 * s,
                height: 142 * s,
                errorBuilder: (_, __, ___) => SizedBox(width: 118 * s),
              ),
            ],
          ),
          SizedBox(height: 43 * s),
          const Divider(color: Color(0xFF484848)),
          SizedBox(height: 20 * s),
          Text(
            'COPYRIGHT © EISAI STUDIO LLC',
            style: _a(10 * s, color: Colors.white70),
          ),
          SizedBox(height: 20 * s),
          Text(
            'EISAI STUDIO LLC · ORLANDO, FLORIDA',
            style: _a(10 * s, color: Colors.white70),
          ),
        ],
      ),
    );
  }
}
