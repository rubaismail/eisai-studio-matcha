import 'package:flutter/material.dart';
import '../../services/staff_menu_repository.dart';
import '../../widgets/eisai_staff_ui.dart';
import 'staff_drink_form_screen.dart';
import 'staff_status_screens.dart';

class StaffMenuEditorScreen extends StatefulWidget {
  const StaffMenuEditorScreen({
    super.key,
    required this.repository,
    required this.onLogout,
    required this.onStaffMenu,
    this.publicMenuUrl,
    this.logoAsset,
    this.onPickPhoto,
  });
  final StaffMenuRepository repository;
  final VoidCallback onLogout, onStaffMenu;
  final Uri? publicMenuUrl;
  final String? logoAsset;
  final StaffPhotoPicker? onPickPhoto;
  @override
  State<StaffMenuEditorScreen> createState() => _StaffMenuEditorScreenState();
}

class _StaffMenuEditorScreenState extends State<StaffMenuEditorScreen> {
  List<StaffDrink>? drinks;
  Object? loadError;
  bool loading = true;
  final Set<String> _pendingDrinkIds = {};
  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() {
      loading = true;
      loadError = null;
    });
    try {
      final items = await widget.repository.listDrinks();
      if (mounted) {
        setState(() {
          drinks = items;
          loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          loadError = e;
          loading = false;
        });
      }
    }
  }

  void _navigate(Widget screen) => Navigator.of(context)
      .push(MaterialPageRoute<void>(builder: (_) => screen))
      .then((_) => _refresh());
  void _form([StaffDrink? drink]) => _navigate(
    StaffDrinkFormScreen(
      repository: widget.repository,
      drink: drink,
      onLogout: widget.onLogout,
      onStaffMenu: widget.onStaffMenu,
      publicMenuUrl: widget.publicMenuUrl,
      logoAsset: widget.logoAsset,
      onPickPhoto: widget.onPickPhoto,
    ),
  );

  Future<void> _toggle(StaffDrink drink, String field, bool value) async {
    if (_pendingDrinkIds.contains(drink.id)) return;

    final updated = drink.copyWith(
      onMenu: field == 'isAvailable' ? value : null,
      recommended: field == 'isRecommended' ? value : null,
      onHome: field == 'isFeatured' ? value : null,
    );

    setState(() {
      _pendingDrinkIds.add(drink.id);

      drinks = drinks!
          .map((item) => item.id == drink.id ? updated : item)
          .toList();
    });

    try {
      final saved = await widget.repository.updateDrinkFields(drink.id, {
        field: value,
      });

      if (!mounted) return;

      setState(() {
        drinks = drinks!
            .map((item) => item.id == drink.id ? saved : item)
            .toList();

        _pendingDrinkIds.remove(drink.id);
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        drinks = drinks!
            .map((item) => item.id == drink.id ? drink : item)
            .toList();

        _pendingDrinkIds.remove(drink.id);
      });

      final authorizationScreen = _authorizationScreen(error);

      if (authorizationScreen != null) {
        _navigate(authorizationScreen);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Changes couldn’t be saved: $error')),
        );
      }
    }
  }

  Widget? _authorizationScreen(Object? error) {
    if (error is! StaffMenuException) {
      return null;
    }

    if (error.statusCode == 401) {
      return StaffSessionExpiredScreen(
        onLogin: widget.onLogout,
        onStaffMenu: widget.onStaffMenu,
        publicMenuUrl: widget.publicMenuUrl,
        logoAsset: widget.logoAsset,
      );
    }

    if (error.statusCode == 403) {
      return StaffAccessDeniedScreen(
        onLogout: widget.onLogout,
        onStaffMenu: widget.onStaffMenu,
        publicMenuUrl: widget.publicMenuUrl,
        logoAsset: widget.logoAsset,
      );
    }

    return null;
  }

  @override
  Widget build(BuildContext context) {
    final authorizationScreen = _authorizationScreen(loadError);

    if (authorizationScreen != null) {
      return authorizationScreen;
    }

    final data = drinks ?? const <StaffDrink>[];
    final onMenu = data.where((e) => e.onMenu).length;
    final onHome = data.where((e) => e.onHome).length;
    return StaffChrome(
      onLogout: widget.onLogout,
      onMenu: widget.onStaffMenu,
      publicMenuUrl: widget.publicMenuUrl,
      logoAsset: widget.logoAsset,
      body: StaffBody(
        children: [
          StaffSectionHeader(
            title: 'Menu',
            subtitle: loading
                ? 'Loading the menu…'
                : '${data.length} drinks · $onMenu on the menu · $onHome on home',
          ),
          const SizedBox(height: 20),
          StaffPrimaryButton(label: '+ Add a drink', onPressed: () => _form()),
          const SizedBox(height: 20),
          if (loading)
            const _StaffSkeleton()
          else if (loadError != null)
            Column(
              children: [
                const StaffAlert(
                  message:
                      'We couldn’t load the menu right now. Check your connection and try again.',
                ),
                const SizedBox(height: 20),
                StaffPrimaryButton(label: 'Try again →', onPressed: _refresh),
              ],
            )
          else if (data.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 60),
              child: Column(
                children: [
                  Text('No drinks yet.', style: staffText(26)),
                  const SizedBox(height: 15),
                  Text(
                    'Add your first drink to start the menu. It shows on the public menu as soon as you enable it.',
                    textAlign: TextAlign.center,
                    style: staffText(15, color: StaffColors.muted),
                  ),
                ],
              ),
            )
          else ...[
            const Divider(color: StaffColors.ink, height: 1),
            ...data.map(
              (d) => _DrinkRow(
                drink: d,
                onEdit: () => _form(d),
                busy: _pendingDrinkIds.contains(d.id),
                onMenuChanged: (v) => _toggle(d, 'isAvailable', v),
                onRecommendedChanged: (v) => _toggle(d, 'isRecommended', v),
                onHomeChanged: (v) => _toggle(d, 'isFeatured', v),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Hiding a drink takes it off the public menu without deleting it, so it’s easy to bring back next season.',
              style: staffText(14, height: 1.45, color: StaffColors.muted),
            ),
          ],
        ],
      ),
    );
  }
}

