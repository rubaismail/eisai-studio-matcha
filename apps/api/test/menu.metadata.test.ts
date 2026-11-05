import { afterEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import type { HydratedDocument } from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { requireJwtSecret } from '../src/config/env.js';
import { MenuItem, type MenuItemDoc } from '../src/models/MenuItem.js';
import { User } from '../src/models/User.js';

const id = '507f1f77bcf86cd799439022';
const fields = ['inspiredBy', 'imageAlt'] as const;
const listPaths = [
  '/api/menu',
  '/api/menu/seasonal',
  '/api/admin/menu',
  '/api/menu/admin/menu',
  '/api/menu/admin-menu',
];
afterEach(() => mock.restoreAll());

function authorization(role = 'admin') {
  mock.method(User, 'findById', async () => ({ id, role, isVerified: true }));
  return `Bearer ${jwt.sign({}, requireJwtSecret(), { subject: id, algorithm: 'HS256', expiresIn: '1h' })}`;
}

// Store plain records and rehydrate on every read, exercising real Mongoose
// defaults, setters, validation and JSON serialization without a live database.
function store(initial: Record<string, unknown>[] = []) {
  const records = new Map(
    initial.map((record) => [String(record._id), record]),
  );
  let writes = 0;
  mock.method(
    MenuItem.prototype,
    'save',
    async function (this: HydratedDocument<MenuItemDoc>) {
      await this.validate();
      records.set(String(this._id), this.toObject());
      writes++;
      return this;
    },
  );
  mock.method(MenuItem, 'create', async (payload: Record<string, unknown>) =>
    new MenuItem(payload).save(),
  );
  mock.method(MenuItem, 'findById', async (key: string) => {
    const record = records.get(key);
    return record ? MenuItem.hydrate(record) : null;
  });
  mock.method(MenuItem, 'find', (query: Record<string, unknown>) => ({
    sort: async () =>
      [...records.values()]
        .filter((record) =>
          Object.entries(query).every(([key, value]) => record[key] === value),
        )
        .map((record) => MenuItem.hydrate(record)),
  }));
  return { records, writes: () => writes };
}

const legacy = {
  _id: id,
  name: 'Legacy Matcha',
  price: 6,
  isAvailable: true,
  isSeasonal: true,
};

test('metadata is trimmed, saved and returned across every menu listing', async () => {
  store();
  const auth = authorization();
  const app = createApp();
  const response = await request(app)
    .post('/api/menu')
    .set('Authorization', auth)
    .send({
      name: 'Golden Hour',
      price: 7,
      description: 'Banana milk',
      imageUrl: 'https://example.com/first.png',
      inspiredBy: '  Banana bread  ',
      imageAlt: '  Matcha over banana milk  ',
      teaBases: ['matcha', 'hojicha'],
      isRecommended: false,
      isFeatured: true,
      isSeasonal: true,
    });
  assert.equal(response.status, 201);
  assert.equal(response.body.item.inspiredBy, 'Banana bread');
  assert.equal(response.body.item.imageAlt, 'Matcha over banana milk');
  assert.equal(response.body.item.description, 'Banana milk');
  assert.equal(response.body.item.isRecommended, false);
  assert.equal(response.body.item.isFeatured, true);
  assert.equal(response.body.item.isSeasonal, true);
  assert.deepEqual(response.body.item.teaBases, ['matcha', 'hojicha']);
  for (const path of listPaths) {
    const read = await request(app).get(path).set('Authorization', auth);
    assert.equal(read.status, 200, path);
    assert.deepEqual(read.body.items, [response.body.item], path);
  }
});

test('partial updates preserve metadata, accept plain text, and explicitly clear it', async () => {
  store([{ ...legacy, inspiredBy: 'Original', imageAlt: 'Original photo' }]);
  const auth = authorization();
  const app = createApp();
  const update = (body: object) =>
    request(app).put(`/api/menu/${id}`).set('Authorization', auth).send(body);
  const changed = await update({
    inspiredBy: '  <b>Tea & cake</b>  ',
    imageAlt: '  New photo  ',
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.item.inspiredBy, '<b>Tea & cake</b>');
  assert.equal(changed.body.item.imageAlt, 'New photo');
  const replaced = await update({
    imageUrl: 'https://example.com/replacement.png',
  });
  assert.equal(replaced.status, 200);
  assert.equal(replaced.body.item.inspiredBy, '<b>Tea & cake</b>');
  assert.equal(replaced.body.item.imageAlt, 'New photo');
  const removed = await update({ imageUrl: '', imageAlt: '' });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.item.imageAlt, '');
  assert.equal(removed.body.item.inspiredBy, '<b>Tea & cake</b>');
  const cleared = await update({ inspiredBy: ' \t\n ', imageAlt: '' });
  assert.equal(cleared.status, 200);
  for (const path of listPaths) {
    const read = await request(app).get(path).set('Authorization', auth);
    assert.equal(read.status, 200);
    assert.equal(read.body.items[0].inspiredBy, '');
    assert.equal(read.body.items[0].imageAlt, '');
  }
});

test('new and legacy records receive empty defaults without a migration', async () => {
  const database = store([legacy]);
  const auth = authorization();
  const app = createApp();
  for (const path of listPaths) {
    const read = await request(app).get(path).set('Authorization', auth);
    assert.equal(read.status, 200);
    assert.equal(read.body.items[0].inspiredBy, '', path);
    assert.equal(read.body.items[0].imageAlt, '', path);
  }
  assert.equal(database.writes(), 0);
  assert.equal(Object.hasOwn(database.records.get(id)!, 'imageAlt'), false);
  const updated = await request(app)
    .put(`/api/menu/${id}`)
    .set('Authorization', auth)
    .send({ price: 8 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.item.inspiredBy, '');
  assert.equal(updated.body.item.imageAlt, '');
  const created = await request(app)
    .post('/api/menu')
    .set('Authorization', auth)
    .send({ name: 'New', price: 4 });
  assert.equal(created.status, 201);
  assert.equal(created.body.item.inspiredBy, '');
  assert.equal(created.body.item.imageAlt, '');
});

for (const field of fields) {
  for (const value of [null, 123, true, [], {}, ['text']]) {
    test(`rejects ${field}=${JSON.stringify(value)} on create/update without writes`, async () => {
      const database = store([
        { ...legacy, inspiredBy: 'Keep', imageAlt: 'Keep photo' },
      ]);
      const original = structuredClone(database.records.get(id));
      const auth = authorization();
      mock.method(console, 'error', () => {});
      const app = createApp();
      const created = await request(app)
        .post('/api/menu')
        .set('Authorization', auth)
        .send({ name: 'New', price: 4, [field]: value });
      const updated = await request(app)
        .put(`/api/menu/${id}`)
        .set('Authorization', auth)
        .send({ name: 'Must not change', [field]: value });
      assert.equal(created.status, 400);
      assert.equal(updated.status, 400);
      assert.equal(database.writes(), 0);
      assert.deepEqual(database.records.get(id), original);
    });
  }
}

test('unknown fields still reject the entire write even with valid metadata', async () => {
  const database = store([legacy]);
  const auth = authorization();
  mock.method(console, 'error', () => {});
  const app = createApp();
  const payload = {
    name: 'New',
    price: 4,
    inspiredBy: 'Valid',
    imageAlt: 'Valid',
    unknown: 'reject',
  };
  assert.equal(
    (
      await request(app)
        .post('/api/menu')
        .set('Authorization', auth)
        .send(payload)
    ).status,
    400,
  );
  assert.equal(
    (
      await request(app)
        .put(`/api/menu/${id}`)
        .set('Authorization', auth)
        .send(payload)
    ).status,
    400,
  );
  assert.equal(database.writes(), 0);
});

for (const role of ['anonymous', 'customer']) {
  test(`${role} cannot create or update metadata`, async () => {
    const database = store([legacy]);
    const app = createApp();
    const auth = role === 'anonymous' ? '' : authorization(role);
    const payload = { name: 'New', price: 4, inspiredBy: 'No', imageAlt: 'No' };
    assert.equal(
      (
        await request(app)
          .post('/api/menu')
          .set('Authorization', auth)
          .send(payload)
      ).status,
      role === 'anonymous' ? 401 : 403,
    );
    assert.equal(
      (
        await request(app)
          .put(`/api/menu/${id}`)
          .set('Authorization', auth)
          .send(payload)
      ).status,
      role === 'anonymous' ? 401 : 403,
    );
    assert.equal(database.writes(), 0);
  });
}

test('metadata does not change hidden-item filtering or independent display flags', async () => {
  store([
    {
      ...legacy,
      inspiredBy: 'Cake',
      imageAlt: 'Cup',
      isAvailable: false,
      isFeatured: true,
      isRecommended: false,
    },
  ]);
  const auth = authorization();
  const app = createApp();
  const changed = await request(app)
    .put(`/api/menu/${id}`)
    .set('Authorization', auth)
    .send({ imageAlt: 'Updated cup' });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.item.isAvailable, false);
  assert.equal(changed.body.item.isFeatured, true);
  assert.equal(changed.body.item.isRecommended, false);
  assert.equal(changed.body.item.isSeasonal, true);
  for (const path of listPaths) {
    const read = await request(app).get(path).set('Authorization', auth);
    assert.equal(read.status, 200);
    if (path === '/api/menu' || path === '/api/menu/seasonal')
      assert.deepEqual(read.body.items, []);
    else {
      assert.equal(read.body.items.length, 1);
      assert.equal(read.body.items[0].imageAlt, 'Updated cup');
      assert.equal(read.body.items[0].inspiredBy, 'Cake');
    }
  }
});
