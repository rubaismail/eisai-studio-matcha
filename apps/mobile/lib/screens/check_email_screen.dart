import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'eisai_auth_ui.dart';

class CheckEmailScreen extends StatefulWidget {
  const CheckEmailScreen({super.key, required this.email});
  final String email;
  @override
  State<CheckEmailScreen> createState() => _CheckEmailScreenState();
}

class _CheckEmailScreenState extends State<CheckEmailScreen> {
  String? _message;
  bool _sending = false;
  Future<void> _resend() async {
    if (_sending) return;
    setState(() {
      _sending = true;
      _message = null;
    });
    try {
      final msg = await AuthService.instance.resendVerification(widget.email);
      if (mounted) setState(() => _message = msg);
    } on AuthException catch (e) {
      if (mounted) setState(() => _message = e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => EisaiAuthShell(
    children: [
      const SizedBox(height: 19),
      const AuthEyebrow('YOUR EISAI ACCOUNT'),
      const SizedBox(height: 31),
      const AuthHeading('Check your inbox'),
      const SizedBox(height: 60),
      Text(
        'We sent a verification email to',
        style: EisaiAuthStyle.questrial(17),
      ),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(9),
        color: const Color(0xFFF9F9FA),
        child: Text(widget.email, style: EisaiAuthStyle.questrial(17)),
      ),
      const SizedBox(height: 30),
      Text(
        'Open the email link in your browser to verify your email. Then return to the app and log in.',
        style: EisaiAuthStyle.questrial(17),
      ),
      if (_message != null) ...[
        const SizedBox(height: 16),
        Text(_message!, style: EisaiAuthStyle.mono(13)),
      ],
      const SizedBox(height: 92),
      Row(
        children: [
          Expanded(
            child: AuthButton(
              _sending ? 'SENDING...' : 'RESEND EMAIL',
              height: 49,
              onPressed: _sending ? null : _resend,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: AuthInlineLink(
              '← BACK TO LOGIN',
              align: TextAlign.center,
              onTap: () => Navigator.of(context).pop(),
            ),
          ),
        ],
      ),
    ],
  );
}
