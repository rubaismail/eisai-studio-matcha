class StaffDrink {
  const StaffDrink({
    required this.id,
    required this.name,
    this.inspiredBy = '',
    this.base = 'Matcha',
    this.ingredients = '',
    this.category = 'Drinks',
    this.price = 0,
    this.imageUrl,
    this.altText = '',
    this.onMenu = true,
    this.recommended = false,
    this.onHome = false,
    this.seasonal = false,
  });
  final String id, name, inspiredBy, base, ingredients, category, altText;
  final double price;
  final String? imageUrl;
  final bool onMenu, recommended, onHome, seasonal;

  List<String> get teaBases {
    final normalized = base.toLowerCase();
    return [
      if (normalized.contains('matcha')) 'matcha',
      if (normalized.contains('hojicha')) 'hojicha',
    ];
  }

  StaffDrink copyWith({
    String? name,
    String? inspiredBy,
    String? base,
    String? ingredients,
    String? category,
    double? price,
    String? imageUrl,
    String? altText,
    bool? onMenu,
    bool? recommended,
    bool? onHome,
    bool? seasonal,
  }) => StaffDrink(
    id: id,
    name: name ?? this.name,
    inspiredBy: inspiredBy ?? this.inspiredBy,
    base: base ?? this.base,
    ingredients: ingredients ?? this.ingredients,
    category: category ?? this.category,
    price: price ?? this.price,
    imageUrl: imageUrl ?? this.imageUrl,
    altText: altText ?? this.altText,
    onMenu: onMenu ?? this.onMenu,
    recommended: recommended ?? this.recommended,
    onHome: onHome ?? this.onHome,
    seasonal: seasonal ?? this.seasonal,
  );

  factory StaffDrink.fromJson(Map<String, dynamic> json) {
    final rawBases = json['teaBases'];
    final bases = rawBases is List
        ? rawBases.map((e) => e.toString().toLowerCase()).toList()
        : <String>[];
    final base = bases.contains('matcha') && bases.contains('hojicha')
        ? 'Matcha or Hojicha'
        : bases.contains('hojicha')
        ? 'Hojicha'
        : 'Matcha';
    return StaffDrink(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      inspiredBy: (json['inspiredBy'] ?? '').toString(),
      base: base,
      ingredients: (json['description'] ?? '').toString(),
      category: (json['category'] ?? 'Drinks').toString(),
      price: (json['price'] as num?)?.toDouble() ?? 0,
      imageUrl: json['imageUrl']?.toString(),
      altText: (json['imageAlt'] ?? '').toString(),
      onMenu: json['isAvailable'] == true,
      recommended: json['isRecommended'] == true,
      onHome: json['isFeatured'] == true,
      seasonal: json['isSeasonal'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'description': ingredients,
    'price': price,
    'category': category,
    'imageUrl': imageUrl ?? '',
    'inspiredBy': inspiredBy,
    'imageAlt': altText,
    'teaBases': teaBases,
    'isRecommended': recommended,
    'isFeatured': onHome,
    'isSeasonal': seasonal,
    'isAvailable': onMenu,
  };
}
