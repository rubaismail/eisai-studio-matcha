import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { parseTrustProxy } from '../src/config/trustProxy.js';

test('proxy trust defaults to disabled and rejects unsafe or malformed settings', () => {
  for (const value of [undefined, '', ' ', 'false']) {
    assert.equal(parseTrustProxy(value), false);
  }
  for (const value of [
    'true',
    '1',
    '0.0.0.0/0',
    '::/0',
    'localhost',
    '10.0.0.1/33',
    '::1/129',
    '127.0.0.1/',
    '127.0.0.1/8/1',
    'loopback,',
  ]) {
    assert.throws(() => parseTrustProxy(value), /TRUST_PROXY/);
  }
  assert.deepEqual(
    parseTrustProxy(' loopback, 10.0.1.10, 10.0.2.0/24, ::1/128 '),
    ['loopback', '10.0.1.10', '10.0.2.0/24', '::1/128'],
  );
  assert.equal(createApp().get('trust proxy'), false);
});

function proxyApp(setting: string) {
  const original = env.trustProxy;
  try {
    env.trustProxy = parseTrustProxy(setting);
    return createApp();
  } finally {
    env.trustProxy = original;
  }
}

// Exercise the real login route/limiters. Missing passwords deliberately return
// 400 after the limiters, without connecting to MongoDB or hashing passwords.
test('real login keeps proxy clients independent and ignores forged earlier hops', async () => {
  const app = proxyApp('loopback');
  const attempt = (forwarded: string, email: string) =>
    request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', forwarded)
      .send({ email });

  for (let i = 0; i < 20; i++) {
    const res = await attempt(
      `192.0.2.${i + 1}, 198.51.100.10`,
      `ip-${i}@example.com`,
    );
    assert.equal(res.status, 400);
  }
  // Changing the attacker-controlled leftmost entry cannot bypass the limit.
  const blocked = await attempt(
    '192.0.2.200, 198.51.100.10',
    'blocked@example.com',
  );
  assert.equal(blocked.status, 429);
  assert.deepEqual(blocked.body, {
    error: 'Too many login attempts. Try again later.',
  });
  assert.ok(Number(blocked.headers['retry-after']) > 0);
  assert.equal(
    (await attempt('198.51.100.11', 'independent@example.com')).status,
    400,
  );

  // Rotating client IPs must not bypass the separate normalized-email limit.
  for (let i = 0; i < 5; i++) {
    assert.equal(
      (await attempt(`203.0.113.${i + 1}`, ' Proxy@Example.com ')).status,
      400,
    );
  }
  assert.equal((await attempt('203.0.113.6', 'proxy@example.com')).status, 429);
});

test('an untrusted socket peer cannot spoof its IP with forwarding headers', async () => {
  // The actual test connection is loopback, not this configured proxy address.
  const app = proxyApp('10.0.1.10');
  for (let i = 0; i < 21; i++) {
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', `192.0.2.${i + 1}`)
      .send({ email: `untrusted-${i}@example.com` });
    assert.equal(res.status, i < 20 ? 400 : 429);
  }
});
