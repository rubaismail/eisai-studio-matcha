import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { readConfig, assertSeedAllowed } from '../src/config.js';
import { createApp } from '../src/app.js';
const env = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017',
  MONGODB_DB: 'eisai_dev_test',
  ALLOW_DEV_SEED: 'true',
};
test('seed guard rejects production, staging, missing opt-in and unsafe names', () => {
  assert.doesNotThrow(() => assertSeedAllowed(readConfig(env)));
  for (const override of [
    { NODE_ENV: 'production' },
    { MONGODB_DB: 'eisai_prod' },
    { MONGODB_DB: 'eisai_dev_' },
    { ALLOW_DEV_SEED: 'false' },
  ]) {
    assert.throws(() => assertSeedAllowed(readConfig({ ...env, ...override })));
  }
});
test('configuration errors identify keys without revealing connection credentials', () => {
  assert.throws(
    () => readConfig({ ...env, MONGODB_URI: 'secret-value', API_PORT: 'oops' }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /MONGODB_URI/);
      assert.doesNotMatch(error.message, /secret-value/);
      return true;
    },
  );
});
test('readiness reports database failure and errors do not expose internals', async () => {
  const app = createApp({
    origin: 'http://localhost:5173',
    ping: async () => {
      throw new Error('private connection string');
    },
    listMenu: async () => {
      throw new Error('secret');
    },
  });
  const health = await request(app).get('/api/health').expect(503);
  assert.equal(health.body.database, 'disconnected');
  const menu = await request(app).get('/api/menu').expect(500);
  assert.deepEqual(menu.body, { error: 'Request failed' });
  await request(app).get('/missing').expect(404);
});
test('API returns sample contract and enables only the configured browser origin', async () => {
  const app = createApp({
    origin: 'http://localhost:5173',
    ping: async () => {},
    listMenu: async () => [],
  });
  const res = await request(app)
    .get('/api/menu')
    .set('Origin', 'http://localhost:5173')
    .expect(200);
  assert.deepEqual(res.body, { items: [] });
  assert.equal(
    res.headers['access-control-allow-origin'],
    'http://localhost:5173',
  );
  const other = await request(app)
    .get('/api/menu')
    .set('Origin', 'http://untrusted.test')
    .expect(200);
  assert.notEqual(
    other.headers['access-control-allow-origin'],
    'http://untrusted.test',
  );
});
