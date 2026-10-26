
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { setTimeout as sleep } from 'node:timers/promises';
import { createLoginLimiters } from '../src/middleware/loginRateLimit.js';

function createTestApp(
  ipLimit: number,
  emailLimit: number,
  windowMs = 1000,
) {
  const app = express();
  app.use(express.json());

  app.post(
    '/login',
    ...createLoginLimiters({ ipLimit, emailLimit, windowMs }),
    (_req, res) => res.json({ success: true }),
  );

  return app;
}

test('blocks excessive attempts from one IP', async () => {
  const app = createTestApp(2, 100);

  for (let i = 0; i < 2; i++) {
    const res = await request(app)
      .post('/login')
      .send({ email: `user${i}@example.com` });

    assert.equal(res.status, 200);
  }

  const blocked = await request(app)
    .post('/login')
    .send({ email: 'another@example.com' });

  assert.equal(blocked.status, 429);
});

test('limits normalized emails even with different casing', async () => {
  const app = createTestApp(100, 2);

  const emails = [
    'Test@Example.com',
    ' test@example.com ',
  ];

  for (const email of emails) {
    const res = await request(app)
      .post('/login')
      .send({ email });

    assert.equal(res.status, 200);
  }

  const blocked = await request(app)
    .post('/login')
    .send({ email: 'TEST@example.COM' });

  assert.equal(blocked.status, 429);
});

test('allows requests again after the limit window expires', async () => {
  const app = createTestApp(1, 1, 100);

  const first = await request(app)
    .post('/login')
    .send({ email: 'test@example.com' });

  assert.equal(first.status, 200);

  const blocked = await request(app)
    .post('/login')
    .send({ email: 'test@example.com' });

  assert.equal(blocked.status, 429);

  await sleep(200);

  const resumed = await request(app)
    .post('/login')
    .send({ email: 'test@example.com' });

  assert.equal(resumed.status, 200);
});