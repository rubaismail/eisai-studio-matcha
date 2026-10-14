// Where the app finds the API. Override when running, for example on the
// Android emulator: flutter run --dart-define=API_URL=http://10.0.2.2:4000/api
const apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:4000/api',
);
