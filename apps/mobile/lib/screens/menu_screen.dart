import 'package:flutter/material.dart';
import '../models/menu_item.dart';
import '../services/menu_service.dart' as menu_service;
import '../widgets/eisai_navigation_overlay.dart';
import '../widgets/eisai_footer.dart';
import 'drink_details_screen.dart';
import '../widgets/eisai_home_logo.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({
    super.key,
    this.onGoHome,
    this.onGoStory,
    this.onGoLocation,
    this.onGoProducts,
    this.onGoAccount,
    this.fetchMenu,
  });

  final VoidCallback? onGoHome;
  final VoidCallback? onGoStory;
  final VoidCallback? onGoLocation;
  final VoidCallback? onGoProducts;
  final VoidCallback? onGoAccount;
  final Future<List<MenuItem>> Function()? fetchMenu;

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _Drink {
  const _Drink({
    required this.name,
    required this.description,
    this.imageUrl = '',
    this.imageAlt = '',
    this.inspiredBy = '',
    this.asset = '',
    this.price,
    this.category = 'Drinks',
    this.teaBases = const [],
    this.isSeasonal = false,
    this.isRecommended = false,
    this.isFeatured = false,
    this.isAvailable = true,
    this.matcha = true,
    this.hojicha = false,
  });

  final String name;
  final String description;
  final String subtitle = '';
  final String imageUrl;
  final String imageAlt;
  final String inspiredBy;
  final String asset;
  final double? price;
  final String category;
  final List<String> teaBases;
  final bool isSeasonal;
  final bool isRecommended;
  final bool isFeatured;
  final bool isAvailable;
  final bool matcha;
  final bool hojicha;

  static String _assetFor(String name) {
    switch (name.toLowerCase().trim()) {
      case 'golden hour':
        return 'golden_hour.png';

      case 'mango dango':
        return 'mango_dango.png';

      case 'tokyo rose':
        return 'rose.png';

      case 'toasted coconut':
        return 'toasted_coconut.png';

      case 'kyoto fog':
        return 'kyoto_fog.png';

      case 'okinawa breeze':
        return 'okinawa_breeze.png';

      default:
        return '';
    }
  }

  factory _Drink.fromModel(MenuItem item) {
    final bases = item.teaBases
        .map((base) => base.toLowerCase().trim())
        .toSet();

    return _Drink(
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
      inspiredBy: item.inspiredBy,
      asset: _assetFor(item.name),
      price: item.price,
      category: item.category,
      teaBases: bases.toList(),
      isSeasonal: item.isSeasonal,
      isRecommended: item.isRecommended,
      isFeatured: item.isFeatured,
      isAvailable: item.isAvailable,
      matcha: bases.contains('matcha'),
      hojicha: bases.contains('hojicha'),
    );
  }
}

class _MenuScreenState extends State<MenuScreen> {
  static const _ink = Color(0xFF202020);
  static const _muted = Color(0xFF5F5F5F);
  static const _lavender = Color(0xFFEEF0FF);
  static const _dark = Color(0xFF191919);

  late Future<List<_Drink>> _drinksFuture;
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  bool _menuOpen = false;
  String _filter = 'ALL';

  @override
  void initState() {
    super.initState();
    _drinksFuture = _loadDrinks();
  }

  @override
  void didUpdateWidget(covariant MenuScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.fetchMenu != widget.fetchMenu) {
      _drinksFuture = _loadDrinks();
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<List<_Drink>> _loadDrinks() async {
    if (widget.fetchMenu != null) {
      final items = await widget.fetchMenu!();
      return items.where((e) => e.isAvailable).map(_Drink.fromModel).toList();
    }

    final items = await menu_service.fetchMenu();
    return items
        .where((item) => item.isAvailable)
        .map(_Drink.fromModel)
        .toList();
  }

  void _retry() {
    setState(() {
      _drinksFuture = _loadDrinks();
    });
  }

  void _clearFilters() {
    setState(() {
      _searchController.clear();
      _filter = 'ALL';
    });
  }

  TextStyle _q(
    double size, {
    Color color = _ink,
    double? height,
    FontWeight? weight,
  }) => TextStyle(
    fontFamily: 'Questrial',
    fontSize: size,
    height: height,
    color: color,
    fontWeight: weight,
  );

  TextStyle _a(double size, {Color color = _ink}) => TextStyle(
    fontFamily: 'Anonymous Pro',
    fontSize: size,
    color: color,
    letterSpacing: .3,
  );

  Widget _asset(
    String name, {
    double? width,
    double? height,
    BoxFit fit = BoxFit.contain,
  }) {
    return Image.asset(
      'assets/images/$name',
      excludeFromSemantics: true,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (_, __, ___) =>
          Icon(Icons.local_cafe_outlined, size: 50, color: _muted),
    );
  }

  Widget _header(double s) => SizedBox(
    height: 122 * s,
    child: Stack(
      children: [
        Positioned(
          top: 64 * s,
          left: 14 * s,
          child: EisaiHomeLogo(
            assetPath: 'assets/images/eisai_logo.png',
            width: 112 * s,
            height: 29 * s,
            scale: s,
            onTap: () {
              setState(() => _menuOpen = false);
              widget.onGoHome?.call();
            },
          ),
        ),
        Positioned(
          top: 67 * s,
          right: 16 * s,
          child: IconButton(
            onPressed: () => setState(() => _menuOpen = !_menuOpen),
            icon: Icon(
              _menuOpen ? Icons.close : Icons.menu,
              color: _ink,
              size: 24 * s,
            ),
            tooltip: _menuOpen ? 'Close navigation' : 'Open navigation',
          ),
        ),
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(height: 1, color: const Color(0xFFEEEEEE)),
        ),
      ],
    ),
  );

