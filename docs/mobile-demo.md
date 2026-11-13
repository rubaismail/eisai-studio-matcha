# Eisai Studio — Flutter Mobile Build & Demo Guide


## Overview

The Eisai Studio mobile application is packaged as an installable Android APK. The application uses the deployed Eisai Studio API and includes the customer-facing screens, authentication flows, video carousel, and staff menu management interface.

**Demonstration platform:** Physical Android device or Android 17 (API 37) emulator

## Verified release

- **APK download:** [app-release.apk](https://github.com/rubaismail/eisai-studio-matcha/releases/download/mobile-demo/app-release.apk)
- **GitHub release:** [mobile-demo](https://github.com/rubaismail/eisai-studio-matcha/releases/tag/mobile-demo)
- **Application source commit:** [a590a93](https://github.com/rubaismail/eisai-studio-matcha/commit/a590a934e34e5747eb7a62bc1bd6108066d30a84) (the commit the `mobile-demo` tag points to)
- **APK SHA-256:** `DBD33BBEB100B9823A21ED84F43010E2BC1EDB7D4DE32583BD00B82CD118804E`
- **APK size:** 88,618,101 bytes (84.5 MiB).
- **Note:** The released APK was built from `a590a93`. It does not include the later review fixes in this PR (logo fallback, Home logo scroll-to-top, launch-failure messages, unused-video removal).
- **Automated tests:** 73 passed.
- **Test evidence:** [Flutter test results](test-results/flutter-mobile-tests.txt)
- **Installed on:** sdk gphone64 x86 64 — Android 17 (API 37), android-x64 emulator.
- **Installation:** Successfully installed using `flutter install --use-application-binary=build/app/outputs/flutter-apk/app-release.apk`.


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

**APK size:** Approximately 84.5 MB

## Installing the APK

Start the Android emulator through Android Studio's Device Manager.

From `apps/mobile`, run:

```powershell
adb devices

adb install -r build/app/outputs/flutter-apk/app-release.apk
```

Launch Eisai Studio from the Android emulator's application drawer.

The installed release APK should be tested separately from the Flutter debug build.

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
| Flutter release APK compilation | Passed |
| Android 17 emulator installation | Passed in documented setup |
| Customer screen visual and navigation checks | Passed |
| Eight-slide homepage carousel | Passed — scrolling and playback |
| Our Products screen and navigation | Passed |
| Automated Flutter tests | Previously recorded as passed; retain latest test output |
| Production API specified in APK build | Passed |
| Customer registration | Tested |
| Email verification through deployed website | Passed |
| Live password-reset workflow | Tested |
| Physical Android device testing | Not verified |

## Known Limitations

- Physical Android device compatibility has not been verified.
- Full accessibility verification, including TalkBack, is separate from the website's Lighthouse audit.


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
- [Email verification](test-results/mobile-release/check-inbox.png)
- [Footer](test-results/mobile-release/footer.png)
- [Video carousel](test-results/mobile-release/video-carousel.png)
- [Old password attempt](test-results/mobile-release/invalid-password-after-reset.png)
- [Password reset email requested](test-results/mobile-release/reset-link.png)




## Issue #42 Completion

This guide documents the reproducible Android build process, production API configuration, demo workflow, and verification results.

The deliverable is ready for issue closure once the latest release APK installation is confirmed, the current test evidence is linked, and the pull request is reviewed and accepted.