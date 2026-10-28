
import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { User } from '../src/models/User.js';
import { requireJwtSecret } from '../src/config/env.js';
import { requireAuth } from '../src/middleware/requireAuth.js';
import { requireAdmin } from '../src/middleware/requireAdmin.js';

afterEach(() => mock.restoreAll());

const userId = '507f1f77bcf86cd799439011';

function createTestApp() {
  const app = express();

  app.get('/protected', requireAuth, (_req, res) => {
    res.json({ success: true });
  });

  app.get('/admin', requireAuth, requireAdmin, (_req, res) => {
    res.json({ success: true });
  });

  return app;
}

function createToken(expiresIn = '1h') {
  return jwt.sign({}, requireJwtSecret(), {
    subject: userId,
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

function mockAuthenticatedUser(role: 'customer' | 'admin') {
  mock.method(User, 'findById', async () => ({
    id: userId,
    role,
    isVerified: true,
  }));
}

test('rejects requests without a token', async () => {
  const res = await request(createTestApp()).get('/protected');

  assert.equal(res.status, 401);
});

test('rejects invalid JWT tokens', async () => {
  const res = await request(createTestApp())
    .get('/protected')
    .set('Authorization', 'Bearer invalid-token');

  assert.equal(res.status, 401);
});

test('rejects expired JWT tokens', async () => {
  const token = createToken('-1s');

  const res = await request(createTestApp())
    .get('/protected')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 401);
});

test('allows verified users with valid tokens', async () => {
  mockAuthenticatedUser('customer');

  const res = await request(createTestApp())
    .get('/protected')
    .set('Authorization', `Bearer ${createToken()}`);

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { success: true });
});

test('blocks customers from admin routes', async () => {
  mockAuthenticatedUser('customer');

  const res = await request(createTestApp())
    .get('/admin')
    .set('Authorization', `Bearer ${createToken()}`);

  assert.equal(res.status, 403);
});

test('allows administrators into admin routes', async () => {
  mockAuthenticatedUser('admin');

  const res = await request(createTestApp())
    .get('/admin')
    .set('Authorization', `Bearer ${createToken()}`);

  assert.equal(res.status, 200);
});

test('rejects deleted or missing accounts', async () => {
  mock.method(User, 'findById', async () => null);

  const res = await request(createTestApp())
    .get('/protected')
    .set('Authorization', `Bearer ${createToken()}`);

  assert.equal(res.status, 401);
});