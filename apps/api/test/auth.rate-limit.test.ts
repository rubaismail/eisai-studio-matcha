import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { setTimeout as sleep } from 'node:timers/promises';
import { createLoginLimiters } from '../src/middleware/loginRateLimit.js';
import { User } from '../src/models/User.js';

// ---- Email module mock ------------------------------------------------------
// Registered BEFORE the controller is imported so it binds to the mock.
type EmailCall = { to: string; rawToken: string };
let emailCalls: EmailCall[] = [];

mock.module('../src/services/email.js', {
  namedExports: {
    sendVerificationEmail: async (to: string, rawToken: string) => {
      emailCalls.push({ to, rawToken });
    },
  },
});

// Import AFTER mock.module.
const { register, resendVerification } = await import(
  '../src/controllers/auth.controller.js'
);

afterEach(() => {
  mock.restoreAll();
  emailCalls = [];
});

const validBody = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  password: 'ExamplePassword123',
};

function createTestApp(
  opts: { ipLimit: number; emailLimit: number; windowMs?: number },
  route: 'register' | 'resend',
) {
  const app = express();
  app.use(express.json());
  const path = route === 'register' ? '/register' : '/resend-verification';
  const handler = route === 'register' ? register : resendVerification;
  app.post(
    path,
    ...createLoginLimiters({
      ipLimit: opts.ipLimit,
      emailLimit: opts.emailLimit,
      windowMs: opts.windowMs ?? 1000,
    }),
    handler,
  );
  return app;
}

function mockRegisterDeps() {
  const findOne = mock.method(User, 'findOne', () => ({ lean: async () => null }));
  const create = mock.method(User, 'create', async (doc: Record<string, unknown>) => doc);
  return { findOne, create };
}

function mockResendDeps(modifiedCount = 1) {
  const update = mock.method(User, 'updateOne', async () => ({ modifiedCount }));
  return { update };
}

test('register blocks excess attempts from one IP and does not create accounts', async () => {
  const { create } = mockRegisterDeps();
  const app = createTestApp({ ipLimit: 2, emailLimit: 100 }, 'register');

  const a = await request(app).post('/register').send(validBody);
  const b = await request(app).post('/register').send({ ...validBody, email: 'b@example.com' });
  const blocked = await request(app).post('/register').send({ ...validBody, email: 'c@example.com' });

  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.equal(blocked.status, 429);

  assert.equal(create.mock.callCount(), 2);
  assert.equal(emailCalls.length, 2);
});

test('register limits normalized emails across casing', async () => {
  mockRegisterDeps();
  const app = createTestApp({ ipLimit: 100, emailLimit: 2 }, 'register');

  const base = { firstName: 'J', lastName: 'D', password: 'ExamplePassword123' };
  assert.equal(
    (await request(app).post('/register').send({ ...base, email: 'Test@Example.com' })).status,
    201,
  );
  assert.equal(
    (await request(app).post('/register').send({ ...base, email: ' test@example.com ' })).status,
    201,
  );
  assert.equal(
    (await request(app).post('/register').send({ ...base, email: 'TEST@example.COM' })).status,
    429,
  );
});

test('register recovers after the window expires', async () => {
  mockRegisterDeps();
  const app = createTestApp({ ipLimit: 1, emailLimit: 100, windowMs: 100 }, 'register');

  assert.equal((await request(app).post('/register').send(validBody)).status, 201);
  assert.equal(
    (await request(app).post('/register').send({ ...validBody, email: 'x@example.com' })).status,
    429,
  );

  await sleep(200);

  assert.equal(
    (await request(app).post('/register').send({ ...validBody, email: 'y@example.com' })).status,
    201,
  );
});

test('resend blocks excess attempts and does not send email when blocked', async () => {
  const { update } = mockResendDeps(1);
  const app = createTestApp({ ipLimit: 2, emailLimit: 100 }, 'resend');

  for (let i = 0; i < 2; i++) {
    const res = await request(app).post('/resend-verification').send({ email: `u${i}@example.com` });
    assert.equal(res.status, 200);
  }
  const blocked = await request(app).post('/resend-verification').send({ email: 'blocked@example.com' });
  assert.equal(blocked.status, 429);

  assert.equal(update.mock.callCount(), 2);
  assert.equal(emailCalls.length, 2);
});