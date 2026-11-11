import 'package:flutter/material.dart';
import '../../services/staff_menu_repository.dart';
import '../../widgets/eisai_staff_ui.dart';

class StaffStateScreen extends StatelessWidget {
  const StaffStateScreen({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.description,
    required this.primaryLabel,
    required this.onPrimary,
    required this.onLogout,
    required this.onStaffMenu,
    this.secondaryLabel,
    this.onSecondary,
    this.caption,
    this.publicMenuUrl,
    this.logoAsset,
  });
  final String eyebrow, title, description, primaryLabel;
  final String? secondaryLabel, caption, logoAsset;
  final VoidCallback onPrimary, onLogout, onStaffMenu;
  final VoidCallback? onSecondary;
  final Uri? publicMenuUrl;
  @override
  Widget build(BuildContext context) => StaffChrome(
    onLogout: onLogout,
    onMenu: onStaffMenu,
    publicMenuUrl: publicMenuUrl,
    logoAsset: logoAsset,
    body: StaffBody(
      padding: const EdgeInsets.fromLTRB(24, 128, 24, 24),
      children: [
        Text(
          eyebrow,
          style: staffText(12, mono: true, color: StaffColors.muted),
        ),
        const SizedBox(height: 28),
        Container(height: 3, color: StaffColors.ink),
        const SizedBox(height: 75),
        Text(title, style: staffText(30)),
        const SizedBox(height: 24),
        Text(
          description,
          style: staffText(16, color: StaffColors.muted, height: 1.5),
        ),
        const SizedBox(height: 52),
        StaffPrimaryButton(label: primaryLabel, onPressed: onPrimary),
        if (secondaryLabel != null) ...[
          const SizedBox(height: 14),
          StaffPrimaryButton(
            label: secondaryLabel!,
            outline: true,
            onPressed: onSecondary,
          ),
        ],
        if (caption != null) ...[
          const SizedBox(height: 36),
          Text(
            caption!,
            style: staffText(13, mono: true, color: StaffColors.muted),
          ),
        ],
      ],
    ),
  );
}

class StaffAccessDeniedScreen extends StatelessWidget {
  const StaffAccessDeniedScreen({
    super.key,
    required this.onLogout,
    required this.onStaffMenu,
    this.publicMenuUrl,
    this.logoAsset,
  });
  final VoidCallback onLogout, onStaffMenu;
  final Uri? publicMenuUrl;
  final String? logoAsset;
  @override
  Widget build(BuildContext context) => StaffStateScreen(
    eyebrow: 'STAFF / ACCESS CONTROL',
    title: 'Access denied',
    description:
        'This account does not have permission to manage the Eisai menu.\n\nSign in with an authorized staff account, or return to the public menu.',
    primaryLabel: 'Back to the public menu',
    onPrimary: () => openEisaiWebsite(publicMenuUrl),
    secondaryLabel: 'Sign in with another account',
    onSecondary: onLogout,
    caption: 'Staff access is controlled by the server.',
    onLogout: onLogout,
    onStaffMenu: onStaffMenu,
    logoAsset: logoAsset,
    publicMenuUrl: publicMenuUrl,
  );
}

class StaffSessionExpiredScreen extends StatelessWidget {
  const StaffSessionExpiredScreen({
    super.key,
    required this.onLogin,
    required this.onStaffMenu,
    this.publicMenuUrl,
    this.logoAsset,
  });
  final VoidCallback onLogin, onStaffMenu;
  final Uri? publicMenuUrl;
  final String? logoAsset;
  @override
  Widget build(BuildContext context) => StaffStateScreen(
    eyebrow: 'STAFF / SESSION',
    title: 'Session expired',
    description:
        'For security, your staff session has ended. Sign in again to continue managing the menu.',
    primaryLabel: 'Sign in again',
    onPrimary: onLogin,
    secondaryLabel: 'View public menu',
    onSecondary: () => openEisaiWebsite(publicMenuUrl),
    caption: 'You’ll need to sign in before making staff changes.',
    onLogout: onLogin,
    onStaffMenu: onStaffMenu,
    publicMenuUrl: publicMenuUrl,
    logoAsset: logoAsset,
  );
}