  Widget _classic(double s) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20 * s),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(height: 36 * s),
          Text('THE MENU', style: _a(12 * s, color: _muted)),
          SizedBox(height: 19 * s),
          Text('Our drinks.', style: _q(49 * s)),
          SizedBox(height: 24 * s),
          Text(
            'Every customer has a different palate.\n'
            'Every matcha has a different character.',
            style: _q(16 * s, color: const Color(0xFF505050)),
          ),
          SizedBox(height: 32 * s),
          _line(),
          SizedBox(height: 28 * s),
          Text('EISAI’S CLASSIC', style: _a(12 * s, color: _muted)),
          SizedBox(height: 17 * s),
          Text('Matcha · Latte or Clear', style: _q(24 * s)),
          SizedBox(height: 14 * s),
          Text(
            'Choose Chiyo Midori, Yugen, or Shun Midori. '
            'Each blend is available as a clear matcha or a matcha latte.',
            style: _q(14 * s, color: _muted, height: 1.5),
          ),
          SizedBox(height: 18 * s),
          Container(
            height: 228 * s,
            width: double.infinity,
            color: _lavender,
            child: Center(
              child: _asset(
                'matcha_latte.png',
                width: 200 * s,
                height: 205 * s,
              ),
            ),
          ),
          SizedBox(height: 47 * s),
          _blend('Chiyo Midori', 'Floral, Pistachio, Spring blossom, Honey', s),
          _blend('Yugen', 'Sweet Cream Butter, Walnut, Barley', s),
          _blend('Shun Midori', 'Mellow Umami, Creamy, Pistachio', s),
          SizedBox(height: 35 * s),
          Text('EISAI’S CLASSIC', style: _a(11 * s, color: _muted)),
          SizedBox(height: 12 * s),
          Text('Hojicha · Latte or Clear', style: _q(24 * s)),
          SizedBox(height: 14 * s),
          Text(
            'One roasted hojicha blend: Tokusen. '
            'Enjoy it clear or as a hojicha latte.',
            style: _q(14 * s, color: _muted, height: 1.5),
          ),
          SizedBox(height: 20 * s),
          Container(
            width: double.infinity,
            height: 224 * s,
            color: _lavender,
            child: Center(
              child: _asset(
                'hojicha_latte.png',
                width: 200 * s,
                height: 205 * s,
              ),
            ),
          ),
          SizedBox(height: 19 * s),
          Text('HOJICHA LATTE', style: _a(11 * s, color: _muted)),
          SizedBox(height: 8 * s),
          Text('Tokusen', style: _q(21 * s)),
          SizedBox(height: 8 * s),
          Text('Bold, Earthy, Toasty', style: _q(14 * s, color: _muted)),
          SizedBox(height: 37 * s),
          _line(),
        ],
      ),
    );
  }

  Widget _line() =>
      const Divider(thickness: 1, height: 1, color: Color(0xFFD5D5D5));

  Widget _blend(String title, String profile, double s) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _line(),
      SizedBox(height: 13 * s),
      Text(title, style: _q(21 * s)),
      SizedBox(height: 9 * s),
      Text(profile, style: _q(14 * s, color: _muted)),
      SizedBox(height: 34 * s),
    ],
  );

  Widget _filterButton(String type, String label, int count, double s) {
    final selected = _filter == type;
    return OutlinedButton(
      onPressed: () => setState(() => _filter = type),
      style: OutlinedButton.styleFrom(
        backgroundColor: selected ? _ink : Colors.white,
        foregroundColor: selected ? Colors.white : _ink,
        side: const BorderSide(color: Color(0xFFD9D9D9)),
        shape: const RoundedRectangleBorder(),
        minimumSize: Size(0, 39 * s),
        padding: EdgeInsets.symmetric(horizontal: 12 * s),
      ),
      child: Text(
        '$label ($count)',
        style: _a(11 * s, color: selected ? Colors.white : _ink),
      ),
    );
  }

  List<_Drink> _filtered(List<_Drink> drinks) {
    var result = drinks.where((d) {
      if (_filter == 'MATCHA') return d.matcha;
      if (_filter == 'HOJICHA') return d.hojicha;
      if (_filter == 'RECOMMENDED') return d.isRecommended;
      return true;
    });
    final query = _searchController.text.trim().toLowerCase();
    if (query.isNotEmpty) {
      result = result.where(
        (d) =>
            d.name.toLowerCase().contains(query) ||
            d.description.toLowerCase().contains(query) ||
            d.subtitle.toLowerCase().contains(query),
      );
    }
    return result.toList();
  }

  Widget _gridSection(List<_Drink> drinks, double s) {
    final displayed = _filtered(drinks);
    final matchaCount = drinks.where((d) => d.matcha).length;
    final hojichaCount = drinks.where((d) => d.hojicha).length;
    final recommendedCount = drinks.where((d) => d.isRecommended).length;
    return Padding(
      padding: EdgeInsets.fromLTRB(20 * s, 32 * s, 20 * s, 95 * s),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 7 * s,
            runSpacing: 8 * s,
            children: [
              _filterButton('ALL', 'ALL', drinks.length, s),
              _filterButton('MATCHA', 'MATCHA', matchaCount, s),
              _filterButton('HOJICHA', 'HOJICHA', hojichaCount, s),
              _filterButton('RECOMMENDED', 'RECOMMENDED', recommendedCount, s),
            ],
          ),
          SizedBox(height: 18 * s),
          Text('SEARCH DRINKS', style: _a(12 * s, color: _muted)),
          SizedBox(height: 12 * s),
          SizedBox(
            height: 54 * s,
            child: TextField(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
              style: _q(14 * s),
              decoration: InputDecoration(
                hintText: 'e.g. strawberry matcha',
                hintStyle: _q(14 * s, color: _muted),
                prefixIcon: Icon(Icons.search, size: 19 * s),
                filled: true,
                fillColor: Colors.white,
                contentPadding: EdgeInsets.zero,
                enabledBorder: const OutlineInputBorder(
                  borderRadius: BorderRadius.zero,
                  borderSide: BorderSide(color: Color(0xFFD6D6D6)),
                ),
                focusedBorder: const OutlineInputBorder(
                  borderRadius: BorderRadius.zero,
                  borderSide: BorderSide(color: _ink),
                ),
              ),
            ),
          ),
          SizedBox(height: 22 * s),
          Text('${displayed.length} DRINKS', style: _a(12 * s, color: _muted)),
          SizedBox(height: 34 * s),
          if (displayed.isEmpty)
            _noMatchesState(s)
          else
            LayoutBuilder(
              builder: (context, c) {
                final cardWidth = (c.maxWidth - 10 * s) / 2;
                return Wrap(
                  spacing: 10 * s,
                  runSpacing: 42 * s,
                  children: displayed
                      .map(
                        (d) =>
                            SizedBox(width: cardWidth, child: _drinkCard(d, s)),
                      )
                      .toList(),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _drinkCard(_Drink drink, double s) => InkWell(
    onTap: () => _drinkDetails(drink),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 194 * s,
          width: double.infinity,
          child: Stack(
            children: [
              Positioned.fill(child: Container(color: _lavender)),
              Positioned.fill(
                child: Padding(
                  padding: EdgeInsets.all(5 * s),
                  child: _drinkImage(drink),
                ),
              ),
              if (drink.isRecommended)
                Positioned(
                  left: 7 * s,
                  top: 9 * s,
                  child: Container(
                    color: _dark,
                    padding: EdgeInsets.symmetric(
                      horizontal: 5 * s,
                      vertical: 3 * s,
                    ),
                    child: Text(
                      'RECOMMENDED',
                      style: _a(10 * s, color: Colors.white),
                    ),
                  ),
                ),
            ],
          ),
        ),
        SizedBox(height: 10 * s),
        Row(
          children: [
            Expanded(
              child: Text(
                drink.name.toUpperCase(),
                maxLines: 2,
                style: _a(12 * s),
              ),
            ),
            Icon(Icons.add, size: 18 * s),
          ],
        ),
        if (drink.subtitle.isNotEmpty) ...[
          SizedBox(height: 8 * s),
          Text(drink.subtitle, style: _q(13 * s, color: _muted)),
        ],
        SizedBox(height: 7 * s),
        Text(drink.description, style: _q(12 * s, color: _muted, height: 1.35)),
      ],
    ),
  );

  Widget _drinkImage(_Drink d) {
    if (d.imageUrl.trim().isNotEmpty) {
      return Image.network(
        d.imageUrl,
        fit: BoxFit.contain,
        semanticLabel: d.imageAlt.trim().isEmpty ? null : d.imageAlt.trim(),
        excludeFromSemantics: d.imageAlt.trim().isEmpty,
        errorBuilder: (_, __, ___) => _localDrinkImage(d),
      );
    }
    return _localDrinkImage(d);
  }

  Widget _localDrinkImage(_Drink d) {
    if (d.asset.isNotEmpty) {
      return Image.asset(
        'assets/images/${d.asset}',
        fit: BoxFit.contain,
        semanticLabel: d.imageAlt.trim().isEmpty ? null : d.imageAlt.trim(),
        excludeFromSemantics: d.imageAlt.trim().isEmpty,
        errorBuilder: (_, __, ___) =>
            const Center(child: Icon(Icons.local_cafe_outlined, size: 54)),
      );
    }
    return const Center(
      child: Icon(
        Icons.local_cafe_outlined,
        size: 65,
        color: Color(0xFF9792CC),
      ),
    );
  }

  void _drinkDetails(_Drink d) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => DrinkDetailsScreen(
          name: d.name,
          description: d.description,
          asset: d.asset,
          imageUrl: d.imageUrl,
          imageAlt: d.imageAlt,
          inspiredBy: d.inspiredBy,
          onGoHome: widget.onGoHome,
          onGoStory: widget.onGoStory,
          onGoLocation: widget.onGoLocation,
          onGoProducts: widget.onGoProducts,
          onGoAccount: widget.onGoAccount,
        ),
      ),
    );
  }

  Widget _noMatchesState(double s) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text('No matches found.', style: _q(30 * s)),
      SizedBox(height: 18 * s),
      Text(
        'We couldn’t find any drinks matching your search.',
        style: _q(16 * s, color: _muted, height: 1.45),
      ),
      SizedBox(height: 30 * s),
      Container(
        width: double.infinity,
        constraints: BoxConstraints(minHeight: 140 * s),
        padding: EdgeInsets.fromLTRB(20 * s, 29 * s, 20 * s, 20 * s),
        decoration: BoxDecoration(
          color: const Color(0xFFF7F7FC),
          border: Border.all(color: const Color(0xFFD1D1D1), width: 1),
        ),
        child: Column(
          children: [
            Text(
              'NO DRINKS FOUND',
              style: _a(14 * s),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 24 * s),
            Text(
              'Try another flavor or clear your filters.',
              style: _q(15 * s, color: _muted),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
      SizedBox(height: 55 * s),
      SizedBox(
        width: double.infinity,
        height: 52 * s,
        child: OutlinedButton(
          onPressed: _clearFilters,
          style: OutlinedButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: _ink,
            side: const BorderSide(color: _ink, width: 1),
            padding: EdgeInsets.zero,
            shape: const RoundedRectangleBorder(),
          ),
          child: Text('CLEAR FILTERS', style: _a(14 * s)),
        ),
      ),
    ],
  );

  Widget _skeletonBox(
    double width,
    double height, {
    bool titleBar = false,
    bool searchBar = false,
  }) => Container(
    width: width,
    height: height,
    decoration: BoxDecoration(
      color: titleBar ? const Color(0xFFE0E6FF) : const Color(0xFFF7F7FC),
      border: titleBar
          ? null
          : Border.all(color: const Color(0xFFD1D1D1), width: 1),
      borderRadius: BorderRadius.circular(searchBar ? 0 : (titleBar ? 4 : 5)),
    ),
  );

  Widget _loadingState(double s) => Padding(
    padding: EdgeInsets.fromLTRB(24 * s, 49 * s, 24 * s, 35 * s),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('OUR DRINKS', style: _a(12 * s, color: _muted)),
        SizedBox(height: 29 * s),
        Text('Our drinks.', style: _q(34 * s)),
        SizedBox(height: 30 * s),
        Text(
          'Find your next favorite matcha.',
          style: _q(16 * s, color: const Color(0xFF6B6B6B)),
        ),
        SizedBox(height: 87 * s),
        Semantics(
          label: 'Loading menu search',
          child: _skeletonBox(double.infinity, 50 * s, searchBar: true),
        ),
        SizedBox(height: 36 * s),
        Wrap(
          spacing: 12 * s,
          runSpacing: 25 * s,
          children: [
            for (var i = 0; i < 4; i++)
              SizedBox(
                width: 165 * s,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _skeletonBox(165 * s, 140 * s),
                    SizedBox(height: 11 * s),
                    _skeletonBox(114 * s, 9 * s, titleBar: true),
                  ],
                ),
              ),
          ],
        ),
        SizedBox(height: 23 * s),
        Center(
          child: Text(
            'LOADING THE MENU…',
            style: _a(12 * s, color: const Color(0xFF6B6B6B)),
          ),
        ),
      ],
    ),
  );

  Widget _errorState(double s) => Padding(
    padding: EdgeInsets.fromLTRB(24 * s, 49 * s, 24 * s, 90 * s),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('OUR DRINKS', style: _a(12 * s, color: _muted)),
        SizedBox(height: 29 * s),
        Text(
          'Couldn’t load the menu.',
          style: _q(39 * s, color: const Color(0xFF1F1F1F), height: 1.03),
        ),
        SizedBox(height: 19 * s),
        Text(
          'There was a problem getting the latest drinks.',
          style: _q(16 * s, color: const Color(0xFF6B6B6B)),
        ),
        SizedBox(height: 87 * s),
        Container(
          width: double.infinity,
          height: 132 * s,
          alignment: Alignment.center,
          padding: EdgeInsets.symmetric(horizontal: 21 * s),
          decoration: BoxDecoration(
            color: const Color(0xFFF7F7FC),
            border: Border.all(color: const Color(0xFFD1D1D1), width: 1),
          ),
          child: Text(
            'Your connection may be interrupted. Please try again.',
            style: _q(16 * s, color: const Color(0xFF6B6B6B), height: 1.4),
            textAlign: TextAlign.center,
          ),
        ),
        SizedBox(height: 49 * s),
        SizedBox(
          width: double.infinity,
          height: 52 * s,
          child: FilledButton(
            onPressed: _retry,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF1F1F1F),
              foregroundColor: Colors.white,
              padding: EdgeInsets.zero,
              shape: const RoundedRectangleBorder(),
            ),
            child: Text('TRY AGAIN ↻', style: _a(14 * s, color: Colors.white)),
          ),
        ),
      ],
    ),
  );

  Widget _emptyMenuState(double s) => Padding(
    padding: EdgeInsets.fromLTRB(24 * s, 49 * s, 24 * s, 80 * s),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('OUR DRINKS', style: _a(12 * s, color: _muted)),
        SizedBox(height: 29 * s),
        Text('Our drinks.', style: _q(34 * s)),
        SizedBox(height: 42 * s),
        Text('No items yet.', style: _q(20 * s)),
      ],
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
            return Stack(
              children: [
                SingleChildScrollView(
                  controller: _scrollController,
                  child: Center(
                    child: SizedBox(
                      width: 390 * s,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _header(s),
                          FutureBuilder<List<_Drink>>(
                            future: _drinksFuture,
                            builder: (context, snap) {
                              if (snap.connectionState !=
                                      ConnectionState.done &&
                                  !snap.hasData) {
                                return _loadingState(s);
                              }
                              if (snap.hasError) return _errorState(s);
                              final drinks = snap.data ?? const <_Drink>[];
                              if (drinks.isEmpty) return _emptyMenuState(s);
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  _classic(s),
                                  _gridSection(drinks, s),
                                  EisaiFooter(scale: s),
                                ],
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (_menuOpen)
                  Positioned.fill(
                    top: 122 * s,
                    child: EisaiNavigationOverlay(
                      onClose: () => setState(() => _menuOpen = false),
                      onHome: () {
                        setState(() => _menuOpen = false);
                        widget.onGoHome?.call();
                      },
                      onDrinks: () => setState(() => _menuOpen = false),
                      onStory: () {
                        setState(() => _menuOpen = false);
                        widget.onGoStory?.call();
                      },
                      onLocation: () {
                        setState(() => _menuOpen = false);
                        widget.onGoLocation?.call();
                      },
                      onProducts: () {
                        setState(() => _menuOpen = false);
                        widget.onGoProducts?.call();
                      },
                      onAccount: widget.onGoAccount == null
                          ? null
                          : () {
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
