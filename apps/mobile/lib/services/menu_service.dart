import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/menu_item.dart';

/// allows HTTP tests to run without a live backend.
Future<List<MenuItem>> fetchMenu({http.Client? client}) async {
  final ownsClient = client == null;
  final requestClient = client ?? http.Client();
  try {
    final response = await requestClient
        .get(Uri.parse('$apiUrl/menu'))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode != 200) {
      throw Exception('Menu request failed (${response.statusCode})');
    }
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return (body['items'] as List<dynamic>)
        .map((item) => MenuItem.fromJson(item as Map<String, dynamic>))
        .toList();
  } finally {
    if (ownsClient) requestClient.close();
  }
}
