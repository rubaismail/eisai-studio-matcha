import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'check_email_screen.dart';
import 'eisai_auth_ui.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _first = TextEditingController(),
      _last = TextEditingController(),
      _email = TextEditingController(),
      _password = TextEditingController(),
      _confirm = TextEditingController();
  bool _loading = false;
  String? _error;
  @override
  void dispose() {
    for (final c in [_first, _last, _email, _password, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _register() async {
    if (_loading) return;

    String? error;

    if (_first.text.trim().isEmpty || _last.text.trim().isEmpty) {
      error = 'Enter your first and last name.';
    } else if (!RegExp(
      r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
    ).hasMatch(_email.text.trim())) {
      error = 'Please enter a valid email address.';
    } else if (_password.text.runes.length < 8 ||
        utf8.encode(_password.text).length > 72) {
      error =
          'Password must be at least 8 characters and at most 72 UTF-8 bytes.';
    } else if (_password.text != _confirm.text) {
      error = 'Passwords do not match.';
    }
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      await AuthService.instance.register(
        firstName: _first.text,
        lastName: _last.text,
        email: _email.text,
        password: _password.text,
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => CheckEmailScreen(email: _email.text.trim()),
        ),
      );
    } on AuthException catch (e) {
      if (mounted) {
        setState(
          () => _error = e.statusCode == 409
              ? 'Email address already registered.'
              : e.message,
        );
      }
    } on Exception catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Something went wrong. Please try again.';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => EisaiAuthShell(
    children: [
      const AuthEyebrow('YOUR EISAI ACCOUNT'),
      const SizedBox(height: 34),
      const AuthHeading('Create account', size: 42),
      const SizedBox(height: 4),
      Text(
        'Get started with your Eisai account.',
        style: EisaiAuthStyle.questrial(17),
      ),
      const SizedBox(height: 29),
      AuthField(
        title: 'FIRST NAME',
        hint: 'Your first name',
        controller: _first,
      ),
      const SizedBox(height: 20),
      AuthField(title: 'LAST NAME', hint: 'Your last name', controller: _last),
      const SizedBox(height: 20),
      AuthField(
        title: 'EMAIL ADDRESS',
        hint: 'you@example.com',
        controller: _email,
        email: true,
      ),
      const SizedBox(height: 20),
      AuthField(
        title: 'PASSWORD',
        hint: 'Enter a password',
        controller: _password,
        password: true,
      ),
      const SizedBox(height: 20),
      AuthField(
        title: 'CONFIRM PASSWORD',
        hint: 'Re-enter your password',
        controller: _confirm,
        password: true,
      ),
      if (_error != null) ...[
        const SizedBox(height: 12),
        Text(
          _error!,
          style: EisaiAuthStyle.mono(13, color: EisaiAuthStyle.error),
        ),
      ],
      const SizedBox(height: 38),
      AuthButton(
        _loading ? 'Creating account...' : 'Create account →',
        onPressed: _loading ? null : _register,
      ),
      const SizedBox(height: 27),
      Text(
        'We’ll email a verification link. Complete verification in your browser before logging in.',
        style: EisaiAuthStyle.questrial(14, color: EisaiAuthStyle.muted),
      ),
      const SizedBox(height: 45),
      AuthInlineLink(
        'Already have an account?   Log in →',
        onTap: () => Navigator.of(context).pop(),
      ),
    ],
  );
}
