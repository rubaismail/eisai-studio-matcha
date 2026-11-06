import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'eisai_auth_ui.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  String? _error;
  bool _loading = false, _sent = false;
  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_loading) return;
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(_email.text.trim())) {
      setState(() => _error = 'Please enter a valid email address.');
      return;
    }
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      await AuthService.instance.forgotPassword(_email.text);
      if (mounted) setState(() => _sent = true);
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => EisaiAuthShell(
    children: _sent
        ? [
            const AuthEyebrow('PASSWORD RESET'),
            const SizedBox(height: 31),
            const AuthHeading('Check your inbox.', size: 39),
            const SizedBox(height: 31),
            Text(
              'If an account exists, we’ll email a reset link.',
              style: EisaiAuthStyle.questrial(16),
            ),
            const SizedBox(height: 100),
            Container(
              padding: const EdgeInsets.all(16),
              color: const Color(0xFFF9F9FA),
              child: Text(
                'After resetting your password, return to the app and log in. For an expired link, request a new one.',
                style: EisaiAuthStyle.questrial(15),
              ),
            ),
            const SizedBox(height: 93),
            AuthButton(
              'BACK TO LOGIN →',
              height: 52,
              onPressed: () => Navigator.of(context).pop(),
            ),
          ]
        : [
            const AuthEyebrow('YOUR EISAI ACCOUNT'),
            const SizedBox(height: 31),
            const AuthHeading('Reset password.', size: 39),
            const SizedBox(height: 31),
            Text(
              'Enter your email address and we’ll send you a link to reset your password.',
              style: EisaiAuthStyle.questrial(16),
            ),
            const SizedBox(height: 62),
            AuthField(
              title: 'EMAIL ADDRESS',
              hint: 'you@example.com',
              controller: _email,
              email: true,
              errorText: _error,
            ),
            const SizedBox(height: 73),
            AuthButton(
              _loading ? 'SENDING...' : 'SEND RESET LINK →',
              height: 52,
              onPressed: _loading ? null : _send,
            ),
            const SizedBox(height: 22),
            AuthInlineLink(
              '← BACK TO LOGIN',
              onTap: () => Navigator.of(context).pop(),
            ),
          ],
  );
}
