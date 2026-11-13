# Eisai Studio — Flutter Mobile Build & Demo Guide


## Overview

The Eisai Studio mobile application is packaged as an installable Android APK. The application uses the deployed Eisai Studio API and includes the customer-facing screens, authentication flows, video carousel, and staff menu management interface.

**Demonstration platform:** Physical Android device or Android 17 (API 37) emulator

## Verified release

- **APK download:** [app-release.apk](https://github.com/rubaismail/eisai-studio-matcha/releases/download/mobile-demo/app-release.apk)
- **GitHub release:** [mobile-demo](https://github.com/rubaismail/eisai-studio-matcha/releases/tag/mobile-demo)
- **Build base commit:** [d43c949](https://github.com/rubaismail/eisai-studio-matcha/commit/d43c949266367c691c2d9281c9b6d31deb787739)
- **Source status:** Built from the base commit above. 
- **Local APK SHA-256:** `3E7091CEEF8EC6584857AD0A21D09DA90DBEE1B274D7A9013FA61A27C461E87F`
- **Local APK size:** 85,000,552 bytes (approximately 81.1 MiB).
- **Release publication:** Updated `app-release.apk` uploaded to the existing `mobile-demo` release.
- **Automated tests:** Previously recorded as 73 passed; see the linked test output.
- **Test evidence:** [Flutter test results](test-results/flutter-mobile-tests.txt)
- **Installation:** This production-configured APK was successfully installed using `adb install -r`.
- **Test device:** sdk gphone64 x86 64 — Android 17 (API 37), android-x64 emulator.



## Build Environment

| Component | Version |
|---|---|
| Flutter | 3.47.9 (stable) |
| Dart | 3.13.7 |
| Host operating system | Windows 11 |
| Tested emulator | sdk gphone64 x86 64 |
| Android version | Android 17 (API 37) |
| Gradle | 8.14 |
| Android Gradle Plugin | 8.11.1 |
| Kotlin | 2.2.20 |
| Build configuration | Release |
| API environment | Production |

## Building the Release APK

From the repository root:

```powershell
cd apps/mobile

flutter pub get
flutter analyze
flutter test --reporter expanded

flutter build apk --release --dart-define=API_URL=https://api.eisaistudio.com/api
```

The generated APK is located at:

`apps/mobile/build/app/outputs/flutter-apk/app-release.apk`

**Build result:** Successful

**APK size:** 85,000,552 bytes (approximately 81.1 MiB).

## Installing the APK

Start the Android emulator through Android Studio's Device Manager.

From `apps/mobile`, run:
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices

& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r .\build\app\outputs\flutter-apk\app-release.apk
```

Launch Eisai Studio from the Android emulator's application drawer.

The installed release APK should be tested separately from the Flutter debug build.

If the Android SDK is installed elsewhere, adjust the executable path.

## Production API Configuration

The Android release build uses:

`https://api.eisaistudio.com/api`

The Flutter application communicates with the deployed Express API over HTTPS.

The production API URL is supplied using `--dart-define` during the release build.

## Demo Walkthrough

### 1. Homepage

- Launch the application.
- Demonstrate the hero section.
- Scroll through the eight-slide pop-up carousel.
- Verify video playback and the website-matched slide order.
- Demonstrate the homepage navigation and links.

### 2. Our Drinks

- Open the drinks menu.
- Demonstrate the menu filters.
- Open a drink details screen when menu data is available.
- Demonstrate navigation between screens.

### 3. Our Products

- Open Our Products using the hamburger navigation.
- Demonstrate the Coming Soon page.
- Verify the See the Menu button.
- Verify the Follow on Instagram button.

### 4. Our Story and Our Location

- Navigate to both informational screens.
- Check their layouts, navigation, and external links.
- Demonstrate the clickable Eisai logo returning users to Home.

### 5. Customer Registration and Email Verification

- Open Account and select Create Account.
- Register using an accessible test email address.
- Verify that the Check Your Inbox screen appears.
- Open the verification email.
- Follow the verification link to the deployed website.
- Confirm successful email verification.
- Return to Flutter and log in using the verified account.


### 6. Login and Authentication

- Demonstrate login with a verified account.
- Demonstrate incorrect-password handling.
- Demonstrate logout.
- Check that the application handles authenticated and unauthenticated states correctly.

### 7. Password Reset

- Select Forgot Password.
- Enter the registered test email.
- Request the password-reset email.
- Open the received reset link.
- Complete the password-reset flow through the deployed website.
- Return to Flutter and verify authentication using the updated credentials.

### 8. Staff Dashboard

With approved administrator credentials:

- Log in using an administrator account.
- Open the Staff Menu Editor.
- Demonstrate menu management screens.
- Test authorized menu operations.


## Verification Results

| Test | Result |
|---|---|
| Production-configured release APK compilation | Passed |
| Release APK installation on Android emulator | Passed |
| Menu loading in final installed APK | Passed |
| Login in final installed APK | Passed |
| Customer screen visual and navigation checks | Passed |
| Eight-slide homepage carousel | Passed — scrolling and playback |
| Registration and email verification | Passed |
| Our Products screen and navigation | Passed |
| Password reset and login with updated password | Passed |
| Automated Flutter tests |  Previously recorded as 73 passed |
| Production API specified in APK build | Passed |
| Physical Android device testing | Not verified |

## Known Limitations

- Physical Android device compatibility has not been verified.


## Verification Evidence

- [Flutter automated test output](test-results/flutter-mobile-tests.txt)
- [Release APK installation log](test-results/mobile-release/apk-install.txt)
- [Installed application](test-results/mobile-release/installed-app.png)
- [Home](test-results/mobile-release/home.png)
- [Navigation](test-results/mobile-release/navigation.png)
- [Our Drinks](test-results/mobile-release/our-drinks.png)
- [Our Products](test-results/mobile-release/products.png)
- [Account](test-results/mobile-release/account.png)
- [Login](test-results/mobile-release/login.png)
- [Check Your Inbox screen](test-results/mobile-release/check-inbox.png)
- [Footer](test-results/mobile-release/footer.png)
- [Video carousel](test-results/mobile-release/video-carousel.png)
- [Old password attempt](test-results/mobile-release/invalid-password-after-reset.png)
- [Password reset email requested](test-results/mobile-release/reset-link.png)


## Issue #42 Completion

Issue closure requires:

- Committed source and Android build configuration matching the final APK.
- Successful installation and verification of the production-configured APK.
- Updated `app-release.apk` on the `mobile-demo` release.
- The `mobile-demo` tag pointing to the exact build source commit.
- Matching SHA-256 and size for the uploaded APK.
- Current verification evidence and final reviewer approval.

