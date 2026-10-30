
 // Set a non-production secret before test modules load.
// This value is only used for automated tests.
process.env.JWT_SECRET =
  'eisai-studio-test-only-jwt-secret-not-for-production';

// Tests explicitly opt into proxy trust when needed.
process.env.TRUST_PROXY = '';

process.env.REGISTER_IP_LIMIT = "100000";
process.env.REGISTER_EMAIL_LIMIT = "100000";
process.env.RESEND_IP_LIMIT = "100000";
process.env.RESEND_EMAIL_LIMIT = "100000";
process.env.MAILTRAP_TOKEN = "test-token";
process.env.MAILTRAP_USE_SANDBOX = "true";
process.env.MAILTRAP_INBOX_ID = "1";
process.env.EMAIL_FROM = "test@example.com";
process.env.APP_URL = "http://localhost:4000";