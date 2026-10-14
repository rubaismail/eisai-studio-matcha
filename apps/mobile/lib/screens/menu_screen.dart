import 'package:flutter/material.dart';
import '../models/menu_item.dart';
import '../services/menu_service.dart';
import '../widgets/menu_item_tile.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key, this.loadMenu = fetchMenu});

  // Tests pass a fake loader here instead of calling the real API.
  final Future<List<MenuItem>> Function() loadMenu;

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  late Future<List<MenuItem>> _menu = widget.loadMenu();

  void _retry() => setState(() => _menu = widget.loadMenu());

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Menu')),
    body: FutureBuilder<List<MenuItem>>(
      future: _menu,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text("Couldn't load the menu. Is the API running?"),
                TextButton(onPressed: _retry, child: const Text('Retry')),
              ],
            ),
          );
        }
        final items = snapshot.data!;
        if (items.isEmpty) {
          return const Center(child: Text('No items yet.'));
        }
        return ListView(
          children: [for (final item in items) MenuItemTile(item: item)],
        );
      },
    ),
  );
}
