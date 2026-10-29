import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { S3Client } from '@aws-sdk/client-s3';
import { createApp } from '../src/app.js';
import { requireJwtSecret } from '../src/config/env.js';
import { MenuItem } from '../src/models/MenuItem.js';
import { User } from '../src/models/User.js';

const adminUserId = '507f1f77bcf86cd799439011';

function createAuthHeader(role: 'admin' | 'customer' = 'admin') {
  mock.method(User, 'findById', async () => ({
    id: adminUserId,
    role,
    isVerified: true,
  }));

  return `Bearer ${jwt.sign({}, requireJwtSecret(), {
    subject: adminUserId,
    expiresIn: '1h',
    algorithm: 'HS256',
  })}`;
}

afterEach(() => mock.restoreAll());

// GET /api/menu - Public menu

test('GET /api/menu returns available items', async () => {
  const items = [{ name: 'Matcha Latte', price: 6 }];

  const find = mock.method(MenuItem, 'find', () => ({
    sort: async () => items,
  }));

  const res = await request(createApp()).get('/api/menu');

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { items });
  assert.deepEqual(find.mock.calls[0].arguments[0], {
    isAvailable: true,
  });
});

test('GET /api/menu returns an empty list', async () => {
  mock.method(MenuItem, 'find', () => ({
    sort: async () => [],
  }));

  const res = await request(createApp()).get('/api/menu');

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { items: [] });
});

// GET /api/menu/seasonal - Seasonal menu

test('GET /api/menu/seasonal returns available seasonal items', async () => {
  const items = [
    {
      name: 'Strawberry Matcha',
      price: 7,
      isSeasonal: true,
      isAvailable: true,
    },
  ];

  const find = mock.method(MenuItem, 'find', () => ({
    sort: async () => items,
  }));

  const res = await request(createApp()).get('/api/menu/seasonal');

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { items });

  assert.deepEqual(find.mock.calls[0].arguments[0], {
    isAvailable: true,
    isSeasonal: true,
  });
});

test('GET /api/menu/seasonal returns an empty list', async () => {
  mock.method(MenuItem, 'find', () => ({
    sort: async () => [],
  }));

  const res = await request(createApp()).get('/api/menu/seasonal');

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { items: [] });
});

test('GET /api/menu/seasonal handles database errors', async () => {
  mock.method(MenuItem, 'find', () => ({
    sort: async () => {
      throw new Error('db down');
    },
  }));

  mock.method(console, 'error', () => {});

  const res = await request(createApp()).get('/api/menu/seasonal');

  assert.equal(res.status, 500);
  assert.deepEqual(res.body, {
    error: 'Something went wrong',
  });
});

// General API error handling

test('unknown routes return 404 JSON', async () => {
  const res = await request(createApp()).get('/api/nope');

  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: 'Not found' });
});

test('database errors return a generic 500', async () => {
  mock.method(MenuItem, 'find', () => ({
    sort: async () => {
      throw new Error('db down');
    },
  }));

  mock.method(console, 'error', () => {});

  const res = await request(createApp()).get('/api/menu');

  assert.equal(res.status, 500);
  assert.deepEqual(res.body, {
    error: 'Something went wrong',
  });
});

// Admin menu management

test('GET /api/admin/menu requires an admin JWT', async () => {
  const res = await request(createApp()).get('/api/admin/menu');

  assert.equal(res.status, 401);
  assert.deepEqual(res.body, { error: 'Unauthorized' });
});

test('POST /api/menu creates an item for admins', async () => {
  const created = {
    name: 'Matcha Latte',
    description: 'Smooth matcha',
    price: 6.5,
    category: 'Drinks',
    imageUrl: 'https://example.com/images/matcha.webp',
    isSeasonal: false,
    isAvailable: true,
  };

  const create = mock.method(MenuItem, 'create', async (payload: Record<string, unknown>) => ({
    ...payload,
    _id: 'menu-1',
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
  }));

  const res = await request(createApp())
    .post('/api/menu')
    .set('Authorization', createAuthHeader('admin'))
    .send(created);

  assert.equal(res.status, 201);
  assert.deepEqual(res.body.item.name, 'Matcha Latte');
  assert.deepEqual(create.mock.calls[0].arguments[0], {
    name: 'Matcha Latte',
    description: 'Smooth matcha',
    price: 6.5,
    category: 'Drinks',
    imageUrl: 'https://example.com/images/matcha.webp',
    isSeasonal: false,
    isAvailable: true,
  });
});

