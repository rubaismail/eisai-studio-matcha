// Must match the API response for GET /api/menu (see SwaggerHub).
class MenuItem {
  const MenuItem({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    this.isSeasonal = false,
  });

  final String id;
  final String name;
  final String description;
  final double price;
  final bool isSeasonal;

  factory MenuItem.fromJson(Map<String, dynamic> json) => MenuItem(
    id: json['_id'] as String,
    name: json['name'] as String,
    description: (json['description'] ?? '') as String,
    price: (json['price'] as num).toDouble(),
    isSeasonal: (json['isSeasonal'] ?? false) as bool,
  );
}
