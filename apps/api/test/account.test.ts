import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { requireJwtSecret } from '../src/config/env.js';
import { createAccountLimiters } from '../src/middleware/loginRateLimit.js';

afterEach(() => mock.restoreAll());

const userId = '507f1f77bcf86cd799439011';
const password = 'ExamplePassword123!';
const passwordHash = bcrypt.hashSync(password, 4);
const URL = '/api/auth/delete-account';

function token(sub = userId) {
  return jwt.sign({}, requireJwtSecret(), {
    subject: sub,
    expiresIn: '1h',
    algorithm: 'HS256',
  });
}

// One fake account that requireAuth (findById) and the controller
// (findById().select('+passwordHash')) both read. deleteOne removes it.
function mockAccount({
  role = 'customer',
  admins = 1,
  deletedCount = 1,
}: {
  role?: 'customer' | 'admin';
  admins?: number;
  deletedCount?: number;
} = {}) {
  let exists = true;
  const user = {
    id: userId,
    _id: userId,
    role,
    isVerified: true,
    passwordHash,
  };
  const found = () => (exists ? user : null);

  mock.method(User, 'findById', () => ({
    // requireAuth awaits the query directly; the controller calls .select().
    then: (resolve: (v: unknown) => void) => resolve(found()),
    select: async () => found(),
  }));
  const countDocuments = mock.method(
    User,
    'countDocuments',
    async () => admins,
  );
  const deleteOne = mock.method(User, 'deleteOne', async () => {
    exists = false;
    return { deletedCount };
  });

  return { countDocuments, deleteOne };
}

function del(body: unknown, auth: string | null = `Bearer ${token()}`) {
  const req = request(createApp()).post(URL);
  if (auth) req.set('Authorization', auth);
  return req.send(body as object);
}

test('deletes the signed-in customer with the correct password', async () => {
  const { deleteOne, countDocuments } = mockAccount();

  const res = await del({ password });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { message: 'Account deleted.' });
  assert.equal(deleteOne.mock.callCount(), 1);
  assert.deepEqual(deleteOne.mock.calls[0].arguments[0], { _id: userId });
  // Customers don't trigger the last-admin check.
  assert.equal(countDocuments.mock.callCount(), 0);
});

test('the login token stops working once the account is deleted', async () => {
  mockAccount();
  const auth = `Bearer ${token()}`;

  assert.equal((await del({ password }, auth)).status, 200);

  const again = await del({ password }, auth);
  assert.equal(again.status, 401);

  const admin = await request(createApp())
    .get('/api/admin/menu')
    .set('Authorization', auth);
  assert.equal(admin.status, 401);
});

test('rejects a wrong password with 403 (not 401, which clients treat as signed out)', async () => {
  const { deleteOne } = mockAccount();

  const res = await del({ password: 'WrongPassword123!' });

  assert.equal(res.status, 403);
  assert.deepEqual(res.body, { error: 'Incorrect password' });
  assert.equal(deleteOne.mock.callCount(), 0);
});

test('rejects a missing, empty, non-string or extra-field body', async () => {
  const { deleteOne } = mockAccount();

  for (const body of [
    {},
    { password: '' },
    { password: 123 },
    { password: null },
    { password, email: 'test@example.com' },
    [password],
  ]) {
    const res = await del(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.deepEqual(res.body, { error: 'Enter your current password' });
  }
  assert.equal(deleteOne.mock.callCount(), 0);
});

test('requires a valid login token', async () => {
  const { deleteOne } = mockAccount();

  assert.equal((await del({ password }, null)).status, 401);
  assert.equal((await del({ password }, 'Bearer not-a-jwt')).status, 401);
  const expired = jwt.sign({}, requireJwtSecret(), {
    subject: userId,
    expiresIn: -10,
    algorithm: 'HS256',
  });
  assert.equal((await del({ password }, `Bearer ${expired}`)).status, 401);
  assert.equal(deleteOne.mock.callCount(), 0);
});

test('refuses to delete the only admin account', async () => {
  const { deleteOne } = mockAccount({ role: 'admin', admins: 1 });

  const res = await del({ password });

  assert.equal(res.status, 409);
  assert.match(res.body.error, /only admin account/);
  assert.equal(deleteOne.mock.callCount(), 0);
});

test('an admin can delete their account when another admin exists', async () => {
  const { deleteOne, countDocuments } = mockAccount({
    role: 'admin',
    admins: 2,
  });

  const res = await del({ password });

  assert.equal(res.status, 200);
  // Only verified admins can log in, so only they count as a remaining admin.
  assert.deepEqual(countDocuments.mock.calls[0].arguments[0], {
    role: 'admin',
    isVerified: true,
  });
  assert.equal(deleteOne.mock.callCount(), 1);
});

test('reports 401 if a simultaneous request already deleted the account', async () => {
  mockAccount({ deletedCount: 0 });

  const res = await del({ password });

  assert.equal(res.status, 401);
  assert.deepEqual(res.body, { error: 'Invalid token' });
});

function limiterApp(signedIn: () => string | null, ipLimit = 100) {
  const { beforeAuth, afterAuth } = createAccountLimiters({
    ipLimit,
    userLimit: 2,
    windowMs: 1000,
  });
  const app = express();
  app.use(express.json());
  app.post(
    '/delete',
    ...beforeAuth,
    (_req, res, next) => {
      const id = signedIn();
      if (!id) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
      res.locals.authUser = { id };
      next();
    },
    ...afterAuth,
    (_req, res) => res.json({ ok: true }),
  );
  return app;
}

test('account limiter counts attempts per signed-in user', async () => {
  let current = 'user-a';
  const app = limiterApp(() => current);

  assert.equal((await request(app).post('/delete')).status, 200);
  assert.equal((await request(app).post('/delete')).status, 200);
  const blocked = await request(app).post('/delete');
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers['retry-after']);

  // A different account isn't affected by user-a's attempts.
  current = 'user-b';
  assert.equal((await request(app).post('/delete')).status, 200);
});

test('the IP limit also counts requests with bad tokens', async () => {
  const app = limiterApp(() => null, 3);

  for (let i = 0; i < 3; i++) {
    assert.equal((await request(app).post('/delete')).status, 401);
  }
  assert.equal((await request(app).post('/delete')).status, 429);
});

test('the per-account limiter refuses to run before requireAuth', async () => {
  const { afterAuth } = createAccountLimiters();
  const app = express();
  app.post('/delete', ...afterAuth, (_req, res) => res.json({ ok: true }));
  app.use(
    (
      _err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(500).json({ error: 'misconfigured' });
    },
  );

  assert.equal((await request(app).post('/delete')).status, 500);
});
