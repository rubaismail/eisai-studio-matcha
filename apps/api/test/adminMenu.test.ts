
import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { MenuItem } from '../src/models/MenuItem.js';
import { requireJwtSecret } from '../src/config/env.js';

afterEach(() => mock.restoreAll());

const userId = '507f1f77bcf86cd799439011';

function createToken() {
  return jwt.sign({}, requireJwtSecret(), {
    subject: userId,
    expiresIn: '1h',
    algorithm: 'HS256',
  });
}

function mockUser(role: 'admin' | 'customer') {
  mock.method(User, 'findById', async () => ({
    id: userId,
    role,
    isVerified: true,
  }));
}

test('admin can see available and hidden menu items', async () => {
  mockUser('admin');

  const items = [
    { name: 'Matcha Latte', isAvailable: true },
    { name: 'Seasonal Matcha', isAvailable: false },
  ];

  const find = mock.method(MenuItem, 'find', () => ({
    sort: async () => items,
  }));

  const res = await request(createApp())
    .get('/api/admin/menu')
    .set('Authorization', `Bearer ${createToken()}`);

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { items });
  assert.deepEqual(find.mock.calls[0].arguments[0], {});
});

test('customers cannot access admin menu', async () => {
  mockUser('customer');

  const res = await request(createApp())
    .get('/api/admin/menu')
    .set('Authorization', `Bearer ${createToken()}`);

  assert.equal(res.status, 403);
});

test('admin menu rejects requests without a token', async () => {
  const res = await request(createApp()).get('/api/admin/menu');

  assert.equal(res.status, 401);
});

test('admin menu rejects invalid tokens', async () => {
  const res = await request(createApp())
    .get('/api/admin/menu')
    .set('Authorization', 'Bearer invalid-token');

  assert.equal(res.status, 401);
});

test('admin menu returns an empty list', async () => {
  mockUser('admin');

  mock.method(MenuItem, 'find', () => ({
    sort: async () => [],
  }));

  const res = await request(createApp())
    .get('/api/admin/menu')
    .set('Authorization', `Bearer ${createToken()}`);

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { items: [] });
});

test('admin menu handles database errors', async () => {
  mockUser('admin');

  mock.method(MenuItem, 'find', () => ({
    sort: async () => {
      throw new Error('db down');
    },
  }));

  mock.method(console, 'error', () => {});

  const res = await request(createApp())
    .get('/api/admin/menu')
    .set('Authorization', `Bearer ${createToken()}`);

  assert.equal(res.status, 500);
  assert.deepEqual(res.body, {
    error: 'Something went wrong',
  });
});