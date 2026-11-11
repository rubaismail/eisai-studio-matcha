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

  test('editing a drink with no tea base preserves empty teaBases', () async {
    final client = MockClient((request) async {
      if (request.method == 'GET') {
        expect(request.url.path, '/api/menu/admin/menu');

        return http.Response(
          jsonEncode({
            'items': [
              {
                '_id': 'treat123',
                'name': 'Strawberry Treat',
                'description': 'Strawberry cream',
                'price': 6.50,
                'category': 'Treats',
                'teaBases': <String>[],
                'isAvailable': true,
              },
            ],
          }),
          200,
        );
      }

      if (request.method == 'PUT') {
        expect(request.url.path, '/api/menu/treat123');

        final body = jsonDecode(request.body) as Map<String, dynamic>;

        expect(body['teaBases'], isEmpty);
        expect(body['category'], 'Treats');

        return http.Response(
          jsonEncode({
            'item': {'_id': 'treat123', ...body},
          }),
          200,
        );
      }

      fail('Unexpected request: ${request.method} ${request.url}');
    });

    final repo = HttpStaffMenuRepository(
      baseUrl: 'https://api.eisaistudio.com/api',
      getToken: () async => 'secure-token',
      client: client,
    );

    final drinks = await repo.listDrinks();
    final original = drinks.single;

    expect(original.base, 'None');
    expect(original.teaBases, isEmpty);

    final saved = await repo.saveDrink(original, isNew: false);

    expect(saved.base, 'None');
    expect(saved.teaBases, isEmpty);
  });

  test('hiding a drink updates only isAvailable', () async {
    final client = MockClient((request) async {
      expect(request.method, 'PUT');
      expect(request.url.path, '/api/menu/treat123');
      expect(request.headers['Authorization'], 'Bearer secure-token');

      final body = jsonDecode(request.body) as Map<String, dynamic>;

      expect(body, {'isAvailable': false});

      return http.Response(
        jsonEncode({
          'item': {
            '_id': 'treat123',
            'name': 'Strawberry Treat',
            'description': 'Strawberry cream',
            'price': 6.50,
            'category': 'Treats',
            'teaBases': <String>[],
            'isAvailable': false,
          },
        }),
        200,
      );
    });

    final repo = HttpStaffMenuRepository(
      baseUrl: 'https://api.eisaistudio.com/api',
      getToken: () async => 'secure-token',
      client: client,
    );

    final updated = await repo.updateDrinkFields('treat123', {
      'isAvailable': false,
    });

    expect(updated.onMenu, false);
    expect(updated.teaBases, isEmpty);
  });
}
