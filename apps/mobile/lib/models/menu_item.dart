class MenuItem {
  const MenuItem({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    this.category = 'Drinks',
    this.imageUrl = '',
    this.teaBases = const [],
    this.isRecommended = false,
    this.isFeatured = false,
    this.isSeasonal = false,
    this.isAvailable = true,
  });

  final String id;
  final String name;
  final String description;
  final double price;

  final String category;
  final String imageUrl;
  final List<String> teaBases;

  final bool isRecommended;
  final bool isFeatured;
  final bool isSeasonal;
  final bool isAvailable;

  factory MenuItem.fromJson(Map<String, dynamic> json) {
    return MenuItem(
      id: json['_id'] as String,
      name: json['name'] as String,
      description: (json['description'] ?? '') as String,
      price: (json['price'] as num).toDouble(),
      category: (json['category'] ?? 'Drinks') as String,
      imageUrl: (json['imageUrl'] ?? '') as String,
      teaBases: (json['teaBases'] as List<dynamic>? ?? [])
          .map((base) => base.toString())
          .toList(),
      isRecommended: (json['isRecommended'] ?? false) as bool,
      isFeatured: (json['isFeatured'] ?? false) as bool,
      isSeasonal: (json['isSeasonal'] ?? false) as bool,
      isAvailable: (json['isAvailable'] ?? true) as bool,
    );
  }
}
