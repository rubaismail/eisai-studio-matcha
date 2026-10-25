
import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { requireJwtSecret } from '../src/config/env.js';

afterEach(() => mock.restoreAll());

const password = 'ExamplePassword123!';

async function mockUser(overrides: Record<string, unknown> = {}) {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    id: '507f1f77bcf86cd799439011',
    firstName: 'Test',
    lastName: 'Customer',
    email: 'test@example.com',
    passwordHash,
    role: 'customer',
    isVerified: true,
    ...overrides,
  };

  mock.method(User, 'findOne', () => ({
    select: async () => user,
  }));

  return user;
}

test('login returns a valid JWT for verified users', async () => {
  const user = await mockUser();

  const res = await request(createApp())
    .post('/api/auth/login')
    .send({ email: user.email, password });

  assert.equal(res.status, 200);
  assert.equal(typeof res.body.token, 'string');
  assert.equal(res.body.user.email, user.email);
  assert.equal(res.body.user.role, 'customer');
  assert.equal(res.body.user.passwordHash, undefined);

  const decoded = jwt.verify(res.body.token, requireJwtSecret(), {
    algorithms: ['HS256'],
  });

  assert.notEqual(typeof decoded, 'string');

  if (typeof decoded !== 'string') {
    assert.equal(decoded.sub, user.id);
    assert.ok(decoded.exp);
  }
});

test('login rejects an incorrect password', async () => {
  await mockUser();

  const res = await request(createApp())
    .post('/api/auth/login')
    .send({
      email: 'test@example.com',
      password: 'WrongPassword123',
    });

  assert.equal(res.status, 401);
  assert.deepEqual(res.body, {
    error: 'Invalid email or password',
  });
});

test('login rejects an unverified user', async () => {
  await mockUser({ isVerified: false });

  const res = await request(createApp())
    .post('/api/auth/login')
    .send({
      email: 'test@example.com',
      password,
    });

  assert.equal(res.status, 403);
  assert.deepEqual(res.body, {
    error: 'Please verify your email first',
  });
});

test('login rejects missing credentials', async () => {
  const res = await request(createApp())
    .post('/api/auth/login')
    .send({});

  assert.equal(res.status, 400);
});

test('login rejects an unknown email', async () => {
  mock.method(User, 'findOne', () => ({
    select: async () => null,
  }));

  const res = await request(createApp())
    .post('/api/auth/login')
    .send({
      email: 'unknown@example.com',
      password,
    });

  assert.equal(res.status, 401);
});
