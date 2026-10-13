import 'dart:convert';
import 'package:http/http.dart' as http;

class MenuItem {
  const MenuItem({
    required this.name,
    required this.description,
    required this.priceCents,
  });
  final String name;
  final String description;
  final int priceCents;

  factory MenuItem.fromJson(Map<String, dynamic> json) => MenuItem(
    name: json['name'] as String,
    description: json['description'] as String,
    priceCents: json['priceCents'] as int,
  );
}

Future<List<MenuItem>> fetchMenu() async {
  const base = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:4000/api',
  );
  final uri = Uri.base.resolve('${base.replaceFirst(RegExp(r'/$'), '')}/menu');
  final response = await http.get(uri).timeout(const Duration(seconds: 10));
  if (response.statusCode != 200) throw Exception('Menu request failed');
  final body = jsonDecode(response.body) as Map<String, dynamic>;
  return (body['items'] as List<dynamic>)
      .map((item) => MenuItem.fromJson(item as Map<String, dynamic>))
      .toList();
}
