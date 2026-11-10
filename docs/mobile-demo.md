# Eisai Studio — Flutter Mobile Build & Demo Guide

Package Flutter build and verify demo setup

The Eisai Studio mobile application is packaged as an installable Android APK.

The release build was tested on an Android 17 (API 37) emulator using Flutter 3.47.9 and Dart 3.13.7.

Planned demonstration: Android emulator  with the application displayed through screen sharing or a projector.

A physical Android device may also be used if requested by the instructor, but physical-device compatibility has not yet been verified.

## Build Environment

| Component | Version |
|---|---|
| Flutter | 3.47.9 (stable) |
| Dart | 3.13.7 |
| Tested emulator | sdk gphone64 x86 64 |
| Android | Android 17 (API 37) |
| Host OS | Windows 11 |

## Building the Release APK

From the repository root:

```powershell
cd apps/mobile
flutter pub get
flutter build apk --release --dart-define=API_URL=https://api.eisaistudio.com/api
```

The generated APK is located at:

`apps/mobile/build/app/outputs/flutter-apk/app-release.apk`

## Installing the APK

Start an Android emulator or connect a supported Android device.

```powershell
flutter devices
flutter install -d <device-id> --release
```

Launch the installed Eisai Studio application from the Android app drawer.

## Demo Walkthrough

1. Open the homepage and demonstrate the video carousel.
2. Open Our Drinks and demonstrate the menu, filters, and drink details when menu data is available.
3. Navigate to Our Story and Our Location.
4. Open My Account and demonstrate the login and registration screens.
5. Demonstrate login validation and error handling.
6. Demonstrate verification and password-reset flows once the website and email links are fully deployed.
7. With approved administrator credentials, demonstrate the staff dashboard and menu management.

## API Configuration

The release APK uses:

`https://api.eisaistudio.com/api`

The Flutter app communicates with the Express API over HTTPS. 

## Verification Results

- Release APK build: **Passed**
- Installation on Android 17 emulator: **Passed**
- Customer screen visual/navigation checks: **Passed**
- Homepage video carousel: **Passed visual check**
- Automated Flutter tests: **Passed**
- Live registration and verification email links: **Pending final deployed-website verification**
- Live password-reset link: **Pending final deployed-website verification**
- Real administrator login and menu CRUD: **Pending approved test credentials**

## Known Limitations

The production menu may be empty until menu items are added through the administrator dashboard.

Admin preview testing uses mock data and does not establish that live protected API operations work.

## Evidence

Automated Flutter test output:

`docs/test-results/flutter-mobile-tests.txt`

Release APK output:

`apps/mobile/build/app/outputs/flutter-apk/app-release.apk`

