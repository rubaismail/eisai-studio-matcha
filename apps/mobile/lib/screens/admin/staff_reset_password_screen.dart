import 'package:flutter/material.dart';
import '../../widgets/eisai_staff_ui.dart';

class EisaiSetNewPasswordScreen extends StatefulWidget {
  const EisaiSetNewPasswordScreen({
    super.key,
    required this.onSubmit,
    required this.onBackToLogin,
    this.logoAsset,
  });
  final Future<void> Function(String newPassword) onSubmit;
  final VoidCallback onBackToLogin;
  final String? logoAsset;
  @override
  State<EisaiSetNewPasswordScreen> createState() =>
      _EisaiSetNewPasswordScreenState();
}

class _EisaiSetNewPasswordScreenState extends State<EisaiSetNewPasswordScreen> {
  final first = TextEditingController(), confirm = TextEditingController();
  String? error;
  bool busy = false;
  @override
  void dispose() {
    first.dispose();
    confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (first.text.length < 8 || first.text != confirm.text) {
      setState(
        () => error =
            'Enter a password of at least 8 characters and make sure both entries match.',
      );
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.onSubmit(first.text);
      if (mounted) widget.onBackToLogin();
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Could not update your password. Check the reset link and try again.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.white,
    body: SafeArea(
      child: Column(
        children: [
          Container(
            height: 104,
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: StaffColors.line)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 22),
            child: Row(
              children: [
                Expanded(
                  child: widget.logoAsset == null
                      ? Text(
                          'eisai studio',
                          style: staffText(23, color: StaffColors.periwinkle),
                        )
                      : Image.asset(
                          widget.logoAsset!,
                          alignment: Alignment.centerLeft,
                          height: 29,
                          errorBuilder: (_, __, ___) => Text(
                            'eisai studio',
                            style: staffText(23, color: StaffColors.periwinkle),
                          ),
                        ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 49, 24, 32),
              children: [
                Text(
                  'ACCOUNT / PASSWORD RESET',
                  style: staffText(12, mono: true, color: StaffColors.muted),
                ),
                const SizedBox(height: 24),
                Text('Set a new password', style: staffText(30)),
                const SizedBox(height: 22),
                Text(
                  'Create a new password for your Eisai account.',
                  style: staffText(15, color: StaffColors.muted),
                ),
                const SizedBox(height: 65),
                Text('NEW PASSWORD *', style: staffText(13, mono: true)),
                const SizedBox(height: 12),
                TextField(
                  controller: first,
                  obscureText: true,
                  autofillHints: const [AutofillHints.newPassword],
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.all(14),
                  ),
                ),
                const SizedBox(height: 32),
                Text('CONFIRM PASSWORD *', style: staffText(13, mono: true)),
                const SizedBox(height: 12),
                TextField(
                  controller: confirm,
                  obscureText: true,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.all(14),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Use a strong password and make sure both fields match.',
                  style: staffText(13, color: StaffColors.muted),
                ),
                if (error != null) ...[
                  const SizedBox(height: 16),
                  StaffAlert(message: error!),
                ],
                const SizedBox(height: 54),
                SizedBox(
                  height: 50,
                  child: ElevatedButton(
                    onPressed: busy ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: StaffColors.periwinkle,
                      foregroundColor: Colors.white,
                      shape: const RoundedRectangleBorder(
                        borderRadius: BorderRadius.zero,
                      ),
                    ),
                    child: Text(
                      busy ? 'Updating…' : 'Update password →',
                      style: staffText(14, mono: true, color: Colors.white),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: widget.onBackToLogin,
                  child: Text(
                    'Back to login',
                    style: staffText(14, mono: true, color: StaffColors.ink),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
