
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
