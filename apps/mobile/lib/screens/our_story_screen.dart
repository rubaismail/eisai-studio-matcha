import 'package:flutter/material.dart';
import '../widgets/eisai_info_scaffold.dart';
import '../widgets/eisai_footer.dart';

class OurStoryScreen extends StatelessWidget {
  const OurStoryScreen({
    super.key,
    this.onGoHome,
    this.onGoDrinks,
    this.onGoLocation,
    this.onGoProducts,
    this.onGoAccount,
  });

  final VoidCallback? onGoHome;
  final VoidCallback? onGoDrinks;
  final VoidCallback? onGoLocation;
  final VoidCallback? onGoProducts;
  final VoidCallback? onGoAccount;

  static const _ink = Color(0xFF1F1F1F);
  static const _muted = Color(0xFF4F4F4F);
  static const _lavender = Color(0xFFEEF0FF);

  TextStyle _q(double size, {Color color = _ink, double height = 1.2}) =>
      TextStyle(
        fontFamily: 'Questrial',
        fontSize: size,
        color: color,
        height: height,
      );
  TextStyle _a(double size, {Color color = _ink}) =>
      TextStyle(fontFamily: 'Anonymous Pro', fontSize: size, color: color);

  Widget _paragraph(String value, double s) => Padding(
    padding: EdgeInsets.only(bottom: 22 * s),
    child: Text(value, style: _q(16 * s, color: _muted, height: 1.45)),
  );

  @override
  Widget build(BuildContext context) => EisaiInfoScaffold(
    onGoHome: onGoHome,
    onGoDrinks: onGoDrinks,
    onGoStory: () {},
    onGoLocation: onGoLocation,
    onGoProducts: onGoProducts,
    onGoAccount: onGoAccount,
    body: (s) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(24 * s, 36 * s, 24 * s, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('EISAI STUDIO', style: _a(12 * s, color: _muted)),
              SizedBox(height: 22 * s),
              Text('Our story', style: _q(53 * s)),
              SizedBox(height: 31 * s),
              const Divider(color: Color(0xFFA6A6A6), height: 1),
              SizedBox(height: 53 * s),
              Text(
                'Two people. A whisk. A lot of opinions about matcha.',
                style: _q(25 * s),
              ),
              SizedBox(height: 24 * s),
              _paragraph(
                'We’re the two people behind Eisai. If you’ve visited one of our Orlando pop-ups, you’ve probably met us—with a whisk in hand and a growing collection of green stains.',
                s,
              ),
              _paragraph(
                'Eisai brings together the things we love: Japanese matcha and the little ritual of making something worth slowing down for.',
                s,
              ),
              _paragraph(
                'We work with specialty Japanese matcha and pay attention to its character: the aroma, the texture, the sweetness, the way it tastes with milk. Different cultivars bring different personalities. Finding the right one for a drink is part of the fun.',
                s,
              ),
              _paragraph('Then come the recipe tests.', s),
              Text(
                'A little Zen. A little unexpected. Seriously good matcha.',
                style: _q(25 * s),
              ),
              SizedBox(height: 20 * s),
              _paragraph(
                'We love the care behind Japanese tea culture—the preparation, the attention, the invitation to be present. We also love seeing where a little curiosity can take a drink. Some days, your shade is a classic latte. Other days, it comes with Banana Bread.',
                s,
              ),
            ],
          ),
        ),
        Container(
          margin: EdgeInsets.fromLTRB(16 * s, 26 * s, 16 * s, 58 * s),
          padding: EdgeInsets.fromLTRB(30 * s, 40 * s, 30 * s, 44 * s),
          color: _lavender,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('You became part of the story.', style: _q(24 * s)),
              SizedBox(height: 29 * s),
              _paragraph(
                'Eisai comes to life at our pop-ups. It’s the person taking their first sip of matcha. The regular who already knows their order. The friend who takes a sip of yours and suddenly needs their own.',
                s,
              ),
              _paragraph(
                'We’ve watched queues grow and drinks sell out. Getting to make something people come back for makes all those recipe adjustments feel pretty worthwhile. Every visit helps shape what comes next.',
                s,
              ),
              SizedBox(height: 16 * s),
              Text('Still whisking.', style: _q(24 * s)),
              SizedBox(height: 19 * s),
              _paragraph(
                'We’re still building Eisai. Still testing ideas. Still finding new shades of green to get excited about.',
                s,
              ),
              _paragraph(
                'What we want is simple: to make seriously good matcha and give you a cup you look forward to.',
                s,
              ),
              SizedBox(height: 14 * s),
              const Divider(color: Color(0xFF9999A6)),
              SizedBox(height: 21 * s),
              Text('Let’s find your shade.', style: _q(24 * s)),
              SizedBox(height: 10 * s),
              Text('YOUR SHADE, YOUR WHISK.', style: _a(12 * s, color: _muted)),
            ],
          ),
        ),
        EisaiFooter(scale: s),
      ],
    ),
  );
}
