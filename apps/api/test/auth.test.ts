import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User.js';
import { env } from '../src/config/env.js';
import { createHash } from 'node:crypto';

// ---- Email module mock ------------------------------------------------------
// Registered BEFORE createApp is imported so the controller binds to this mock.
// Behavior is swapped per test via `emailImpl`; calls are recorded in `emailCalls`.

type EmailCall = { to: string; rawToken: string };
let emailCalls: EmailCall[] = [];
let emailImpl: (to: string, rawToken: string) => Promise<void> = async () => {};

mock.module('../src/services/email.js', {
  namedExports: {
    sendVerificationEmail: async (to: string, rawToken: string) => {
      emailCalls.push({ to, rawToken });
      return emailImpl(to, rawToken);
    },
  },
});

// Static import AFTER mock.module so the app picks up the mocked module.
const { createApp } = await import('../src/app.js');

afterEach(() => {
  mock.restoreAll();
  emailCalls = [];
  emailImpl = async () => {};
});

const MSG_CREATED = 'Account created. Check your email to verify your account.';
const MSG_BAD_INPUT =
  'Missing or invalid input, malformed ID, or invalid, expired or used action token.';
const MSG_DUPLICATE = 'Email address already registered.';
const MSG_INTERNAL =
  'Unexpected server, database, email or storage error. Do not expose internal details.';
const MSG_RESEND =
  'If this account needs verification, a verification email has been sent.';

const validBody = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  password: 'ExamplePassword123',
};

// register(): await User.findOne({ email }).lean()
function mockRegisterFindOneNone() {
  return mock.method(User, 'findOne', () => ({
    lean: async () => null,
  }));
}

// register(): await User.findOne({ email }).lean() returning a doc
function mockRegisterFindOneExisting() {
  return mock.method(User, 'findOne', () => ({
    lean: async () => ({ id: 'existing' }),
  }));
}

// resend(): await User.findOne({ email })  (awaited directly)
function mockResendFindOne(value: unknown) {
  return mock.method(User, 'findOne', async () => value);
}

function mockCreateSuccess() {
  return mock.method(User, 'create', async (doc: Record<string, unknown>) => ({
    ...doc,
    id: '507f1f77bcf86cd799439011',
  }));
}

// ---- Registration: success and normalization --------------------------------

test('registration creates a customer with hashed password and token', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();

  const res = await request(createApp())
    .post('/api/auth/register')
    .send(validBody);

  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { message: MSG_CREATED });

  const doc = create.mock.calls[0].arguments[0] as Record<string, unknown>;
  assert.equal(doc.firstName, 'Jane');
  assert.equal(doc.lastName, 'Doe');
  assert.equal(doc.email, 'jane@example.com');
  assert.equal(doc.role, 'customer');
  assert.equal(doc.isVerified, false);
  assert.match(doc.passwordHash as string, /^\$2[aby]\$10\$/);
  assert.notEqual(doc.passwordHash, validBody.password);
  assert.equal(typeof doc.verificationToken, 'string');
  assert.ok(doc.verificationTokenExpires instanceof Date);
  assert.ok((doc.verificationTokenExpires as Date).getTime() > Date.now());

  assert.equal(emailCalls.length, 1);
  assert.equal(emailCalls[0].to, 'jane@example.com');
  assert.equal(
    doc.verificationToken,
    createHash('sha256').update(emailCalls[0].rawToken).digest('hex'),
  );
});

test('registration trims names and normalizes email', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();

  const res = await request(createApp())
    .post('/api/auth/register')
    .send({
      firstName: '  Jane  ',
      lastName: '  Doe  ',
      email: '  Jane@Example.COM  ',
      password: validBody.password,
    });

  assert.equal(res.status, 201);

  const doc = create.mock.calls[0].arguments[0] as Record<string, unknown>;
  assert.equal(doc.firstName, 'Jane');
  assert.equal(doc.lastName, 'Doe');
  assert.equal(doc.email, 'jane@example.com');
});

test('registration does not trim passwords', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();

  const password = '  spaced pass  ';
  const res = await request(createApp())
    .post('/api/auth/register')
    .send({ ...validBody, password });

  assert.equal(res.status, 201);

  const doc = create.mock.calls[0].arguments[0] as Record<string, unknown>;
  assert.equal(await bcrypt.compare(password, doc.passwordHash as string), true);
});

// ---- Registration: validation failures --------------------------------------

test('registration rejects missing fields', async () => {
  const app = createApp();
  for (const field of ['firstName', 'lastName', 'email', 'password']) {
    const body: Record<string, unknown> = { ...validBody };
    delete body[field];
    const res = await request(app).post('/api/auth/register').send(body);
    assert.equal(res.status, 400, `missing ${field}`);
    assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
  }
});

