import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'eisai_auth_ui.dart';
import 'check_email_screen.dart';
import 'forgot_password_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.onLoginSuccess});

  final VoidCallback? onLoginSuccess;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _emailError, _passwordError, _authError;
  int? _status;
  bool _loading = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_loading) return;

    setState(() {
      _emailError = null;
      _passwordError = null;
      _authError = null;
      _status = null;
    });

    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(_email.text.trim())) {
      setState(() => _emailError = 'Please enter a valid email address.');
      return;
    }
    if (_password.text.isEmpty) {
      setState(() => _passwordError = 'Password is required.');
      return;
    }

    setState(() => _loading = true);
    try {
      await AuthService.instance.login(
        email: _email.text,
        password: _password.text,
      );
      if (!mounted) return;

      if (widget.onLoginSuccess != null) {
        widget.onLoginSuccess!();
      } else if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop(true);
      }
    } on AuthException catch (e) {
      if (!mounted) return;
      setState(() {
        _status = e.statusCode;
        _authError = switch (e.statusCode) {
          401 => 'Invalid email or password. Please try again.',
          403 => 'Check your inbox for the verification link.',
          429 => 'Too many login attempts.\nPlease wait and try again later.',
          _ => e.message,
        };
        if (e.statusCode == 403) {
          _emailError = 'Please verify your email to log in.';
        }
      });
    } on Exception catch (_) {
      if (!mounted) return;
      setState(() {
        _authError = 'Something went wrong. Please try again.';
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
      const AuthHeading('Welcome back!'),
      const SizedBox(height: 4),
      Text('Sign in to your account', style: EisaiAuthStyle.questrial(17)),
      const SizedBox(height: 40),
      AuthField(
        title: 'EMAIL ADDRESS',
        hint: 'you@example.com',
        controller: _email,
        email: true,
        errorText: _emailError,
        onChanged: (_) {
          if (_emailError != null) setState(() => _emailError = null);
        },
      ),
      const SizedBox(height: 24),
      AuthField(
        title: 'PASSWORD',
        hint: '••••••••',
        controller: _password,
        password: true,
        errorText: _passwordError,
        onChanged: (_) {
          if (_passwordError != null) setState(() => _passwordError = null);
        },
      ),
      if (_authError != null) ...[
        const SizedBox(height: 16),
        Text(
          _authError!,
          style: EisaiAuthStyle.mono(13, color: EisaiAuthStyle.error),
        ),
        if (_status == 403)
          AuthInlineLink(
            'No email? Request a new verification link.',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => CheckEmailScreen(email: _email.text.trim()),
              ),
            ),
          ),
      ],
      const SizedBox(height: 8),
      AuthInlineLink(
        'Forgot password?',
        align: TextAlign.right,
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => const ForgotPasswordScreen()),
        ),
      ),
      const SizedBox(height: 29),
      AuthButton(
        _loading ? 'Logging in...' : 'Log in →',
        onPressed: _loading ? null : _login,
      ),
      const SizedBox(height: 29),
      Row(
        children: [
          Expanded(
            child: Text('New to Eisai?', style: EisaiAuthStyle.questrial(15)),
          ),
          AuthInlineLink(
            'Create account →',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const RegisterScreen()),
            ),
          ),
        ],
      ),
      const SizedBox(height: 49),
      Text(
        'New accounts verify their email\nbefore logging in.',
        style: EisaiAuthStyle.questrial(14, color: const Color(0xFF777777)),
      ),
    ],
  );
}
