import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import '../models/menu_item.dart';

Future<List<MenuItem>> fetchMenu() async {
  final response = await http
      .get(Uri.parse('$apiUrl/menu'))
      .timeout(const Duration(seconds: 10));
  if (response.statusCode != 200) {
    throw Exception('Menu request failed (${response.statusCode})');
  }
  final body = jsonDecode(response.body) as Map<String, dynamic>;
  return (body['items'] as List<dynamic>)
      .map((item) => MenuItem.fromJson(item as Map<String, dynamic>))
      .toList();
}
