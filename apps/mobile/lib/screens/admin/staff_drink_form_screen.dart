import 'package:flutter/material.dart';
import '../../services/staff_menu_repository.dart';
import '../../widgets/eisai_staff_ui.dart';
import 'staff_status_screens.dart';

typedef StaffPhotoPicker = Future<StaffPickedPhoto?> Function();

class StaffPickedPhoto {
  const StaffPickedPhoto({required this.filename, required this.bytes});
  final String filename;
  final List<int> bytes;
}

class StaffDrinkFormScreen extends StatefulWidget {
  const StaffDrinkFormScreen({
    super.key,
    required this.repository,
    required this.onLogout,
    required this.onStaffMenu,
    this.drink,
    this.publicMenuUrl,
    this.logoAsset,
    this.onPickPhoto,
  });
  final StaffMenuRepository repository;
  final StaffDrink? drink;
  final VoidCallback onLogout, onStaffMenu;
  final Uri? publicMenuUrl;
  final String? logoAsset;
  final StaffPhotoPicker? onPickPhoto;
  @override
  State<StaffDrinkFormScreen> createState() => _StaffDrinkFormScreenState();
}

class _StaffDrinkFormScreenState extends State<StaffDrinkFormScreen> {
  late final TextEditingController name,
      inspired,
      ingredients,
      category,
      price,
      altText;
  late String base;
  late bool onMenu, recommended, onHome, seasonal;
  StaffPickedPhoto? photo;
  String? _uploadedImageUrl;
  bool isSaving = false;
  bool validation = false;
  late final String _originalFormState;
  bool _allowExit = false;
  String? saveError, uploadError;
  @override
  void initState() {
    super.initState();
    final d = widget.drink;
    name = TextEditingController(text: d?.name ?? '');
    inspired = TextEditingController(text: d?.inspiredBy ?? '');
    ingredients = TextEditingController(text: d?.ingredients ?? '');
    category = TextEditingController(text: d?.category ?? 'Drinks');
    price = TextEditingController(
      text: d?.price == null || d!.price == 0 ? '' : d.price.toStringAsFixed(2),
    );
    altText = TextEditingController(text: d?.altText ?? '');
    base = d?.base ?? 'None';
    onMenu = d?.onMenu ?? true;
    recommended = d?.recommended ?? false;
    onHome = d?.onHome ?? false;
    seasonal = d?.seasonal ?? false;
    _originalFormState = _formState;
  }

  String get _formState => [
    name.text,
    inspired.text,
    ingredients.text,
    category.text,
    price.text,
    altText.text,
    base,
    onMenu.toString(),
    recommended.toString(),
    onHome.toString(),
    seasonal.toString(),
    photo == null ? 'no-new-photo' : photo!.filename,
  ].join('\u0000');

  bool get _hasUnsavedChanges => _formState != _originalFormState;

