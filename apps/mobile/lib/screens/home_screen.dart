import 'package:flutter/material.dart';
import '../widgets/eisai_footer.dart';
import '../widgets/eisai_navigation_overlay.dart';
import '../widgets/eisai_home_video_card.dart';
import '../models/menu_item.dart';
import '../services/menu_service.dart' as menu_service;

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.onViewMenu,
    this.onGoStory,
    this.onGoLocation,
    this.fetchMenu,
    this.onGoAccount,
  });

  final VoidCallback onViewMenu;
  final VoidCallback? onGoStory;
  final VoidCallback? onGoLocation;
  final VoidCallback? onGoAccount;
  // test loader
  final Future<List<MenuItem>> Function()? fetchMenu;

  @override
  State<HomeScreen> createState() => HomeScreenState();
}

class _FeaturedDrink {
  const _FeaturedDrink({
    required this.name,
    required this.description,
    this.subtitle = '',
    this.imageUrl = '',
    this.imageAlt = '',
    this.inspiredBy = '',
    this.assetName = '',
  });

  final String name;
  final String subtitle;
  final String description;
  final String imageUrl;
  final String imageAlt;
  final String inspiredBy;
  final String assetName;

  static String imageFor(String name) {
    switch (name.toLowerCase().trim()) {
      case 'golden hour':
        return 'golden_hour.png';
      case 'mango dango':
        return 'mango_dango.png';
      case 'tokyo rose':
        return 'rose.png';
      default:
        return '';
    }
  }

  factory _FeaturedDrink.fromModel(MenuItem item) {
    return _FeaturedDrink(
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
      inspiredBy: item.inspiredBy,
      assetName: imageFor(item.name),
    );
  }
}

class HomeScreenState extends State<HomeScreen> {
  static const ink = Color(0xFF1A1A1A);
  static const gray = Color(0xFF4A4A4A);
  static const lavender = Color(0xFFEEF0FF);
  static const lime = Color(0xFFE3FF23);

  bool _menuOpen = false;
  final GlobalKey _storyKey = GlobalKey();

  static const previewDrinks = <_FeaturedDrink>[
    _FeaturedDrink(
      name: 'Golden Hour',
      subtitle: '(Banana bread)',
      description:
          'Matcha or Hojicha / Eisai’s banana milk / Banana sea salt Foam',
      assetName: 'golden_hour.png',
    ),
    _FeaturedDrink(
      name: 'Mango Dango',
      subtitle: '(Mango sticky rice)',
      description: 'Matcha / Mango puree / Whole milk / Coconut sauce',
      assetName: 'mango_dango.png',
    ),
    _FeaturedDrink(
      name: 'Tokyo Rose',
      description: 'Matcha or Hojicha / Whole milk / Housemade rose syrup',
      assetName: 'rose.png',
    ),
  ];

  late Future<List<_FeaturedDrink>> _drinks = _loadFeatured();
  final GlobalKey _footerKey = GlobalKey();
  final ScrollController _popupScrollController = ScrollController();
  int _activePopupCard = 0;
  double _popupCardExtent = 304;

  @override
  void initState() {
    super.initState();
    _popupScrollController.addListener(_onPopupScroll);
  }

  void _onPopupScroll() {
    if (!_popupScrollController.hasClients) return;
    final cardIndex = (_popupScrollController.offset / _popupCardExtent)
        .round()
        .clamp(0, 4);
    if (cardIndex != _activePopupCard && mounted) {
      setState(() => _activePopupCard = cardIndex);
    }
  }

  @override
  void dispose() {
    _popupScrollController.dispose();
    super.dispose();
  }

  void scrollToStory() {
    final target = _storyKey.currentContext;
    if (target != null) {
      Scrollable.ensureVisible(
        target,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeInOut,
      );
    }
  }

  void scrollToLocation() => _scrollToFooter();

  void _retryFeatured() {
    setState(() {
      _drinks = _loadFeatured();
    });
  }

  Future<List<_FeaturedDrink>> _loadFeatured() async {
    final items = await (widget.fetchMenu ?? menu_service.fetchMenu)();
    return items
        .where((item) {
          return item.isFeatured &&
              item.isAvailable &&
              item.category.trim().toLowerCase() != 'treats';
        })
        .map(_FeaturedDrink.fromModel)
        .toList();
  }

  TextStyle _q(double size, {Color color = ink, double? height}) => TextStyle(
    fontFamily: 'Questrial',
    fontSize: size,
    color: color,
    height: height,
  );

  TextStyle _a(double size, {Color color = ink, double letterSpacing = 0}) =>
      TextStyle(
        fontFamily: 'Anonymous Pro',
        fontSize: size,
        color: color,
        letterSpacing: letterSpacing,
      );

