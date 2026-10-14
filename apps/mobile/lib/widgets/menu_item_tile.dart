import 'package:flutter/material.dart';
import '../models/menu_item.dart';

class MenuItemTile extends StatelessWidget {
  const MenuItemTile({super.key, required this.item});
  final MenuItem item;

  @override
  Widget build(BuildContext context) => ListTile(
    title: Text(item.name),
    subtitle: item.description.isEmpty ? null : Text(item.description),
    trailing: Text('\$${item.price.toStringAsFixed(2)}'),
  );
}
