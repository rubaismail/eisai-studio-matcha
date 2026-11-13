// Integration tests (issue #33): the real app, real Mongoose models and a real
// MongoDB (local, throwaway, named eisai_test). Only outgoing email is replaced,
// so the test can read the link a user would have clicked.
import { clearDatabase, stopTestDatabase } from './testDatabase.js';
import { test, mock, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import request from 'supertest';

type Sent = { to: string; rawToken: string };
const verificationEmails: Sent[] = [];
const resetEmails: Sent[] = [];

const realEmail = await import('../../src/services/email.js');
mock.module('../../src/services/email.js', {
  namedExports: {
    ...realEmail,
    sendVerificationEmail: async (to: string, rawToken: string) => {
      verificationEmails.push({ to, rawToken });
    },
    sendResetPasswordEmail: async (to: string, rawToken: string) => {
      resetEmails.push({ to, rawToken });
    },
  },
});

process.env.RATE_LIMIT_DISABLED = '1';
const { createApp } = await import('../../src/app.js');
const { User } = await import('../../src/models/User.js');
const { MenuItem } = await import('../../src/models/MenuItem.js');

const app = createApp();

beforeEach(async () => {
  await clearDatabase();
  verificationEmails.length = 0;
  resetEmails.length = 0;
});

after(stopTestDatabase);

const sha256 = (raw: string) => createHash('sha256').update(raw).digest('hex');

function lastTokenFor(sent: Sent[], email: string) {
  const match = sent.filter((s) => s.to === email).at(-1);
  assert.ok(match, `expected an email to ${email}`);
  return match.rawToken;
}

/** Registers, clicks the emailed verify link, logs in. Returns the login token. */
async function signUp(email: string, password = 'CorrectHorse123') {
  const register = await request(app)
    .post('/api/auth/register')
    .send({ firstName: 'Test', lastName: 'User', email, password });
  assert.equal(register.status, 201);

  const verify = await request(app)
    .get('/api/auth/verify')
    .query({ token: lastTokenFor(verificationEmails, email) });
  assert.equal(verify.status, 200);

  const login = await request(app).post('/api/auth/login').send({ email, password });
  assert.equal(login.status, 200);
  return login.body.token as string;
}

/** Admins are promoted in the database, as described in docs/admin-account-setup.md. */
async function signUpAdmin(email: string, password = 'CorrectHorse123') {
  await signUp(email, password);
  await User.updateOne({ email }, { $set: { role: 'admin' } });
  const login = await request(app).post('/api/auth/login').send({ email, password });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, 'admin');
  return login.body.token as string;
}

test('health check reports the database as connected', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});

test('full run: register -> verify -> login -> admin adds item -> appears on menu', async () => {
  const email = 'customer@example.com';
  const password = 'CorrectHorse123';

  // Register: the account is saved unverified, with only a hash of the token.
  const register = await request(app)
    .post('/api/auth/register')
    .send({ firstName: 'Casey', lastName: 'Customer', email, password });
  assert.equal(register.status, 201);
  const rawToken = lastTokenFor(verificationEmails, email);
  const saved = await User.findOne({ email }).select('+verificationToken +passwordHash').lean();
  assert.ok(saved);
  assert.equal(saved.isVerified, false);
  assert.equal(saved.role, 'customer');
  assert.equal(saved.verificationToken, sha256(rawToken));
  assert.notEqual(saved.passwordHash, password);

  // Login is blocked until the email is verified.
  const early = await request(app).post('/api/auth/login').send({ email, password });
  assert.equal(early.status, 403);

  // Verify: the link works once, then the token is gone from the database.
  assert.equal((await request(app).get('/api/auth/verify').query({ token: rawToken })).status, 200);
  assert.equal((await request(app).get('/api/auth/verify').query({ token: rawToken })).status, 400);
  const verified = await User.findOne({ email }).select('+verificationToken').lean();
  assert.equal(verified?.isVerified, true);
  assert.equal(verified?.verificationToken, undefined);

  // Login now succeeds, but a customer cannot add menu items.
  const login = await request(app).post('/api/auth/login').send({ email, password });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, 'customer');
  const customerToken = login.body.token as string;
  const forbidden = await request(app)
    .post('/api/menu')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ name: 'Sneaky Latte', price: 1 });
  assert.equal(forbidden.status, 403);

  // Admin adds an item.
  const adminToken = await signUpAdmin('owner@example.com');
  const created = await request(app)
    .post('/api/menu')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Hojicha Cloud Latte',
      description: 'Roasted hojicha with cold foam.',
      price: 6.5,
      teaBases: ['hojicha'],
      imageAlt: 'A layered hojicha latte in a clear cup',
    });
  assert.equal(created.status, 201);
  const itemId = created.body.item._id as string;

  // It is stored in the database...
  const stored = await MenuItem.findById(itemId).lean();
  assert.equal(stored?.name, 'Hojicha Cloud Latte');
  assert.equal(stored?.price, 6.5);
  assert.equal(stored?.isAvailable, true);
  assert.equal(await MenuItem.countDocuments({ name: 'Sneaky Latte' }), 0);

  // ...and appears on the public menu, with no login needed.
  const menu = await request(app).get('/api/menu');
  assert.equal(menu.status, 200);
  assert.deepEqual(
    menu.body.items.map((i: { _id: string; name: string }) => [i._id, i.name]),
    [[itemId, 'Hojicha Cloud Latte']],
  );
});

