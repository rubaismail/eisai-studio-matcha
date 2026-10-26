
 // Set a non-production secret before test modules load.
// This value is only used for automated tests.
process.env.JWT_SECRET =
  'eisai-studio-test-only-jwt-secret-not-for-production';
