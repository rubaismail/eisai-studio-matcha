import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:eisai_mobile/services/staff_menu_repository.dart';

void main() {
  test('API model serializes expected menu metadata fields', () {
    final drink = StaffDrink(
      id: '',
      name: 'Golden Hour',
      price: 6.50,
      base: 'Matcha or Hojicha',
      ingredients: 'Banana milk',
      onMenu: true,
      recommended: true,
      onHome: true,
    );
    final json = drink.toJson();
    expect(json['teaBases'], ['matcha', 'hojicha']);
    expect(json['description'], 'Banana milk');
    expect(json['isAvailable'], true);
    expect(json['isFeatured'], true);
    expect(json.containsKey('onHome'), false);
    expect(json.containsKey('ingredients'), false);
    expect(json.containsKey('inspiredBy'), true);
    expect(json['inspiredBy'], '');
    expect(json.containsKey('imageAlt'), true);
    expect(json['imageAlt'], '');
  });

  test('admin listing requires JWT and reads items envelope', () async {
    final client = MockClient((request) async {
      expect(request.method, 'GET');
      expect(request.url.path, '/api/menu/admin/menu');
      expect(request.headers['Authorization'], 'Bearer secure-token');
      return http.Response(
        jsonEncode({
          'items': [
            {
              '_id': 'abc123',
              'name': 'Mango Dango',
              'description': 'Mango puree',
              'price': 6.5,
              'teaBases': ['matcha'],
              'isAvailable': false,
            },
          ],
        }),
        200,
      );
    });
    final repo = HttpStaffMenuRepository(
      baseUrl: 'https://api.eisaistudio.com/api',
      getToken: () async => 'secure-token',
      client: client,
    );
    final drinks = await repo.listDrinks();
    expect(drinks.single.id, 'abc123');
    expect(drinks.single.onMenu, false);
  });

  test('protected 403 remains distinguishable from expired 401', () async {
    final repo = HttpStaffMenuRepository(
      baseUrl: 'https://api.eisaistudio.com/api',
      getToken: () async => 'customer-token',
      client: MockClient(
        (_) async => http.Response('{"error":"Admin only"}', 403),
      ),
    );
    await expectLater(
      repo.listDrinks(),
      throwsA(
        isA<StaffMenuException>().having(
          (e) => e.statusCode,
          'statusCode',
          403,
        ),
      ),
    );
  });
}
