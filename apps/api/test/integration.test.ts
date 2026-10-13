import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { MongoClient } from 'mongodb';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type { MenuItem } from '../src/menu.js';
test('real MongoDB: repeated seed preserves edits; public API excludes drafts', async () => {
  // Hard-coded loopback and unique test DB: never read a developer/Atlas URI.
  const uri = 'mongodb://127.0.0.1:27017';
  const database = `eisai_dev_test_${process.pid}_${Date.now()}`;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(database);
  const seed = () =>
    execFileSync(process.execPath, ['--import', 'tsx', 'src/seed.ts'], {
      env: {
        ...process.env,
        NODE_ENV: 'development',
        MONGODB_URI: uri,
        MONGODB_DB: database,
        ALLOW_DEV_SEED: 'true',
      },
      stdio: 'pipe',
    });
  try {
    seed();
    const menu = db.collection<MenuItem>('menuItems');
    assert.equal(await menu.countDocuments(), 2);
    await menu.updateOne(
      { slug: 'sample-classic-matcha' },
      { $set: { name: 'Edited sample' } },
    );
    seed();
    assert.equal(await menu.countDocuments(), 2);
    assert.equal(
      (await menu.findOne({ slug: 'sample-classic-matcha' }))?.name,
      'Edited sample',
    );
    await menu.insertOne({
      slug: 'draft',
      name: 'Unpublished',
      description: '',
      priceCents: 1,
      published: false,
    });
    const app = createApp({
      origin: 'http://localhost:5173',
      ping: () => db.command({ ping: 1 }),
      listMenu: () =>
        menu.find({ published: true }, { projection: { _id: 0 } }).toArray(),
    });
    await request(app).get('/api/health').expect(200);
    const response = await request(app).get('/api/menu').expect(200);
    assert.equal(response.body.items.length, 2);
    assert.ok(
      response.body.items.every((item: MenuItem) => item.slug !== 'draft'),
    );
  } finally {
    await db.dropDatabase();
    await client.close();
  }
});