test('registration rejects blank names', async () => {
  const app = createApp();
  for (const field of ['firstName', 'lastName']) {
    for (const value of ['', '   ']) {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validBody, [field]: value });
      assert.equal(res.status, 400, `${field}="${value}"`);
      assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
    }
  }
});

test('registration rejects invalid email syntax', async () => {
  const app = createApp();
  for (const email of [
    'not-an-email',
    'missing-at.com',
    'test@',
    '@example.com',
    'test@example',
    'test @example.com',
  ]) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validBody, email });
    assert.equal(res.status, 400, email);
    assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
  }
});

test('registration rejects explicit nulls and wrong types', async () => {
  const app = createApp();
  const cases: Array<Record<string, unknown>> = [
    { ...validBody, firstName: null },
    { ...validBody, lastName: null },
    { ...validBody, email: null },
    { ...validBody, password: null },
    { ...validBody, firstName: 123 },
    { ...validBody, lastName: true },
    { ...validBody, email: ['a@b.com'] },
    { ...validBody, password: { v: 'x' } },
  ];
  for (const body of cases) {
    const res = await request(app).post('/api/auth/register').send(body);
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
  }
});

test('registration rejects unknown fields including role and id', async () => {
  const app = createApp();
  for (const extra of [
    { role: 'admin' },
    { id: '507f1f77bcf86cd799439011' },
    { isVerified: true },
    { anything: 'x' },
  ]) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validBody, ...extra });
    assert.equal(res.status, 400, JSON.stringify(extra));
    assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
  }
});

test('registration rejects passwords under 8 characters', async () => {
  const res = await request(createApp())
    .post('/api/auth/register')
    .send({ ...validBody, password: '1234567' });

  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
});

test('registration rejects passwords over 72 UTF-8 bytes', async () => {
  const password = '😀'.repeat(24); // 24 code points, 96 UTF-8 bytes
  assert.ok(password.length <= 72);
  assert.ok(Buffer.byteLength(password, 'utf8') > 72);

  const res = await request(createApp())
    .post('/api/auth/register')
    .send({ ...validBody, password });

  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
});

// ---- Registration: duplicates ------------------------------------------------

test('registration rejects an already-registered email', async () => {
  mockRegisterFindOneExisting();

  const res = await request(createApp())
    .post('/api/auth/register')
    .send(validBody);

  assert.equal(res.status, 409);
  assert.deepEqual(res.body, { error: MSG_DUPLICATE });
});

test('registration rejects a duplicate-key race', async () => {
  mockRegisterFindOneNone();
  mock.method(User, 'create', async () => {
    throw Object.assign(new Error('E11000'), { code: 11000 });
  });

  const res = await request(createApp())
    .post('/api/auth/register')
    .send(validBody);

  assert.equal(res.status, 409);
  assert.deepEqual(res.body, { error: MSG_DUPLICATE });
});

// ---- Verify -----------------------------------------------------------------

function mockFindOneAndUpdate(result: unknown) {
  return mock.method(User, 'findOneAndUpdate', async () => result);
}

test('verify marks the user verified atomically', async () => {
  const updated = mockFindOneAndUpdate({ id: 'user' });

  const res = await request(createApp())
    .get('/api/auth/verify')
    .query({ token: 'raw-token' });

  assert.equal(res.status, 200);
  assert.equal(typeof res.body.message, 'string');

  const [filter, update] = updated.mock.calls[0].arguments as unknown as [
    Record<string, unknown>,
    { $set?: Record<string, unknown>; $unset?: Record<string, unknown> },
  ];
  assert.equal(typeof filter.verificationToken, 'string');
  assert.ok(filter.verificationTokenExpires);
  assert.deepEqual(update.$set, { isVerified: true });
  assert.equal(update.$unset?.verificationToken, '');
  assert.equal(update.$unset?.verificationTokenExpires, '');
});

test('verify rejects missing, empty, unknown, expired and used tokens', async () => {
  const app = createApp();

  const missing = await request(app).get('/api/auth/verify');
  assert.equal(missing.status, 400);
  assert.deepEqual(missing.body, { error: MSG_BAD_INPUT });

  const empty = await request(app).get('/api/auth/verify').query({ token: '' });
  assert.equal(empty.status, 400);
  assert.deepEqual(empty.body, { error: MSG_BAD_INPUT });

  mockFindOneAndUpdate(null);
  const noMatch = await request(app)
    .get('/api/auth/verify')
    .query({ token: 'whatever' });
  assert.equal(noMatch.status, 400);
  assert.deepEqual(noMatch.body, { error: MSG_BAD_INPUT });
});

