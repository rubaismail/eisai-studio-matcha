import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { User } from '../src/models/User.js';

// Mock the email service BEFORE any controller/router import so the
// controllers bind to the stub. Forgot-password must not attempt real mail.
mock.module('../src/services/email.js', {
  namedExports: {
    sendVerificationEmail: async () => {},
    sendResetPasswordEmail: async () => {},
  },
});

afterEach(() => {
  mock.restoreAll();
  delete process.env.FORGOT_IP_LIMIT;
  delete process.env.FORGOT_EMAIL_LIMIT;
  delete process.env.RESET_CHECK_IP_LIMIT;
  delete process.env.RESET_IP_LIMIT;
});

// Load the real auth router with a FRESH module graph so auth.routes.ts
// re-reads process.env at import time. The query string gives the ESM
// loader a distinct specifier per env configuration, busting the cache.
async function loadAuthRouterWith(env: Record<string, string>) {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const cacheKey = encodeURIComponent(JSON.stringify(env));
  const mod = await import(
    `../src/routes/auth.routes.js?env=${cacheKey}`
  );

  const app = express();
  app.use(express.json());
  app.use('/api/auth', mod.default);
  return app;
}

function mockForgotNoMatch() {
  return mock.method(User, 'updateOne', async () => ({
    matchedCount: 0,
    modifiedCount: 0,
  }));
}

test('FORGOT_IP_LIMIT=abc falls back to the default (10) in the real router', async () => {
  mockForgotNoMatch();

  const app = await loadAuthRouterWith({ FORGOT_IP_LIMIT: 'abc' });

  // Default IP limit is 10: the first 10 requests must pass...
  for (let i = 0; i < 10; i++) {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: `u${i}@example.com` });
    assert.equal(res.status, 200, `request ${i + 1} should pass (default limit 10)`);
  }

  // ...and the 11th must be blocked. If `abc` became NaN, the limiter
  // would not throttle and this would return 200 — the regression we guard.
  const blocked = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: 'eleventh@example.com' });
  assert.equal(blocked.status, 429, '11th request must be rate-limited at the default of 10');
});

test('FORGOT_IP_LIMIT=3 is honored by the real router', async () => {
  mockForgotNoMatch();

  const app = await loadAuthRouterWith({ FORGOT_IP_LIMIT: '3' });

  for (let i = 0; i < 3; i++) {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: `u${i}@example.com` });
    assert.equal(res.status, 200, `request ${i + 1} should pass (limit 3)`);
  }

  const blocked = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: 'fourth@example.com' });
  assert.equal(blocked.status, 429, '4th request must be rate-limited at FORGOT_IP_LIMIT=3');
});
test('reset-link checks have their own limit and never use up reset attempts', async () => {
  mock.method(User, 'exists', async () => null);
  mock.method(User, 'findOne', async () => null);

  const app = await loadAuthRouterWith({ RESET_CHECK_IP_LIMIT: '2', RESET_IP_LIMIT: '2' });
  const check = () => request(app).get('/api/auth/reset-password/check').query({ token: 'x' });

  assert.equal((await check()).status, 400);
  assert.equal((await check()).status, 400);
  assert.equal((await check()).status, 429, '3rd check must be rate-limited at RESET_CHECK_IP_LIMIT=2');

  // The reset counter is untouched by the checks above.
  for (let i = 0; i < 2; i++) {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .query({ token: 'x' })
      .send({ password: 'NewPassword123' });
    assert.equal(res.status, 400, `reset ${i + 1} should reach the controller`);
  }
});
