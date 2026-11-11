# Mobile app (Flutter)

Eisai Studio's Flutter app provides the customer-facing pages and an authenticated staff menu editor. It uses the same REST API as the website and does not connect directly to MongoDB.

## Requirements

- Flutter compatible with `pubspec.yaml` (Dart 3.11+; Flutter 3.41+)
- An Android emulator, an Android device, or another supported Flutter target
- The project's backend API running for features that require server data

Verify your Flutter installation:

```sh
flutter doctor
flutter --version
```

## Run it

1. From the repository root, install dependencies and start the API using the team's standard development command:

   ```sh
   npm run dev
   ```

2. In a separate terminal, open the Flutter project and install its dependencies:

   ```sh
   cd apps/mobile
   flutter pub get
   ```

3. Run the app for your target:

   ```sh
   flutter run --dart-define=API_URL=http://10.0.2.2:4000/api  # Android emulator
   flutter run --dart-define=API_URL=http://localhost:4000/api  # Flutter Web / Chrome
   ```

   `10.0.2.2` is the Android emulator's standard alias for the host machine. Run `flutter devices` to see available devices, or use `flutter run -d <device-id>` when multiple devices are connected. For a physical phone, use an API address reachable from that device instead of `localhost` or `10.0.2.2`.

   Flutter Web also requires the backend to permit the browser's development origin through CORS.

The API base URL is set through the existing `API_URL` build-time configuration in `lib/config.dart`; include `/api` in the URL. Do not hardcode personal machine addresses in source files.

## Screens and authentication

The app includes Home, Our Story, Our Drinks, Our Location, Account, and drink detail screens, along with login, registration, email verification guidance, and password-reset flows. The homepage also displays the provided video assets.

The API determines whether a signed-in user is a customer or an admin:

- Customers access the regular account experience.
- Admins are directed to the staff menu editor, where authorized users can manage drinks.
- Admins can also browse the public screens through **View Live Menu**. Public pages do not require admin access.
- Logging out clears the saved session. The backend independently enforces permissions on protected admin endpoints.

The production staff editor uses the authenticated HTTP repository; test doubles are confined to automated tests. No special preview flag or local test-account configuration is required to run the app normally.

## Tests

Before opening a pull request, run:

```sh
cd apps/mobile
flutter analyze
flutter test --reporter expanded
```

Tests in `test/` cover authentication, customer-facing states, and staff menu behavior. To run the admin authentication navigation tests separately:

```sh
flutter test test/admin_auth_navigation_test.dart --reporter expanded
```

Tests use mocked services where appropriate and do not need production admin credentials. Real administrative operations should be verified only with an authorized account in an approved test environment.

## Build

To build a release APK, provide the API URL for the environment approved for deployment:

```sh
flutter build apk --release --dart-define=API_URL=https://api.eisaistudio.com/api
```

The APK is generated under `build/app/outputs/flutter-apk/`. Confirm the deployment URL with the project lead before distributing the build. Do not include credentials or access tokens in source control.

## Where your code goes

| Folder | Purpose | Example |
| --- | --- | --- |
| `lib/screens/` | Customer and account pages | `login_screen.dart` |
| `lib/screens/admin/` | Staff menu screens and states | `staff_menu_editor_screen.dart` |
| `lib/widgets/` | Reusable interface components | `eisai_staff_ui.dart` |
| `lib/services/` | API integrations and session management | `auth_service.dart` |
| `lib/models/` | API data models | `menu_item.dart` |
| `lib/config.dart` | Shared API URL configuration | |
| `test/` | Unit and widget tests | `admin_auth_navigation_test.dart` |

Static images and videos live under `assets/` and are declared in `pubspec.yaml`. Keep documentation and tests aligned with the committed app behavior rather than temporary machine-specific testing changes.
