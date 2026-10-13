import 'package:flutter/material.dart';
import 'menu_api.dart';

void main() => runApp(const EisaiApp());

class EisaiApp extends StatelessWidget {
  const EisaiApp({super.key, this.loadMenu});
  final Future<List<MenuItem>> Function()? loadMenu;

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Eisai development',
    theme: ThemeData(colorSchemeSeed: const Color(0xff345b40)),
    home: MenuScreen(loadMenu: loadMenu ?? fetchMenu),
  );
}

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key, required this.loadMenu});
  final Future<List<MenuItem>> Function() loadMenu;
  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  late Future<List<MenuItem>> _menu;
  @override
  void initState() {
    super.initState();
    _menu = widget.loadMenu();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Eisai Studio · Development')),
    body: Padding(
      padding: const EdgeInsets.all(20),
      child: FutureBuilder<List<MenuItem>>(
        future: _menu,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Column(
              children: [
                const Text(
                  'Cannot reach the API. Check services and API_BASE_URL.',
                ),
                TextButton(
                  onPressed: () => setState(() {
                    _menu = widget.loadMenu();
                  }),
                  child: const Text('Retry'),
                ),
              ],
            );
          }
          final items = snapshot.data!;
          return ListView(
            children: [
              const Text('Development samples, not the approved client menu.'),
              if (items.isEmpty)
                const Text(
                  'Connected. Run npm run db:seed to load sample data.',
                ),
              ...items.map(
                (item) => ListTile(
                  title: Text(item.name),
                  subtitle: Text(item.description),
                  trailing: Text(
                    '\$${(item.priceCents / 100).toStringAsFixed(2)}',
                  ),
                ),
              ),
            ],
          );
        },
      ),
    ),
  );
}
