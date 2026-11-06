import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionConfig } from '../src/config/production.js';
const valid = {
  NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1/eisai_staging',
  JWT_SECRET: 'x'.repeat(32), WEB_ORIGIN: 'https://stage.example.com', APP_URL: 'https://stage.example.com',
  MAILTRAP_TOKEN: 'test', EMAIL_FROM: 'sender@example.com', MAILTRAP_USE_SANDBOX: 'false',
  AWS_REGION: 'us-east-1', AWS_S3_BUCKET: 'test-images', AWS_S3_PUBLIC_URL: 'https://images.example.com',
};
test('production config accepts same-host deployment and provider-chain AWS credentials', () => {
  assert.doesNotThrow(() => validateProductionConfig(valid));
});
test('production config rejects missing settings without leaking values', () => {
  for (const key of ['MONGODB_URI', 'JWT_SECRET', 'WEB_ORIGIN', 'APP_URL', 'MAILTRAP_TOKEN', 'EMAIL_FROM', 'AWS_REGION', 'AWS_S3_BUCKET', 'AWS_S3_PUBLIC_URL']) {
    assert.throws(() => validateProductionConfig({ ...valid, [key]: '' }), new RegExp(key));
  }
});
test('production rejects unsafe URLs, disabled limits, malformed limits and incomplete credentials', () => {
  for (const invalid of [
    { WEB_ORIGIN: 'http://example.com' }, { WEB_ORIGIN: 'https://example.com/' }, { WEB_ORIGIN: 'https://example.com/path' },
    { APP_URL: 'https://user:secret@example.com' }, { APP_URL: 'https://localhost' },
    { AWS_S3_PUBLIC_URL: 'not-a-url' }, { MAILTRAP_USE_SANDBOX: 'true' },
    { RATE_LIMIT_DISABLED: '1' }, { JWT_SECRET: 'short' }, { MONGODB_URI: 'invalid' },
    { AWS_ACCESS_KEY_ID: 'only-one-half' }, { PORT: '0' }, { PORT: '65536' },
    { FORGOT_IP_LIMIT: 'abc' }, { RESET_IP_LIMIT: '0.5' }, { AUTH_RATE_WINDOW_MS: '0' },
  ]) assert.throws(() => validateProductionConfig({ ...valid, ...invalid }));
});
test('local development retains existing defaults', () => {
  assert.doesNotThrow(() => validateProductionConfig({ NODE_ENV: 'development' }));
});
