import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MenuItem } from '../src/models/MenuItem.js';

afterEach(() => mock.restoreAll());

test('GET /api/menu returns available items', async () => {
  const items = [{ name: 'Matcha Latte', price: 6 }];
  const find = mock.method(MenuItem, 'find', () => ({
    sort: async () => items,
  }));

  const res = await request(createApp()).get('/api/menu');

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { items });
  assert.deepEqual(find.mock.calls[0].arguments[0], { isAvailable: true });
});

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
  assert.deepEqual(res.body, { error: 'Something went wrong' });
});