  Widget _image(
    String file, {
    double? width,
    double? height,
    BoxFit fit = BoxFit.contain,
  }) => Image.asset(
    'assets/images/$file',
    width: width,
    height: height,
    fit: fit,
    errorBuilder: (_, __, ___) => SizedBox(
      width: width,
      height: height,
      child: const Center(
        child: Icon(Icons.image_not_supported_outlined, color: Colors.black26),
      ),
    ),
  );

  void _scrollToFooter() {
    final target = _footerKey.currentContext;
    if (target != null) {
      Scrollable.ensureVisible(
        target,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeInOut,
      );
    }
  }

  Widget _header(double s, double safeTop) => SizedBox(
    height: (122 - safeTop / s).clamp(66.0, 122.0) * s,
    child: Padding(
      padding: EdgeInsets.fromLTRB(22 * s, 0, 22 * s, 0),
      child: Row(
        children: [
          _image('eisai_logo.png', width: 112 * s, height: 40 * s),
          const Spacer(),
          Builder(
            builder: (context) => IconButton(
              tooltip: 'Open navigation',
              icon: Icon(Icons.menu, size: 24 * s, color: ink),
              onPressed: () {
                setState(() => _menuOpen = !_menuOpen);
              },
            ),
          ),
        ],
      ),
    ),
  );