test('verify consumes the token in a single atomic operation', async () => {
  const updated = mockFindOneAndUpdate({ id: 'user' });

  const [a, b] = await Promise.all([
    request(createApp()).get('/api/auth/verify').query({ token: 'raw-token' }),
    request(createApp()).get('/api/auth/verify').query({ token: 'raw-token' }),
  ]);

  assert.equal(updated.mock.callCount(), 2);
  for (const res of [a, b]) {
    assert.ok([200, 400].includes(res.status));
  }
});

// ---- Resend -----------------------------------------------------------------

test('resend returns the generic message for unknown emails', async () => {
  mockResendFindOne(null);

  const res = await request(createApp())
    .post('/api/auth/resend-verification')
    .send({ email: 'nobody@example.com' });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { message: MSG_RESEND });
  assert.equal(emailCalls.length, 0);
});

test('resend returns the generic message for verified accounts', async () => {
  mockResendFindOne({ email: 'jane@example.com', isVerified: true });

  const res = await request(createApp())
    .post('/api/auth/resend-verification')
    .send({ email: 'jane@example.com' });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { message: MSG_RESEND });
  assert.equal(emailCalls.length, 0);
});

test('resend issues a new token and emails an unverified account', async () => {
  const user = {
    email: 'jane@example.com',
    isVerified: false,
    verificationToken: 'old',
    verificationTokenExpires: new Date(Date.now() - 1000),
    save: async () => user,
  };
  const findOne = mockResendFindOne(user);

  const res = await request(createApp())
    .post('/api/auth/resend-verification')
    .send({ email: 'jane@example.com' });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { message: MSG_RESEND });
  assert.equal(findOne.mock.callCount(), 1);
  assert.notEqual(user.verificationToken, 'old');
  assert.ok(user.verificationTokenExpires.getTime() > Date.now());
  assert.equal(emailCalls.length, 1);
  assert.equal(emailCalls[0].to, 'jane@example.com');
});

test('resend is silent within the cooldown window', async () => {
  const user = {
    email: 'jane@example.com',
    isVerified: false,
    verificationToken: 'fresh',
    verificationTokenExpires: new Date(Date.now() + 15 * 60 * 1000),
    save: async () => user,
  };
  const findOne = mockResendFindOne(user);

  const res = await request(createApp())
    .post('/api/auth/resend-verification')
    .send({ email: 'jane@example.com' });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { message: MSG_RESEND });
  assert.equal(findOne.mock.callCount(), 1);
  assert.equal(user.verificationToken, 'fresh');
  assert.equal(emailCalls.length, 0);
});

test('resend rejects invalid input', async () => {
  const app = createApp();
  const cases: Array<Record<string, unknown>> = [
    {},
    { email: '' },
    { email: 'not-an-email' },
    { email: null },
    { email: 123 },
    { email: 'jane@example.com', extra: 'x' },
  ];
  for (const body of cases) {
    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
  }
});

// ---- Email configuration, links and failures --------------------------------

test('registration hands the service an absolute-link base and a token', async () => {
  mockRegisterFindOneNone();
  mockCreateSuccess();

  const original = env.appUrl;
  env.appUrl = 'https://api.example.com';
  try {
    await request(createApp()).post('/api/auth/register').send(validBody);
  } finally {
    env.appUrl = original;
  }

  assert.equal(emailCalls.length, 1);
  assert.equal(typeof emailCalls[0].rawToken, 'string');
  assert.ok(emailCalls[0].rawToken.length > 0);
});

test('registration returns a generic 500 when email delivery fails', async () => {
  mockRegisterFindOneNone();
  mockCreateSuccess();
  emailImpl = async () => {
    throw new Error('mailtrap down');
  };
  mock.method(console, 'error', () => {});

  const res = await request(createApp())
    .post('/api/auth/register')
    .send(validBody);

  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: MSG_INTERNAL });
});

// ---- Hash compatibility with login ------------------------------------------

test('registration hash verifies with the login comparison', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();

  await request(createApp()).post('/api/auth/register').send(validBody);

  const doc = create.mock.calls[0].arguments[0] as Record<string, unknown>;
  const hash = doc.passwordHash as string;

  assert.match(hash, /^\$2[aby]\$10\$/);
  assert.equal(await bcrypt.compare(validBody.password, hash), true);
  assert.equal(await bcrypt.compare('WrongPassword123', hash), false);
});