test('POST /api/menu rejects invalid data or non-admins', async () => {
  const invalid = await request(createApp())
    .post('/api/menu')
    .set('Authorization', createAuthHeader('admin'))
    .send({ name: '', price: -1 });

  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body, { error: 'Name is required' });

  const forbidden = await request(createApp())
    .post('/api/menu')
    .set('Authorization', createAuthHeader('customer'))
    .send({ name: 'Matcha', price: 5 });

  assert.equal(forbidden.status, 403);
  assert.deepEqual(forbidden.body, { error: 'Admin access required' });
});

test('PUT /api/menu/:id hides and unhides items', async () => {
  const item = {
    _id: 'menu-2',
    name: 'Matcha Latte',
    price: 6.5,
    isAvailable: true,
    save: async function () {
      return this;
    },
  };

  const findById = mock.method(MenuItem, 'findById', async () => item);
  mock.method(MenuItem, 'find', () => ({
    sort: async () => [],
  }));

  const hide = await request(createApp())
    .put('/api/menu/507f1f77bcf86cd799439022')
    .set('Authorization', createAuthHeader('admin'))
    .send({ isAvailable: false });

  assert.equal(hide.status, 200);
  assert.equal(item.isAvailable, false);
  assert.deepEqual(hide.body.item.isAvailable, false);

  const publicHidden = await request(createApp()).get('/api/menu');
  assert.equal(publicHidden.status, 200);
  assert.deepEqual(publicHidden.body.items, []);

  const unhide = await request(createApp())
    .put('/api/menu/507f1f77bcf86cd799439022')
    .set('Authorization', createAuthHeader('admin'))
    .send({ isAvailable: true });

  assert.equal(unhide.status, 200);
  assert.equal(item.isAvailable, true);
  assert.deepEqual(findById.mock.calls.length, 2);

  const publicVisible = await request(createApp()).get('/api/menu');
  assert.equal(publicVisible.status, 200);
  assert.deepEqual(publicVisible.body.items, []);
});

test('PUT /api/menu/:id returns 404 for unknown IDs', async () => {
  mock.method(MenuItem, 'findById', async () => null);

  const res = await request(createApp())
    .put('/api/menu/507f1f77bcf86cd799439099')
    .set('Authorization', createAuthHeader('admin'))
    .send({ isAvailable: false });

  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: 'Menu item not found' });
});

test('DELETE /api/menu/:id permanently removes an item', async () => {
  const item = {
    _id: 'menu-3',
    deleteOne: async () => undefined,
  };

  const findById = mock.method(MenuItem, 'findById', async () => item);

  const res = await request(createApp())
    .delete('/api/menu/507f1f77bcf86cd799439033')
    .set('Authorization', createAuthHeader('admin'));

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { message: 'Menu item deleted.' });
  assert.equal(findById.mock.calls.length, 1);
});

test('DELETE /api/menu/:id returns 404 for unknown IDs', async () => {
  mock.method(MenuItem, 'findById', async () => null);

  const res = await request(createApp())
    .delete('/api/menu/507f1f77bcf86cd799439099')
    .set('Authorization', createAuthHeader('admin'));

  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: 'Menu item not found' });
});

// Upload route

test('POST /api/uploads accepts an admin-uploaded image URL', async () => {
  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
  ]);

  mock.method(S3Client.prototype, 'send', async () => ({ ok: true }));

  const res = await request(createApp())
    .post('/api/uploads')
    .set('Authorization', createAuthHeader('admin'))
    .attach('image', pngBytes, {
      filename: 'matcha.png',
      contentType: 'image/png',
    });

  assert.equal(res.status, 201);
  assert.equal(typeof res.body.imageUrl, 'string');
  assert.match(res.body.imageUrl, /^https?:\/\//);
});