class StaffSaveSuccessScreen extends StatelessWidget {
  const StaffSaveSuccessScreen({
    super.key,
    required this.drink,
    required this.onBack,
    required this.onLogout,
    required this.onStaffMenu,
    this.publicMenuUrl,
    this.logoAsset,
  });
  final StaffDrink drink;
  final VoidCallback onBack, onLogout, onStaffMenu;
  final Uri? publicMenuUrl;
  final String? logoAsset;
  @override
  Widget build(BuildContext context) => StaffChrome(
    onLogout: onLogout,
    onMenu: onStaffMenu,
    publicMenuUrl: publicMenuUrl,
    logoAsset: logoAsset,
    body: StaffBody(
      children: [
        const StaffSectionHeader(title: 'Menu', subtitle: 'Changes saved'),
        const SizedBox(height: 34),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          color: const Color(0xFFEAF4EC),
          child: Text(
            '✓   Changes saved successfully.\n    ${drink.name} was updated.',
            style: staffText(14, mono: true, color: const Color(0xFF356C43)),
          ),
        ),
        const SizedBox(height: 40),
        Text(drink.name, style: staffText(22)),
        const SizedBox(height: 12),
        Text(
          '${drink.base} / ${drink.ingredients}',
          style: staffText(14, color: StaffColors.muted),
        ),
        const SizedBox(height: 22),
        Wrap(
          spacing: 14,
          children: [
            _Chip(value: drink.onMenu, label: 'On menu'),
            _Chip(value: drink.recommended, label: 'Recommended'),
            _Chip(value: drink.onHome, label: 'On home'),
          ],
        ),
        const SizedBox(height: 42),
        StaffPrimaryButton(label: 'Back to menu', onPressed: onBack),
      ],
    ),
  );
}

class _Chip extends StatelessWidget {
  const _Chip({required this.value, required this.label});
  final bool value;
  final String label;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(
        value ? Icons.check_box : Icons.check_box_outline_blank,
        size: 20,
        color: StaffColors.ink,
      ),
      const SizedBox(width: 6),
      Text(label.toUpperCase(), style: staffText(12, mono: true)),
    ],
  );
}

Future<StaffDeleteAction?> showStaffDeleteConfirmation(
  BuildContext context,
  String name,
) => showModalBottomSheet<StaffDeleteAction>(
  context: context,
  isScrollControlled: true,
  backgroundColor: Colors.white,
  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
  builder: (ctx) => SafeArea(
    top: false,
    child: Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('DELETE DRINK', style: staffText(13, mono: true)),
          const SizedBox(height: 16),
          Text('Delete $name?', style: staffText(30)),
          const SizedBox(height: 20),
          Text(
            'This removes the drink from the menu for good. If you only want it off the menu for now, hide it instead.',
            style: staffText(15, color: StaffColors.muted, height: 1.5),
          ),
          const SizedBox(height: 20),
          StaffPrimaryButton(
            label: 'Delete for good',
            onPressed: () => Navigator.pop(ctx, StaffDeleteAction.delete),
          ),
          const SizedBox(height: 16),
          StaffPrimaryButton(
            label: 'Hide instead',
            outline: true,
            onPressed: () => Navigator.pop(ctx, StaffDeleteAction.hide),
          ),
          const SizedBox(height: 16),
          StaffPrimaryButton(
            label: 'Cancel',
            outline: true,
            onPressed: () => Navigator.pop(ctx, StaffDeleteAction.cancel),
          ),
        ],
      ),
    ),
  ),
);

enum StaffDeleteAction { delete, hide, cancel }