class _DrinkRow extends StatelessWidget {
  const _DrinkRow({
    required this.drink,
    required this.onEdit,
    required this.onMenuChanged,
    required this.onRecommendedChanged,
    required this.onHomeChanged,
    this.busy = false,
  });
  final StaffDrink drink;
  final VoidCallback onEdit;
  final bool busy;
  final ValueChanged<bool> onMenuChanged, onRecommendedChanged, onHomeChanged;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 16),
    decoration: const BoxDecoration(
      border: Border(bottom: BorderSide(color: StaffColors.line)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              height: 70,
              width: 56,
              color: StaffColors.panel,
              padding: const EdgeInsets.all(6),
              child: drink.imageUrl == null
                  ? const Icon(
                      Icons.local_cafe_outlined,
                      color: StaffColors.muted,
                      size: 28,
                    )
                  : Image.network(
                      drink.imageUrl!,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) =>
                          const Icon(Icons.image_not_supported_outlined),
                    ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          drink.name,
                          style: staffText(22, letterSpacing: -.22),
                        ),
                      ),
                      if (!drink.onMenu) ...[
                        const SizedBox(width: 8),
                        Text(
                          'HIDDEN',
                          style: staffText(
                            11,
                            mono: true,
                            color: StaffColors.muted,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${drink.base} / ${drink.ingredients}',
                    style: staffText(
                      13,
                      color: StaffColors.muted,
                      height: 18 / 13,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 10),
        IgnorePointer(
          ignoring: busy,
          child: Opacity(
            opacity: busy ? 0.5 : 1.0,
            child: Wrap(
              spacing: 14,
              runSpacing: 0,
              children: [
                StaffCheck(
                  text: 'On menu',
                  value: drink.onMenu,
                  onChanged: onMenuChanged,
                ),
                StaffCheck(
                  text: 'Recommended',
                  value: drink.recommended,
                  onChanged: onRecommendedChanged,
                ),
                StaffCheck(
                  text: 'On home',
                  value: drink.onHome,
                  onChanged: onHomeChanged,
                ),
              ],
            ),
          ),
        ),
        StaffPrimaryButton(
          label: 'Edit',
          outline: true,
          onPressed: busy ? null : onEdit,
        ),
      ],
    ),
  );
}

class _StaffSkeleton extends StatelessWidget {
  const _StaffSkeleton();
  @override
  Widget build(BuildContext context) => Column(
    children: [
      for (int i = 0; i < 3; i++)
        Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: StaffColors.line)),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Container(width: 56, height: 70, color: StaffColors.panel),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          height: 20,
                          width: 190,
                          color: StaffColors.panel,
                        ),
                        const SizedBox(height: 12),
                        Container(
                          height: 15,
                          width: 240,
                          color: StaffColors.panel,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Container(height: 20, color: StaffColors.panel),
            ],
          ),
        ),
    ],
  );
}