  Widget _hero(double s) => SizedBox(
    height: 760 * s,
    child: Stack(
      fit: StackFit.expand,
      children: [
        _image('home_hero.png', fit: BoxFit.cover),
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0x10000000), Color(0x20000000), Color(0xD9000000)],
              stops: [0, .52, 1],
            ),
          ),
        ),
        Positioned(
          left: 24 * s,
          right: 24 * s,
          bottom: 53 * s,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('YOUR SHADE, YOUR WHISK.', style: _a(12 * s, color: lime)),
              SizedBox(height: 22 * s),
              Text(
                'Building a new\nmatcha experience\nin Orlando, Florida.',
                style: _q(29 * s, color: Colors.white, height: 1.04),
              ),
              SizedBox(height: 17 * s),
              Text(
                'Not all matcha tastes the same.',
                style: _q(16 * s, color: Colors.white),
              ),
              SizedBox(height: 26 * s),
              SizedBox(
                height: 49 * s,
                width: double.infinity,
                child: FilledButton(
                  onPressed: widget.onViewMenu,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: ink,
                    padding: EdgeInsets.zero,
                    shape: const RoundedRectangleBorder(),
                  ),
                  child: Text('See the menu →', style: _a(14 * s)),
                ),
              ),
              SizedBox(height: 14 * s),
              SizedBox(
                height: 49 * s,
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: widget.onGoLocation ?? _scrollToFooter,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.zero,
                    side: const BorderSide(color: Colors.white),
                    shape: const RoundedRectangleBorder(),
                  ),
                  child: Text(
                    'Find us this week',
                    style: _a(14 * s, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );

  Widget _story(double s) => SizedBox(
    height: 522 * s,
    child: Stack(
      children: [
        Positioned(
          top: 38 * s,
          left: 0,
          right: 0,
          child: Center(
            child: _image('monk_black.png', width: 68 * s, height: 82 * s),
          ),
        ),
        Positioned(
          top: 142 * s,
          left: 24 * s,
          right: 24 * s,
          child: Text(
            'OUR STORY',
            textAlign: TextAlign.center,
            style: _a(11 * s, color: const Color(0xFF555555)),
          ),
        ),
        Positioned(
          top: 176 * s,
          left: 24 * s,
          right: 24 * s,
          child: Text(
            'Two people. A whisk. A lot of\nopinions about matcha.',
            textAlign: TextAlign.center,
            style: _q(27 * s, height: 1.04),
          ),
        ),
        Positioned(
          top: 282 * s,
          left: 34 * s,
          right: 34 * s,
          child: Text(
            'We’re the two people behind Eisai. If you’ve visited one of our Orlando pop-ups, you’ve probably met us—with a whisk in hand and a growing collection of green stains.',
            textAlign: TextAlign.center,
            style: _q(15 * s, color: const Color(0xFF555555), height: 1.25),
          ),
        ),
        Positioned(
          top: 430 * s,
          left: 24 * s,
          right: 24 * s,
          child: InkWell(
            onTap: widget.onGoStory ?? scrollToStory,
            child: Text(
              'READ OUR STORY →',
              textAlign: TextAlign.center,
              style: _a(12 * s),
            ),
          ),
        ),
      ],
    ),
  );

  Widget _flavors(double s) => Padding(
    padding: EdgeInsets.fromLTRB(16 * s, 0, 16 * s, 48 * s),
    child: Column(
      children: [
        Text(
          'Matcha has more than one flavor.',
          textAlign: TextAlign.center,
          style: _q(30 * s, height: 35 / 30),
        ),
        SizedBox(height: 16 * s),
        Text(
          'In Asia matcha is chosen by cultivar, region, and flavor profile. In the U.S., most cafés offer just one option. We believe customers are ready for more.',
          textAlign: TextAlign.center,
          style: _q(16 * s, color: gray, height: 25 / 16),
        ),
        SizedBox(height: 25 * s),
        _flavor('Nutty', 'Roasted, warm notes', s),
        SizedBox(height: 18 * s),
        _flavor('Floral', 'Light, aromatic', s),
        SizedBox(height: 18 * s),
        _flavor('Umami', 'Savory, deep', s),
      ],
    ),
  );

  Widget _flavor(String name, String note, double s) => Column(
    children: [
      Text(name, style: _a(13 * s, letterSpacing: .08 * 13 * s)),
      SizedBox(height: 4 * s),
      Text(note, style: _q(15 * s, color: gray)),
    ],
  );

  Widget _drinkImage(_FeaturedDrink drink, double s) {
    Widget local = drink.assetName.isEmpty
        ? Icon(Icons.local_cafe_outlined, size: 70 * s, color: Colors.black26)
        : _image(drink.assetName, width: 128 * s, height: 216 * s);
    if (drink.imageUrl.trim().isNotEmpty) {
      return Image.network(
        drink.imageUrl,
        semanticLabel: drink.imageAlt.trim().isEmpty
            ? null
            : drink.imageAlt.trim(),
        excludeFromSemantics: drink.imageAlt.trim().isEmpty,
        width: 128 * s,
        height: 216 * s,
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => drink.imageAlt.trim().isEmpty
            ? ExcludeSemantics(child: local)
            : Semantics(
                label: drink.imageAlt.trim(),
                image: true,
                child: ExcludeSemantics(child: local),
              ),
      );
    }
    if (drink.imageAlt.trim().isNotEmpty) {
      return Semantics(
        label: drink.imageAlt.trim(),
        image: true,
        child: ExcludeSemantics(child: local),
      );
    }
    return ExcludeSemantics(child: local);
  }

  Widget _drinkCard(_FeaturedDrink drink, double s) => Padding(
    padding: EdgeInsets.only(bottom: 24 * s),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 300 * s,
          width: double.infinity,
          child: ColoredBox(
            color: lavender,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Positioned(
                  bottom: 40 * s,
                  child: Container(
                    width: 95 * s,
                    height: 12 * s,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(100),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.18),
                          blurRadius: 24 * s,
                          spreadRadius: 5 * s,
                          offset: Offset(0, 8 * s),
                        ),
                      ],
                    ),
                  ),
                ),
                Center(
                  child: Transform.scale(
                    scale: 1.85,
                    child: _drinkImage(drink, s),
                  ),
                ),
              ],
            ),
          ),
        ),
        SizedBox(height: 12 * s),
        Text(drink.name, style: _a(14 * s, letterSpacing: 1.12 * s)),
        if (drink.subtitle.isNotEmpty) ...[
          SizedBox(height: 4 * s),
          Text(drink.subtitle, style: _q(14 * s, color: gray)),
        ],
        SizedBox(height: 4 * s),
        Text(drink.description, style: _q(14 * s, color: gray, height: 1.5)),
      ],
    ),
  );

  Widget _specials(double s) => Padding(
    padding: EdgeInsets.fromLTRB(16 * s, 64 * s, 16 * s, 48 * s),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'On the menu now',
          style: _a(13 * s, color: gray, letterSpacing: 1.04 * s),
        ),
        SizedBox(height: 8 * s),
        Text('Eisai’s Special', style: _q(36 * s)),
        SizedBox(height: 8 * s),
        InkWell(
          onTap: widget.onViewMenu,
          child: Text(
            'See the full menu →',
            style: _a(14 * s, letterSpacing: 1.12 * s),
          ),
        ),
        SizedBox(height: 24 * s),
        FutureBuilder<List<_FeaturedDrink>>(
          future: _drinks,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return Padding(
                padding: EdgeInsets.all(50 * s),
                child: const Center(child: CircularProgressIndicator()),
              );
            }
            if (snapshot.hasError) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Featured drinks could not be loaded.',
                    style: _q(14 * s, color: gray),
                  ),
                  TextButton(
                    onPressed: _retryFeatured,
                    child: const Text('TRY AGAIN'),
                  ),
                ],
              );
            }
            final drinks = snapshot.data ?? [];
            if (drinks.isEmpty) {
              return Text(
                'No featured drinks right now.',
                style: _q(14 * s, color: gray),
              );
            }
            return Column(
              children: [for (final drink in drinks) _drinkCard(drink, s)],
            );
          },
        ),
      ],
    ),
  );

  Widget _popup(double s) {
    _popupCardExtent = 304 * s; // 292-wide card plus its 12-wide gap.
    return Padding(
      padding: EdgeInsets.only(top: 0, bottom: 65 * s),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 24 * s),
            child: Text('AT THE POP-UP', style: _a(12 * s)),
          ),
          SizedBox(height: 24 * s),
          SizedBox(
            height: 473 * s,
            child: ListView(
              controller: _popupScrollController,
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.only(left: 24 * s, right: 12 * s),
              children: [
                _popupCard(
                  s,
                  'VIDEO',
                  null,
                  'Eisai at the pop-up · Video 1',
                  video: 'assets/videos/eisai_video_1.mp4',
                  active: _activePopupCard == 0,
                ),
                _popupCard(
                  s,
                  'PHOTO',
                  'popup_photo.jpg',
                  'Eisai at the pop-up',
                ),
                _popupCard(
                  s,
                  'VIDEO',
                  null,
                  'Eisai at the pop-up · Video 2',
                  video: 'assets/videos/eisai_video_2.mp4',
                  active: _activePopupCard == 2,
                ),
                _popupCard(s, 'PHOTO', 'home_hero.png', 'Eisai matcha'),
                _popupCard(
                  s,
                  'VIDEO',
                  null,
                  'Eisai at the pop-up · Video 3',
                  video: 'assets/videos/eisai_video_3.mp4',
                  active: _activePopupCard == 4,
                ),
              ],
            ),
          ),
          SizedBox(height: 20 * s),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 24 * s),
            child: Text('Swipe to explore  →', style: _a(12 * s, color: gray)),
          ),
        ],
      ),
    );
  }

  Widget _popupCard(
    double s,
    String tag,
    String? image,
    String caption, {
    String? video,
    bool active = false,
  }) => Padding(
    padding: EdgeInsets.only(right: 12 * s),
    child: SizedBox(
      width: 292 * s,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 429 * s,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (video != null)
                  EisaiHomeVideoCard(
                    key: ValueKey(video),
                    assetPath: video,
                    active: active,
                    semanticLabel: caption,
                  )
                else if (image != null)
                  _image(image, fit: BoxFit.cover)
                else
                  const ColoredBox(color: ink),
                Positioned(
                  top: 10 * s,
                  left: 10 * s,
                  child: ColoredBox(
                    color: Colors.white,
                    child: Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: 6 * s,
                        vertical: 3 * s,
                      ),
                      child: Text(tag, style: _a(10 * s)),
                    ),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: 11 * s),
          Text(caption, style: _a(11 * s, color: gray)),
        ],
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final s = (constraints.maxWidth / 390).clamp(.75, 1.45).toDouble();

            final safeTop = MediaQuery.paddingOf(context).top;
            final headerHeight = (122 - safeTop / s).clamp(66.0, 122.0) * s;

            return Stack(
              children: [
                SingleChildScrollView(
                  child: Center(
                    child: SizedBox(
                      width: 390 * s,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _header(s, safeTop),
                          _hero(s),
                          KeyedSubtree(key: _storyKey, child: _story(s)),
                          _flavors(s),
                          _specials(s),
                          SizedBox(height: 24 * s),
                          _popup(s),
                          KeyedSubtree(
                            key: _footerKey,
                            child: EisaiFooter(scale: s),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (_menuOpen)
                  Positioned.fill(
                    top: headerHeight,
                    child: EisaiNavigationOverlay(
                      onClose: () {
                        setState(() => _menuOpen = false);
                      },
                      onHome: () {
                        setState(() => _menuOpen = false);
                      },
                      onDrinks: () {
                        setState(() => _menuOpen = false);
                        widget.onViewMenu();
                      },
                      onStory: () {
                        setState(() => _menuOpen = false);
                        if (widget.onGoStory != null) {
                          widget.onGoStory!();
                          return;
                        }
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          if (!mounted) return;
                          scrollToStory();
                        });
                      },
                      onLocation: () {
                        setState(() => _menuOpen = false);
                        if (widget.onGoLocation != null) {
                          widget.onGoLocation!();
                          return;
                        }
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          if (!mounted) return;
                          _scrollToFooter();
                        });
                      },
                      onAccount: () {
                        setState(() => _menuOpen = false);
                        widget.onGoAccount?.call();
                      },
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
