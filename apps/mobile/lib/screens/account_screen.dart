import 'package:flutter/material.dart';
import '../config.dart';
import '../services/staff_menu_repository.dart';
import '../services/staff_photo_picker.dart';
import 'admin/staff_menu_editor_screen.dart';
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

  void _openStaffMenu() {
    final auth = AuthService.instance;
    if (!auth.isAdmin) return;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        settings: const RouteSettings(name: '/staff'),
        builder: (staffContext) => StaffMenuEditorScreen(
          repository: HttpStaffMenuRepository(
            baseUrl: apiUrl,
            getToken: auth.validToken,
          ),
          onPickPhoto: pickStaffPhoto,
          onLogout: () async {
            await auth.logout();
            if (!staffContext.mounted) return;
            Navigator.of(staffContext).popUntil((route) => route.isFirst);
          },
          onStaffMenu: () {
            Navigator.of(staffContext).popUntil(
              (route) => route.settings.name == '/staff' || route.isFirst,
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<String?>(
    future: _restore,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      }
      final auth = AuthService.instance;
      return AnimatedBuilder(
        animation: Listenable.merge([
          auth.signedInEmailListenable,
          auth.signedInRoleListenable,
        ]),
        builder: (context, _) {
          final email = auth.currentEmail;
          if (email == null) {
            return LoginScreen(onLoginSuccess: () {});
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
              if (auth.isAdmin) ...[
                const SizedBox(height: 28),
                AuthButton(
                  'MANAGE MENU →',
                  height: 49,
                  onPressed: _openStaffMenu,
                ),
              ],
              const SizedBox(height: 40),
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
