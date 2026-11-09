import 'package:flutter/material.dart';
import '../../widgets/eisai_staff_ui.dart';

class EisaiBrowserRoutes {
  const EisaiBrowserRoutes({
    required this.liveMenuUrl,
    required this.productsUrl,
    this.forgotPasswordUrl,
    this.websiteAccountUrl,
  });
  final Uri liveMenuUrl, productsUrl;
  final Uri? forgotPasswordUrl, websiteAccountUrl;
  Future<bool> openLiveMenu() => openEisaiWebsite(liveMenuUrl);
  Future<bool> openProducts() => openEisaiWebsite(productsUrl);
  Future<bool> openForgotPassword() => openEisaiWebsite(forgotPasswordUrl);
  Future<bool> openWebsiteAccount() => openEisaiWebsite(websiteAccountUrl);
}

class EisaiWebsiteHandoff extends StatelessWidget {
  const EisaiWebsiteHandoff({
    super.key,
    required this.title,
    required this.detail,
    required this.url,
    required this.onBack,
  });
  final String title, detail;
  final Uri url;
  final VoidCallback onBack;
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.white,
    body: SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 85),
            Text(title, style: staffText(30)),
            const SizedBox(height: 24),
            Text(detail, style: staffText(16, color: StaffColors.muted)),
            const Spacer(),
            StaffPrimaryButton(
              label: 'Continue on website →',
              onPressed: () => openEisaiWebsite(url),
            ),
            const SizedBox(height: 16),
            StaffPrimaryButton(
              label: 'Back to app',
              outline: true,
              onPressed: onBack,
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    ),
  );
}
