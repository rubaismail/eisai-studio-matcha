import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../models/staff_drink.dart';
export '../models/staff_drink.dart';

class StaffMenuException implements Exception {
  const StaffMenuException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
  @override
  String toString() => message;
}

abstract class StaffMenuRepository {
  Future<List<StaffDrink>> listDrinks();
  Future<StaffDrink> saveDrink(StaffDrink drink, {required bool isNew});
  Future<void> deleteDrink(String drinkId);
  Future<StaffDrink> updateDrinkFields(
    String drinkId,
    Map<String, dynamic> changes,
  );
  Future<String> uploadPhoto(List<int> bytes, String filename);
}

class HttpStaffMenuRepository implements StaffMenuRepository {
  HttpStaffMenuRepository({
    required this.baseUrl,
    required this.getToken,
    http.Client? client,
  }) : _client = client ?? http.Client();
  final String baseUrl;
  final Future<String?> Function() getToken;
  final http.Client _client;

  Uri _uri(String path) =>
      Uri.parse('${baseUrl.replaceFirst(RegExp(r"/$"), "")}$path');

  Future<Map<String, String>> _headers() async {
    final token = await getToken();
    if (token == null || token.isEmpty) {
      throw const StaffMenuException(
        'Session expired. Please sign in.',
        statusCode: 401,
      );
    }
    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
  }

  dynamic _parse(http.Response response) {
    dynamic parsed;

    try {
      parsed = response.body.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(response.body);
    } catch (_) {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw StaffMenuException(
          'Request failed (${response.statusCode}).',
          statusCode: response.statusCode,
        );
      }

      throw const StaffMenuException('Unexpected server response.');
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = parsed is Map && parsed['error'] is String
          ? parsed['error'] as String
          : 'Request failed (${response.statusCode}).';

      throw StaffMenuException(message, statusCode: response.statusCode);
    }

    return parsed;
  }

  @override
  Future<List<StaffDrink>> listDrinks() async {
    final result = _parse(
      await _client.get(_uri('/menu/admin/menu'), headers: await _headers()),
    );
    if (result is! Map || result['items'] is! List) {
      throw const StaffMenuException('Unexpected menu response.');
    }
    return (result['items'] as List)
        .map((v) => StaffDrink.fromJson(Map<String, dynamic>.from(v as Map)))
        .toList();
  }

  @override
  Future<StaffDrink> saveDrink(StaffDrink drink, {required bool isNew}) async {
    final headers = await _headers();
    final path = isNew ? '/menu' : '/menu/${Uri.encodeComponent(drink.id)}';
    final body = jsonEncode(drink.toJson());
    final response = isNew
        ? await _client.post(_uri(path), headers: headers, body: body)
        : await _client.put(_uri(path), headers: headers, body: body);
    final parsed = _parse(response);
    if (parsed is! Map || parsed['item'] is! Map) {
      throw const StaffMenuException('Unexpected saved item response.');
    }
    return StaffDrink.fromJson(
      Map<String, dynamic>.from(parsed['item'] as Map),
    );
  }

  @override
  Future<StaffDrink> updateDrinkFields(
    String drinkId,
    Map<String, dynamic> changes,
  ) async {
    const allowedFields = {'isAvailable', 'isRecommended', 'isFeatured'};

    if (changes.isEmpty ||
        changes.keys.any((key) => !allowedFields.contains(key)) ||
        changes.values.any((value) => value is! bool)) {
      throw const StaffMenuException('Invalid menu toggle update.');
    }

    final response = await _client.put(
      _uri('/menu/${Uri.encodeComponent(drinkId)}'),
      headers: await _headers(),
      body: jsonEncode(changes),
    );

    final parsed = _parse(response);

    if (parsed is! Map || parsed['item'] is! Map) {
      throw const StaffMenuException('Unexpected updated item response.');
    }

    return StaffDrink.fromJson(
      Map<String, dynamic>.from(parsed['item'] as Map),
    );
  }

  @override
  Future<void> deleteDrink(String drinkId) async {
    _parse(
      await _client.delete(
        _uri('/menu/${Uri.encodeComponent(drinkId)}'),
        headers: await _headers(),
      ),
    );
  }

  @override
  Future<String> uploadPhoto(List<int> bytes, String filename) async {
    final headers = await _headers();
    final lowerName = filename.toLowerCase();
    final subtype = lowerName.endsWith('.png')
        ? 'png'
        : lowerName.endsWith('.webp')
        ? 'webp'
        : (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg'))
        ? 'jpeg'
        : null;
    if (subtype == null) {
      throw const StaffMenuException('Use a JPG, PNG, or WebP image.');
    }
    if (bytes.length > 5 * 1024 * 1024) {
      throw const StaffMenuException(
        'Image exceeds the 5 MB limit.',
        statusCode: 413,
      );
    }
    final request = http.MultipartRequest('POST', _uri('/uploads'))
      ..headers['Authorization'] = headers['Authorization']!
      ..files.add(
        http.MultipartFile.fromBytes(
          'image',
          bytes,
          filename: filename,
          contentType: MediaType('image', subtype),
        ),
      );
    final response = await http.Response.fromStream(
      await _client.send(request),
    );
    final parsed = _parse(response);
    if (parsed is! Map ||
        parsed['imageUrl'] is! String ||
        (parsed['imageUrl'] as String).isEmpty) {
      throw const StaffMenuException('Upload response missing imageUrl.');
    }
    return parsed['imageUrl'] as String;
  }
}

