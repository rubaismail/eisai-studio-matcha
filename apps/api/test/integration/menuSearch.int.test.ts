// Menu search against a real MongoDB (course requirement: the search must query
// the server and support partial matching). Uses the same throwaway local
// database as flow.int.test.ts.
import { clearDatabase, stopTestDatabase } from './testDatabase.js';
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

const { createApp } = await import('../../src/app.js');
const { MenuItem } = await import('../../src/models/MenuItem.js');

const app = createApp();

before(async () => {
  await clearDatabase();
  await MenuItem.create([
    { name: 'Iced Matcha Latte', price: 6, description: 'Ceremonial matcha, oat milk' },
    { name: 'Iced Hojicha Latte', price: 6, description: 'Roasted green tea' },
    { name: 'Tokyo Rose', price: 7, description: 'Rose syrup', inspiredBy: 'Spring in Tokyo' },
    { name: 'Hidden Matcha Special', price: 8, isAvailable: false },
  ]);
});

after(stopTestDatabase);

const names = (res: request.Response) =>
  (res.body.items as { name: string }[]).map((item) => item.name);

test('a partial word matches, ignoring case', async () => {
  const res = await request(app).get('/api/menu').query({ search: 'mAtC' });
  assert.equal(res.status, 200);
  assert.deepEqual(names(res), ['Iced Matcha Latte']);
});

test('matches the description and "inspired by" text too', async () => {
  const roasted = await request(app).get('/api/menu').query({ search: 'roast' });
  const tokyo = await request(app).get('/api/menu').query({ search: 'spring' });
  assert.deepEqual(names(roasted), ['Iced Hojicha Latte']);
  assert.deepEqual(names(tokyo), ['Tokyo Rose']);
});

test('several matches come back sorted by name', async () => {
  const res = await request(app).get('/api/menu').query({ search: 'latte' });
  assert.deepEqual(names(res), ['Iced Hojicha Latte', 'Iced Matcha Latte']);
});

test('hidden drinks never appear in search results', async () => {
  const res = await request(app).get('/api/menu').query({ search: 'special' });
  assert.deepEqual(names(res), []);
});

test('no search returns the whole public menu', async () => {
  const res = await request(app).get('/api/menu');
  assert.equal(res.body.items.length, 3);
});

test('a null byte is a 400, not a database error', async () => {
  const res = await request(app).get('/api/menu?search=a%00b');
  assert.equal(res.status, 400);
});

test('regex characters are searched as plain text', async () => {
  const res = await request(app).get('/api/menu').query({ search: '.*' });
  assert.deepEqual(names(res), []);
});
