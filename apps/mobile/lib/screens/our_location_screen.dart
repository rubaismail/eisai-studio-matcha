import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../widgets/eisai_info_scaffold.dart';
import '../widgets/eisai_footer.dart';

class OurLocationScreen extends StatelessWidget {
  const OurLocationScreen({
    super.key,
    this.onGoHome,
    this.onGoDrinks,
    this.onGoStory,
  });

  final VoidCallback? onGoHome;
  final VoidCallback? onGoDrinks;
  final VoidCallback? onGoStory;

  static const _ink = Color(0xFF202020);
  static const _muted = Color(0xFF757575);

  TextStyle _q(double size, {Color color = _ink}) =>
      TextStyle(fontFamily: 'Questrial', fontSize: size, color: color);
  TextStyle _a(double size, {Color color = _ink}) =>
      TextStyle(fontFamily: 'Anonymous Pro', fontSize: size, color: color);

  Future<void> _directions(String destination) async {
    final uri = Uri.https('www.google.com', '/maps/dir/', {
      'api': '1',
      'destination': destination,
    });
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Widget _locationCard(String name, String hours, String query, double s) =>
      Container(
        margin: EdgeInsets.only(bottom: 23 * s),
        padding: EdgeInsets.fromLTRB(15 * s, 20 * s, 15 * s, 28 * s),
        decoration: BoxDecoration(
          color: const Color(0xFFF9F9FA),
          border: Border.all(color: const Color(0xFFD6D6D6)),
          borderRadius: BorderRadius.circular(8 * s),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(name, style: _q(17 * s)),
            SizedBox(height: 20 * s),
            Text(hours, style: _q(15 * s, color: _muted)),
            SizedBox(height: 38 * s),
            SizedBox(
              height: 49 * s,
              child: OutlinedButton(
                onPressed: () => _directions(query),
                style: OutlinedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: _ink,
                  side: const BorderSide(color: Color(0xFFD6D6D6)),
                  shape: const RoundedRectangleBorder(),
                ),
                child: Text('GET DIRECTIONS  →', style: _a(13 * s)),
              ),
            ),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) => EisaiInfoScaffold(
    onGoHome: onGoHome,
    onGoDrinks: onGoDrinks,
    onGoStory: onGoStory,
    onGoLocation: () {},
    body: (s) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(24 * s, 48 * s, 24 * s, 100 * s),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('FIND EISAI', style: _a(12 * s, color: _muted)),
              SizedBox(height: 23 * s),
              Text('Find us this week.', style: _q(39 * s)),
              SizedBox(height: 22 * s),
              Text(
                'Come say hi at one of our Orlando-area pop-ups.',
                style: _q(16 * s, color: _muted),
              ),
              SizedBox(height: 64 * s),
              _locationCard(
                'UCF STUDENT UNION',
                'Wednesdays · 9AM – 5PM',
                'UCF Student Union, Orlando FL',
                s,
              ),
              _locationCard(
                'SANFORD FARMERS MARKET',
                'Saturdays · 10AM – 3PM',
                'Sanford Farmers Market, Sanford FL',
                s,
              ),
              _locationCard(
                'MOUNT DORA',
                'Sundays · 9AM – 2PM',
                '239 W 4th Ave #237, Mt Dora, FL 32757',
                s,
              ),
              SizedBox(height: 23 * s),
              Text(
                'Locations and hours may change. Please check Eisai’s latest updates before visiting.',
                style: _q(13 * s, color: _muted),
              ),
            ],
          ),
        ),
        EisaiFooter(scale: s),
      ],
    ),
  );
}