class PreviewStaffMenuRepository implements StaffMenuRepository {
  final List<StaffDrink> _items = [
    const StaffDrink(
      id: 'golden-hour',
      name: 'Golden Hour',
      base: 'Matcha or Hojicha',
      inspiredBy: 'Banana bread',
      ingredients: 'Eisai’s banana milk / Banana sea salt Foam',
      onMenu: true,
      recommended: true,
      onHome: true,
    ),
    const StaffDrink(
      id: 'mango-dango',
      name: 'Mango Dango',
      base: 'Matcha',
      inspiredBy: 'Mango sticky rice',
      ingredients: 'Mango puree / Whole milk / Coconut sauce',
      onMenu: true,
      recommended: true,
      onHome: true,
    ),
    const StaffDrink(
      id: 'tokyo-rose',
      name: 'Tokyo Rose',
      base: 'Matcha or Hojicha',
      ingredients: 'Whole milk / Housemade rose syrup',
      onMenu: true,
      onHome: true,
    ),
    const StaffDrink(
      id: 'toasted-coconut',
      name: 'Toasted Coconut',
      base: 'Matcha or Hojicha',
      ingredients: 'Eisai’s toasted coconut milk / Toasted coconut Foam',
      onMenu: true,
      recommended: true,
    ),
    const StaffDrink(
      id: 'kyoto-fog',
      name: 'Kyoto Fog',
      base: 'Matcha',
      ingredients: 'Whole milk / Housemade earl grey syrup / Earl grey foam',
      onMenu: true,
    ),
    const StaffDrink(
      id: 'okinawa-breeze',
      name: 'Okinawa Breeze',
      base: 'Matcha',
      ingredients: 'Coconut Water / Agave syrup',
      onMenu: false,
    ),
  ];

  @override
  Future<StaffDrink> updateDrinkFields(
    String drinkId,
    Map<String, dynamic> changes,
  ) async {
    final index = _items.indexWhere((item) => item.id == drinkId);

    if (index == -1) {
      throw const StaffMenuException('Drink not found.', statusCode: 404);
    }

    const allowedFields = {'isAvailable', 'isRecommended', 'isFeatured'};

    if (changes.isEmpty ||
        changes.keys.any((key) => !allowedFields.contains(key)) ||
        changes.values.any((value) => value is! bool)) {
      throw const StaffMenuException('Invalid menu toggle update.');
    }

    final original = _items[index];

    final updated = original.copyWith(
      onMenu: changes['isAvailable'] as bool? ?? original.onMenu,
      recommended: changes['isRecommended'] as bool? ?? original.recommended,
      onHome: changes['isFeatured'] as bool? ?? original.onHome,
    );

    _items[index] = updated;

    return updated;
  }

  @override
  Future<List<StaffDrink>> listDrinks() async => List.of(_items);
  @override
  Future<StaffDrink> saveDrink(StaffDrink d, {required bool isNew}) async {
    final item = isNew
        ? StaffDrink(
            id: DateTime.now().microsecondsSinceEpoch.toString(),
            name: d.name,
            inspiredBy: d.inspiredBy,
            base: d.base,
            ingredients: d.ingredients,
            price: d.price,
            imageUrl: d.imageUrl,
            altText: d.altText,
            onMenu: d.onMenu,
            recommended: d.recommended,
            onHome: d.onHome,
            seasonal: d.seasonal,
          )
        : d;
    _items.removeWhere((e) => e.id == item.id);
    _items.add(item);
    return item;
  }

  @override
  Future<void> deleteDrink(String id) async =>
      _items.removeWhere((e) => e.id == id);
  @override
  Future<String> uploadPhoto(List<int> bytes, String filename) async =>
      'https://example.invalid/preview/$filename';
}