  @override
  void dispose() {
    for (final c in [name, inspired, ingredients, category, price, altText]) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _valid =>
      name.text.trim().isNotEmpty &&
      (double.tryParse(price.text.trim()) ?? -1) >= 0 &&
      ingredients.text.trim().isNotEmpty &&
      category.text.trim().isNotEmpty &&
      ((photo == null && (widget.drink?.imageUrl?.isNotEmpty != true)) ||
          altText.text.trim().isNotEmpty);
  void _set(VoidCallback change) {
    setState(change);
  }

  Future<void> _pick() async {
    if (widget.onPickPhoto == null) {
      setState(
        () => uploadError =
            'Connect a device photo picker in the app integration.',
      );
      return;
    }
    StaffPickedPhoto? p;
    try {
      p = await widget.onPickPhoto!();
    } catch (error) {
      if (!mounted) return;
      setState(() => uploadError = 'Could not select photo. Please try again.');
      return;
    }
    if (p == null || !mounted) return;
    final ext = p.filename.toLowerCase();
    if (!(ext.endsWith('.png') ||
            ext.endsWith('.jpg') ||
            ext.endsWith('.jpeg') ||
            ext.endsWith('.webp')) ||
        p.bytes.length > 5 * 1024 * 1024) {
      setState(() => uploadError = 'Use a JPG, PNG, or WebP image under 5 MB.');
      return;
    }
    setState(() {
      photo = p;
      _uploadedImageUrl = null;
      uploadError = null;
    });
  }

  Future<void> _save() async {
    setState(() {
      validation = true;
      saveError = null;
    });
    if (!_valid) return;
    setState(() => isSaving = true);
    try {
      if (photo != null && _uploadedImageUrl == null) {
        try {
          _uploadedImageUrl = await widget.repository.uploadPhoto(
            photo!.bytes,
            photo!.filename,
          );
        } catch (e) {
          if (mounted) {
            setState(() => uploadError = 'Retry or choose another photo.');
          }
          return;
        }
      }
      final updated = StaffDrink(
        id: widget.drink?.id ?? '',
        name: name.text.trim(),
        inspiredBy: inspired.text.trim(),
        base: base,
        ingredients: ingredients.text.trim(),
        category: category.text.trim(),
        price: double.parse(price.text.trim()),
        altText: altText.text.trim(),
        imageUrl: _uploadedImageUrl ?? widget.drink?.imageUrl,
        onMenu: onMenu,
        recommended: recommended,
        onHome: onHome,
        seasonal: seasonal,
      );
      final saved = await widget.repository.saveDrink(
        updated,
        isNew: widget.drink == null,
      );
      if (!mounted) return;
      await Navigator.push<void>(
        context,
        MaterialPageRoute(
          builder: (_) => StaffSaveSuccessScreen(
            drink: saved,
            onBack: () => Navigator.pop(context),
            onLogout: widget.onLogout,
            onStaffMenu: widget.onStaffMenu,
            publicMenuUrl: widget.publicMenuUrl,
            logoAsset: widget.logoAsset,
          ),
        ),
      );
      if (mounted) {
        setState(() => _allowExit = true);
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) setState(() => saveError = e.toString());
    } finally {
      if (mounted) setState(() => isSaving = false);
    }
  }

  Future<void> _delete() async {
    final d = widget.drink;
    if (d == null) return;
    final action = await showStaffDeleteConfirmation(context, d.name);
    if (action == null || action == StaffDeleteAction.cancel) return;
    setState(() => isSaving = true);
    try {
      if (action == StaffDeleteAction.delete) {
        await widget.repository.deleteDrink(d.id);
      }
      if (action == StaffDeleteAction.hide) {
        await widget.repository.updateDrinkFields(d.id, {'isAvailable': false});
      }
      if (mounted) {
        setState(() => _allowExit = true);
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) setState(() => saveError = e.toString());
    } finally {
      if (mounted) setState(() => isSaving = false);
    }
  }

  Future<bool> _confirmDiscardChanges() async {
    if (_allowExit) return true;

    if (isSaving) return false;

    if (!_hasUnsavedChanges) return true;

    final discard = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Discard changes?'),
        content: const Text(
          'You have unsaved changes to this drink. '
          'If you leave now, those changes will be lost.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Keep editing'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Discard changes'),
          ),
        ],
      ),
    );

    return mounted && discard == true;
  }

  Future<void> _requestExit() async {
    if (!await _confirmDiscardChanges()) return;
    if (!mounted) return;

    setState(() => _allowExit = true);
    Navigator.of(context).pop();
  }

  Future<void> _confirmAndNavigate(VoidCallback action) async {
    if (!await _confirmDiscardChanges() || !mounted) return;
    setState(() => _allowExit = true);
    action();
  }

  @override
  Widget build(BuildContext context) {
    final isNew = widget.drink == null;

    return PopScope(
      canPop: _allowExit,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          _requestExit();
        }
      },
      child: StaffChrome(
        onLogout: () => _confirmAndNavigate(widget.onLogout),
        onMenu: () => _confirmAndNavigate(widget.onStaffMenu),
        onHome: () => _confirmAndNavigate(
          () => openStaffHome(
            context,
            removeUntil: (route) =>
                route.settings.name == '/staff' || route.isFirst,
          ),
        ),
        publicMenuUrl: widget.publicMenuUrl,
        logoAsset: widget.logoAsset,
        body: StaffBody(
          children: [
            InkWell(
              onTap: _requestExit,
              child: Text(
                '← BACK TO THE LIST',
                style: staffText(
                  12,
                  mono: true,
                  letterSpacing: .96,
                  color: StaffColors.ink,
                ).copyWith(decoration: TextDecoration.underline),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              isNew ? 'NEW DRINK' : 'EDITING',
              style: staffText(
                13,
                mono: true,
                color: StaffColors.muted,
                letterSpacing: 1.04,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              isNew ? 'Add a drink' : widget.drink!.name,
              style: staffText(36, letterSpacing: -.72),
            ),
            const SizedBox(height: 6),
            Text(
              'Fields marked * are required.',
              style: staffText(14, color: StaffColors.muted),
            ),
            if (saveError != null) ...[
              const SizedBox(height: 20),
              StaffAlert(
                message:
                    'Changes couldn’t be saved. Your entries are still here. Check your connection and try again.\n$saveError',
              ),
            ],
            const SizedBox(height: 20),
            StaffField(
              label: 'Drink name *',
              controller: name,
              hint: 'e.g. Matcha Blossom Trail',
              error: validation && name.text.trim().isEmpty
                  ? 'Give the drink a name so customers can order it.'
                  : null,
            ),
            const SizedBox(height: 20),
            StaffField(
              label: 'Inspired by (optional)',
              controller: inspired,
              hint: 'e.g. Banana bread',
            ),
            const SizedBox(height: 20),
            StaffField(
              label: 'Category *',
              controller: category,
              hint: 'Drinks',
              error: validation && category.text.trim().isEmpty
                  ? 'Enter a category, like Drinks.'
                  : null,
            ),
            const SizedBox(height: 20),
            Text('BASE', style: staffText(13, mono: true, letterSpacing: 1.04)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: base,
              decoration: const InputDecoration(
                contentPadding: EdgeInsets.symmetric(horizontal: 14),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.zero,
                  borderSide: BorderSide(color: StaffColors.ink),
                ),
              ),
              items: ['None', 'Matcha', 'Hojicha', 'Matcha or Hojicha']
                  .map(
                    (v) => DropdownMenuItem(
                      value: v,
                      child: Text(v, style: staffText(16)),
                    ),
                  )
                  .toList(),
              onChanged: (v) {
                if (v != null) _set(() => base = v);
              },
            ),
            const SizedBox(height: 20),
            StaffField(
              label: 'Price *',
              controller: price,
              hint: '0.00',
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              helper: 'Not shown on the public menu for now.',
              error:
                  validation && (double.tryParse(price.text.trim()) ?? -1) < 0
                  ? 'Enter a price, like 6.50.'
                  : null,
            ),
            const SizedBox(height: 20),
            StaffField(
              label: 'What’s in it',
              controller: ingredients,
              maxLines: 3,
              hint: 'e.g. Whole milk / Montblanc foam',
              helper:
                  'Separate ingredients with a slash ( / ), like the printed menu.',
              error: validation && ingredients.text.trim().isEmpty
                  ? 'Please describe the drink ingredients.'
                  : null,
            ),
            const SizedBox(height: 20),
            Text(
              'PHOTO',
              style: staffText(13, mono: true, letterSpacing: 1.04),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton(
                onPressed: isSaving ? null : _pick,
                style: OutlinedButton.styleFrom(
                  shape: const RoundedRectangleBorder(
                    borderRadius: BorderRadius.zero,
                  ),
                  foregroundColor: StaffColors.ink,
                ),
                child: Text('Choose file', style: staffText(15)),
              ),
            ),
            Text(
              photo?.filename ?? 'No file chosen',
              style: staffText(14, color: StaffColors.muted),
            ),
            const SizedBox(height: 8),
            Text(
              'A cut-out drink photo on a plain background looks best on the menu tiles.',
              style: staffText(14, color: StaffColors.muted),
            ),
            if (uploadError != null) ...[
              const SizedBox(height: 12),
              StaffAlert(message: 'Photo upload failed. $uploadError'),
              const SizedBox(height: 12),
              StaffPrimaryButton(label: 'Retry photo upload', onPressed: _save),
            ],
            const SizedBox(height: 20),
            StaffField(
              label: 'Describe the photo',
              controller: altText,
              maxLines: 3,
              hint: 'e.g. Iced matcha over orange milk with whipped foam',
              helper:
                  'Screen readers read this description aloud to customers who cannot see the photo.',
              error:
                  validation &&
                      (photo != null ||
                          (widget.drink?.imageUrl?.isNotEmpty ?? false)) &&
                      altText.text.trim().isEmpty
                  ? 'Describe the photo for accessibility.'
                  : null,
            ),
            const SizedBox(height: 20),
            Text(
              'SHOW IT',
              style: staffText(13, mono: true, letterSpacing: 1.04),
            ),
            const SizedBox(height: 8),
            StaffCheck(
              text: 'On the menu',
              value: onMenu,
              onChanged: (v) => _set(() => onMenu = v),
            ),
            StaffCheck(
              text: 'Recommended badge',
              value: recommended,
              onChanged: (v) => _set(() => recommended = v),
            ),
            StaffCheck(
              text: 'Feature on home',
              value: onHome,
              onChanged: (v) => _set(() => onHome = v),
            ),
            StaffCheck(
              text: 'Seasonal',
              value: seasonal,
              onChanged: (v) => _set(() => seasonal = v),
            ),
            const SizedBox(height: 20),
            StaffPrimaryButton(
              label: isSaving
                  ? 'Saving…'
                  : isNew
                  ? 'Add to menu'
                  : 'Save changes',
              onPressed: isSaving ? null : _save,
            ),
            const SizedBox(height: 16),
            StaffPrimaryButton(
              label: 'Cancel',
              outline: true,
              onPressed: isSaving ? null : _requestExit,
            ),
            if (!isNew) ...[
              const SizedBox(height: 20),
              TextButton(
                onPressed: isSaving ? null : _delete,
                child: Text(
                  'DELETE THIS DRINK',
                  style: staffText(13, mono: true, color: StaffColors.danger),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
