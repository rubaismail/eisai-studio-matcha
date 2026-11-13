// Validate deployment settings without contacting external services or printing secrets.
export function validateProductionConfig(config: NodeJS.ProcessEnv): void {
  if (config.NODE_ENV !== 'production') return;
  const required = ['MONGODB_URI', 'JWT_SECRET', 'WEB_ORIGIN', 'MAILTRAP_TOKEN',
    'EMAIL_FROM', 'AWS_REGION', 'AWS_S3_BUCKET', 'AWS_S3_PUBLIC_URL'];
  for (const key of required) {
    if (!config[key]?.trim()) throw new Error(`${key} is required in production.`);
  }
  if (config.JWT_SECRET!.trim().length < 32) throw new Error('JWT_SECRET must be at least 32 characters.');
  if (!/^mongodb(?:\+srv)?:\/\//.test(config.MONGODB_URI!)) throw new Error('MONGODB_URI must be a MongoDB connection string.');
  for (const key of ['WEB_ORIGIN', 'AWS_S3_PUBLIC_URL']) {
    let url: URL;
    try { url = new URL(config[key]!); } catch { throw new Error(`${key} must be an HTTPS URL.`); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      throw new Error(`${key} must be a public HTTPS URL without credentials, query or fragment.`);
    }
    if (key === 'WEB_ORIGIN' && config[key] !== url.origin) throw new Error('WEB_ORIGIN must be an exact origin without a path or trailing slash.');
  }
  if (config.MAILTRAP_USE_SANDBOX !== 'false') throw new Error('MAILTRAP_USE_SANDBOX must be false for deployed email delivery.');
  if (config.RATE_LIMIT_DISABLED === '1') throw new Error('Rate limiting must remain enabled in production.');
  if (Boolean(config.AWS_ACCESS_KEY_ID) !== Boolean(config.AWS_SECRET_ACCESS_KEY)) {
    throw new Error('AWS access key and secret must be supplied together, or both omitted for the credential provider chain.');
  }
  const port = Number(config.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  for (const key of ['AUTH_RATE_WINDOW_MS', 'REGISTER_IP_LIMIT', 'REGISTER_EMAIL_LIMIT',
    'RESEND_IP_LIMIT', 'RESEND_EMAIL_LIMIT', 'FORGOT_IP_LIMIT', 'FORGOT_EMAIL_LIMIT', 'RESET_IP_LIMIT', 'RESET_EMAIL_LIMIT', 'RESET_CHECK_IP_LIMIT']) {
    if (config[key] !== undefined && (!Number.isSafeInteger(Number(config[key])) || Number(config[key]) <= 0)) {
      throw new Error(`${key} must be a positive integer.`);
    }
  }
}
