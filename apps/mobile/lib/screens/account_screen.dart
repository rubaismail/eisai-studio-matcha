import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'eisai_auth_ui.dart';
import 'forgot_password_screen.dart';
import 'login_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  late final Future<String?> _restore;

  @override
  void initState() {
    super.initState();
    _restore = AuthService.instance.restoreSession();
  }

  Future<void> _logout() => AuthService.instance.logout();

  @override
  Widget build(BuildContext context) => FutureBuilder<String?>(
    future: _restore,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      }
      return ValueListenableBuilder<String?>(
        valueListenable: AuthService.instance.signedInEmailListenable,
        builder: (context, email, _) {
          if (email == null) {
            return LoginScreen(
              onLoginSuccess: () {},
            );
          }
          return EisaiAuthShell(
            children: [
              const AuthEyebrow('YOUR EISAI ACCOUNT'),
              const SizedBox(height: 25),
              const AuthHeading('My account.', size: 39),
              const SizedBox(height: 24),
              Text(
                'Manage your account details.',
                style: EisaiAuthStyle.questrial(
                  16,
                  color: EisaiAuthStyle.muted,
                ),
              ),
              const SizedBox(height: 63),
              Container(
                height: 151,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9F9FA),
                  border: Border.all(color: const Color(0xFFD6D6D6)),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'PROFILE INFORMATION',
                      style: EisaiAuthStyle.mono(
                        12,
                        color: EisaiAuthStyle.muted,
                      ),
                    ),
                    const SizedBox(height: 32),
                    Text('EMAIL ADDRESS', style: EisaiAuthStyle.mono(11)),
                    const SizedBox(height: 8),
                    Text(email, style: EisaiAuthStyle.questrial(16)),
                  ],
                ),
              ),
              const SizedBox(height: 95),
              AuthButton(
                'RESET PASSWORD →',
                outline: true,
                height: 49,
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const ForgotPasswordScreen(),
                  ),
                ),
              ),
              const SizedBox(height: 22),
              AuthButton('LOG OUT', height: 49, onPressed: _logout),
            ],
          );
        },
      );
    },
  );
}