test('hiding an item removes it from the public menu but not the admin list; deleting removes it', async () => {
  const adminToken = await signUpAdmin('owner@example.com');
  const auth = { Authorization: `Bearer ${adminToken}` };

  const created = await request(app).post('/api/menu').set(auth).send({ name: 'Yuzu Matcha', price: 7 });
  const id = created.body.item._id as string;

  const hide = await request(app).put(`/api/menu/${id}`).set(auth).send({ isAvailable: false });
  assert.equal(hide.status, 200);
  assert.deepEqual((await request(app).get('/api/menu')).body, { items: [] });
  const adminList = await request(app).get('/api/admin/menu').set(auth);
  assert.equal(adminList.status, 200);
  assert.deepEqual(adminList.body.items.map((i: { _id: string }) => i._id), [id]);

  assert.equal((await request(app).delete(`/api/menu/${id}`).set(auth)).status, 200);
  assert.equal(await MenuItem.countDocuments(), 0);
});

test('the unique email index rejects a second account with the same address', async () => {
  await signUp('dup@example.com');
  const again = await request(app)
    .post('/api/auth/register')
    .send({ firstName: 'Other', lastName: 'Person', email: '  DUP@example.com ', password: 'AnotherPass123' });
  assert.equal(again.status, 409);
  assert.equal(await User.countDocuments({ email: 'dup@example.com' }), 1);

  // The database itself enforces it, not only the controller's pre-check.
  await assert.rejects(
    User.create({ firstName: 'A', lastName: 'B', email: 'dup@example.com', passwordHash: 'x' }),
    (err: { code?: number }) => err.code === 11000,
  );
});

test('password reset: new password works, old one and the used link do not', async () => {
  const email = 'forgetful@example.com';
  await signUp(email, 'OriginalPass123');

  assert.equal((await request(app).post('/api/auth/forgot-password').send({ email })).status, 200);
  const raw = lastTokenFor(resetEmails, email);
  const pending = await User.findOne({ email }).select('+resetPasswordToken').lean();
  assert.equal(pending?.resetPasswordToken, sha256(raw));

  // Opening the link checks it without using it up (issue #113).
  const check = () => request(app).get('/api/auth/reset-password/check').query({ token: raw });
  assert.equal((await check()).status, 200);
  assert.equal((await check()).status, 200);
  const stillPending = await User.findOne({ email }).select('+resetPasswordToken').lean();
  assert.equal(stillPending?.resetPasswordToken, sha256(raw));
  assert.equal(
    (await request(app).get('/api/auth/reset-password/check').query({ token: 'not-the-token' })).status,
    400,
  );

  const reset = await request(app)
    .post('/api/auth/reset-password')
    .query({ token: raw })
    .send({ password: 'BrandNewPass123' });
  assert.equal(reset.status, 200);
  const reused = await request(app)
    .post('/api/auth/reset-password')
    .query({ token: raw })
    .send({ password: 'ThirdPass12345' });
  assert.equal(reused.status, 400);
  // After a successful reset, reopening the link is reported as used.
  assert.equal((await check()).status, 400);

  const oldLogin = await request(app).post('/api/auth/login').send({ email, password: 'OriginalPass123' });
  assert.equal(oldLogin.status, 401);
  const newLogin = await request(app).post('/api/auth/login').send({ email, password: 'BrandNewPass123' });
  assert.equal(newLogin.status, 200);
});

test('deleting an account removes it and its login stops working; the last admin is kept', async () => {
  const customerToken = await signUp('leaving@example.com', 'LeavingPass123');
  const del = await request(app)
    .post('/api/auth/delete-account')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ password: 'LeavingPass123' });
  assert.equal(del.status, 200);
  assert.equal(await User.countDocuments({ email: 'leaving@example.com' }), 0);
  const after = await request(app)
    .post('/api/auth/delete-account')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ password: 'LeavingPass123' });
  assert.equal(after.status, 401);

  const adminToken = await signUpAdmin('only-admin@example.com', 'AdminPass1234');
  const blocked = await request(app)
    .post('/api/auth/delete-account')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ password: 'AdminPass1234' });
  assert.equal(blocked.status, 409);
  assert.equal(await User.countDocuments({ role: 'admin' }), 1);
});
