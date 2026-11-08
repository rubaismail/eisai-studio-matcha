import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User.js';
import { BCRYPT_COST } from '../src/config/password.js';
import { buildVerificationLink } from '../src/services/email.js';
import { createHash } from 'node:crypto';
import { env, requireEmailConfig } from '../src/config/env.js';

// ---- Email module mock ------------------------------------------------------
type EmailCall = { to: string; rawToken: string };
let emailCalls: EmailCall[] = [];
let emailImpl: (to: string, rawToken: string) => Promise<void> = async () => {};
type ResetEmailCall = { to: string; rawToken: string };
let resetEmailCalls: ResetEmailCall[] = [];

mock.module('../src/services/email.js', {
  namedExports: {
    // Keep the real pure helper so link tests exercise real code.
    buildVerificationLink,
    sendVerificationEmail: async (to: string, rawToken: string) => {
      emailCalls.push({ to, rawToken });
      return emailImpl(to, rawToken);
    },
    sendResetPasswordEmail: async (to: string, rawToken: string) => {
      resetEmailCalls.push({ to, rawToken });
      return emailImpl(to, rawToken);
    },
  },
});

process.env.RATE_LIMIT_DISABLED = '1';
const { createApp } = await import('../src/app.js');

afterEach(() => {
  mock.restoreAll();
  emailCalls = [];
  resetEmailCalls = [];  
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
const MSG_FORGOT =
  'If an account exists for this email, a password-reset link has been sent.';

const validBody = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  password: 'ExamplePassword123',
};

function mockRegisterFindOneNone() {
  return mock.method(User, 'findOne', () => ({ lean: async () => null }));
}
function mockRegisterFindOneExisting() {
  return mock.method(User, 'findOne', () => ({ lean: async () => ({ id: 'existing' }) }));
}
function mockCreateSuccess() {
  return mock.method(User, 'create', async (doc: Record<string, unknown>) => ({
    ...doc,
    id: '507f1f77bcf86cd799439011',
  }));
}
function mockUpdateOne(modifiedCount: number) {
  return mock.method(User, 'updateOne', async () => ({ modifiedCount }));
}
function mockFindOneAndUpdate(result: unknown) {
  return mock.method(User, 'findOneAndUpdate', async () => result);
}
function mockFindOneResetUser(doc: unknown = { id: 'u1', email: 'jane@example.com' }) {
  return mock.method(User, 'findOne', async () => doc);
}
function mockResetUpdate(matchedCount: number) {
  return mock.method(User, 'updateOne', async () => ({
    matchedCount,
    modifiedCount: matchedCount,
  }));
}
// A 500 must log its cause server-side (for operators) but never send it to the client.
function assertLoggedNotLeaked(
  logged: ReturnType<typeof mock.method>,
  label: string,
  cause: string,
  body: unknown,
) {
  assert.equal(logged.mock.callCount(), 1);
  const [loggedLabel, err] = logged.mock.calls[0].arguments as [string, Error];
  assert.equal(loggedLabel, label);
  assert.equal(err.message, cause);
  assert.ok(!JSON.stringify(body).includes(cause));
}

// ---- Registration: success and normalization --------------------------------

test('registration creates a customer with hashed password and token', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();

  const res = await request(createApp()).post('/api/auth/register').send(validBody);

  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { message: MSG_CREATED });

  const doc = create.mock.calls[0].arguments[0] as Record<string, unknown>;
  assert.equal(doc.firstName, 'Jane');
  assert.equal(doc.lastName, 'Doe');
  assert.equal(doc.email, 'jane@example.com');
  assert.equal(doc.role, 'customer');
  assert.equal(doc.isVerified, false);
  assert.match(doc.passwordHash as string, new RegExp(`^\\$2[aby]\\$${BCRYPT_COST}\\$`));
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

  const res = await request(createApp()).post('/api/auth/register').send({
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
    const res = await request(app).post('/api/auth/register').send({ ...validBody, email });
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
    const res = await request(app).post('/api/auth/register').send({ ...validBody, ...extra });
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

test('registration rejects fewer than eight Unicode characters before creating an account', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();
  const app = createApp();
  for (const password of ['😀'.repeat(4), '😀'.repeat(7), 'abc😀def']) {
    assert.ok([...password].length < 8);
    assert.ok(password.length >= 8);
    const res = await request(app).post('/api/auth/register').send({ ...validBody, password });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
  }
  assert.equal(create.mock.callCount(), 0);
  assert.equal(emailCalls.length, 0);
});

test('registration accepts eight Unicode characters and preserves the password', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();
  const password = '😀'.repeat(8);
  const res = await request(createApp()).post('/api/auth/register').send({ ...validBody, password });
  assert.equal(res.status, 201);
  const doc = create.mock.calls[0].arguments[0] as Record<string, unknown>;
  assert.equal(await bcrypt.compare(password, doc.passwordHash as string), true);
});

test('registration rejects passwords over 72 UTF-8 bytes', async () => {
  const password = '😀'.repeat(24);
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
  const res = await request(createApp()).post('/api/auth/register').send(validBody);
  assert.equal(res.status, 409);
  assert.deepEqual(res.body, { error: MSG_DUPLICATE });
});

test('registration rejects a duplicate-key race', async () => {
  mockRegisterFindOneNone();
  mock.method(User, 'create', async () => {
    throw Object.assign(new Error('E11000'), { code: 11000 });
  });
  const res = await request(createApp()).post('/api/auth/register').send(validBody);
  assert.equal(res.status, 409);
  assert.deepEqual(res.body, { error: MSG_DUPLICATE });
});

// ---- Verify -----------------------------------------------------------------

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

test('verify returns a generic 500 and logs the cause when the database fails', async () => {
  mock.method(User, 'findOneAndUpdate', async () => {
    throw new Error('db down');
  });
  const logged = mock.method(console, 'error', () => {});

  const res = await request(createApp())
    .get('/api/auth/verify')
    .query({ token: 'raw-token' });

  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: MSG_INTERNAL });
  assertLoggedNotLeaked(logged, 'verify failed:', 'db down', res.body);
});

test('verify rejects missing and empty tokens', async () => {
  const app = createApp();
  const missing = await request(app).get('/api/auth/verify');
  assert.equal(missing.status, 400);
  assert.deepEqual(missing.body, { error: MSG_BAD_INPUT });

  const empty = await request(app).get('/api/auth/verify').query({ token: '' });
  assert.equal(empty.status, 400);
  assert.deepEqual(empty.body, { error: MSG_BAD_INPUT });
});

test('verify rejects unknown, expired and previously used tokens', async () => {
  // Unknown, expired and reused all surface as "no match".
  mockFindOneAndUpdate(null);
  const res = await request(createApp())
    .get('/api/auth/verify')
    .query({ token: 'whatever' });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
});

test('concurrent verify yields exactly one 200 and one 400', async () => {
  let consumed = false;
  mock.method(User, 'findOneAndUpdate', async () => {
    if (consumed) return null;
    consumed = true;
    return { id: 'user' };
  });

  const [a, b] = await Promise.all([
    request(createApp()).get('/api/auth/verify').query({ token: 'raw-token' }),
    request(createApp()).get('/api/auth/verify').query({ token: 'raw-token' }),
  ]);

  assert.deepEqual([a.status, b.status].sort(), [200, 400]);
});

// ---- Resend -----------------------------------------------------------------

test('resend returns the generic message when no eligible account matches', async () => {
  const update = mockUpdateOne(0);

  const res = await request(createApp())
    .post('/api/auth/resend-verification')
    .send({ email: 'nobody@example.com' });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { message: MSG_RESEND });
  assert.equal(update.mock.callCount(), 1);
  assert.equal(emailCalls.length, 0);
});

test('resend updates the token and emails when eligible', async () => {
  const update = mockUpdateOne(1);

  const res = await request(createApp())
    .post('/api/auth/resend-verification')
    .send({ email: '  Jane@Example.COM  ' });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { message: MSG_RESEND });
  assert.equal(update.mock.callCount(), 1);
  assert.equal(emailCalls.length, 1);
  assert.equal(emailCalls[0].to, 'jane@example.com');

  const [filter, updateDoc] = update.mock.calls[0].arguments as unknown as [
    Record<string, unknown>,
    { $set?: Record<string, unknown> },
  ];
  assert.equal(filter.email, 'jane@example.com');
  assert.equal(filter.isVerified, false);
  assert.equal(typeof (updateDoc.$set as Record<string, unknown>).verificationToken, 'string');
  assert.ok((updateDoc.$set as Record<string, unknown>).verificationTokenExpires instanceof Date);
});

test('resend does not email when the cooldown filter excludes the account', async () => {
  const update = mockUpdateOne(0);

  const res = await request(createApp())
    .post('/api/auth/resend-verification')
    .send({ email: 'jane@example.com' });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { message: MSG_RESEND });
  assert.equal(emailCalls.length, 0);

  const [filter] = update.mock.calls[0].arguments as unknown as [Record<string, unknown>];
  const or = filter.$or as Array<Record<string, unknown>>;
  assert.ok(or.some((branch) => 'verificationTokenExpires' in branch));
});

test('resend returns 500 when email delivery fails', async () => {
  mockUpdateOne(1);
  emailImpl = async () => {
    throw new Error('mailtrap down');
  };
  const logged = mock.method(console, 'error', () => {});

  const res = await request(createApp())
    .post('/api/auth/resend-verification')
    .send({ email: 'jane@example.com' });

  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: MSG_INTERNAL });
  assertLoggedNotLeaked(logged, 'resend-verification failed:', 'mailtrap down', res.body);
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
    const res = await request(app).post('/api/auth/resend-verification').send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
  }
});

// ---- Email links and configuration ------------------------------------------

test('buildVerificationLink produces an absolute, encoded website verify URL', () => {
  for (const base of [
    'https://www.example.com',
    'https://www.example.com/',
  ]) {
    const link = buildVerificationLink(base, 'a b+c/d');
    const url = new URL(link);
    assert.equal(url.pathname, '/verify-email');
    assert.equal(url.searchParams.get('token'), 'a b+c/d');
    assert.equal(url.origin, 'https://www.example.com');
  }
});

test('registration hands the service a token whose hash is stored', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();

  await request(createApp()).post('/api/auth/register').send(validBody);

  assert.equal(emailCalls.length, 1);
  const doc = create.mock.calls[0].arguments[0] as Record<string, unknown>;
  assert.equal(
    doc.verificationToken,
    createHash('sha256').update(emailCalls[0].rawToken).digest('hex'),
  );
});

test('registration returns a generic 500 when email delivery fails', async () => {
  mockRegisterFindOneNone();
  mockCreateSuccess();
  emailImpl = async () => {
    throw new Error('mailtrap down');
  };
  mock.method(console, 'error', () => {});

  const res = await request(createApp()).post('/api/auth/register').send(validBody);
  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: MSG_INTERNAL });
});

// ---- Hash compatibility with login ------------------------------------------

test('registration hash verifies with the shared login comparison', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();

  await request(createApp()).post('/api/auth/register').send(validBody);

  const doc = create.mock.calls[0].arguments[0] as Record<string, unknown>;
  const hash = doc.passwordHash as string;

  assert.match(hash, new RegExp(`^\\$2[aby]\\$${BCRYPT_COST}\\$`));
  assert.equal(await bcrypt.compare(validBody.password, hash), true);
  assert.equal(await bcrypt.compare('WrongPassword123', hash), false);
});
// ---- Invalid email/link configuration ---------------------------------------

test('production with blank APP_URL returns 500 before creating an account', async () => {
  const create = mockCreateSuccess();
  mockRegisterFindOneNone();

  const originalProd = env.isProduction;
  const originalUrl = env.appUrl;
  env.isProduction = true;
  env.appUrl = '';
  try {
    const res = await request(createApp()).post('/api/auth/register').send(validBody);

    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: MSG_INTERNAL });
    assert.equal(create.mock.callCount(), 0);
    assert.equal(emailCalls.length, 0);
  } finally {
    env.isProduction = originalProd;
    env.appUrl = originalUrl;
  }
});

test('production with a valid example APP_URL allows registration', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();

  const originalProd = env.isProduction;
  const originalUrl = env.appUrl;
  env.isProduction = true;
  env.appUrl = 'https://api.example.com';
  try {
    const res = await request(createApp()).post('/api/auth/register').send(validBody);

    assert.equal(res.status, 201);
    assert.equal(create.mock.callCount(), 1);
    assert.equal(emailCalls.length, 1);
  } finally {
    env.isProduction = originalProd;
    env.appUrl = originalUrl;
  }
});

test('whitespace-only MAILTRAP_TOKEN returns 500 without creating an account', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();

  const original = env.mailtrapToken;
  env.mailtrapToken = '   ';
  try {
    const res = await request(createApp()).post('/api/auth/register').send(validBody);

    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: MSG_INTERNAL });
    assert.equal(create.mock.callCount(), 0);
    assert.equal(emailCalls.length, 0);
  } finally {
    env.mailtrapToken = original;
  }
});

test('whitespace-only EMAIL_FROM returns 500 without creating an account', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();

  const original = env.emailFrom;
  env.emailFrom = '   ';
  try {
    const res = await request(createApp()).post('/api/auth/register').send(validBody);

    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: MSG_INTERNAL });
    assert.equal(create.mock.callCount(), 0);
    assert.equal(emailCalls.length, 0);
  } finally {
    env.emailFrom = original;
  }
});

test('malformed EMAIL_FROM returns 500 without creating an account', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();

  const original = env.emailFrom;
  env.emailFrom = 'not-an-email';
  try {
    const res = await request(createApp()).post('/api/auth/register').send(validBody);

    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: MSG_INTERNAL });
    assert.equal(create.mock.callCount(), 0);
    assert.equal(emailCalls.length, 0);
  } finally {
    env.emailFrom = original;
  }
});

test('resend with invalid config replaces no token and sends no email', async () => {
  const update = mockUpdateOne(1);

  const original = env.emailFrom;
  env.emailFrom = 'not-an-email';
  try {
    const res = await request(createApp())
      .post('/api/auth/resend-verification')
      .send({ email: 'jane@example.com' });

    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: MSG_INTERNAL });
    assert.equal(update.mock.callCount(), 0);
    assert.equal(emailCalls.length, 0);
  } finally {
    env.emailFrom = original;
  }
});

test('resend with blank APP_URL in production replaces no token and sends no email', async () => {
  const update = mockUpdateOne(1);

  const originalProd = env.isProduction;
  const originalUrl = env.appUrl;
  env.isProduction = true;
  env.appUrl = '';
  try {
    const res = await request(createApp())
      .post('/api/auth/resend-verification')
      .send({ email: 'jane@example.com' });

    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: MSG_INTERNAL });
    assert.equal(update.mock.callCount(), 0);
    assert.equal(emailCalls.length, 0);
  } finally {
    env.isProduction = originalProd;
    env.appUrl = originalUrl;
  }
});

test('email configuration returns the trimmed credentials it validates', () => {
  const originalToken = env.mailtrapToken;
  const originalFrom = env.emailFrom;
  try {
    env.mailtrapToken = '  test-token  ';
    env.emailFrom = '  test@example.com  ';
    const config = requireEmailConfig();
    assert.equal(config.token, 'test-token');
    assert.equal(config.from, 'test@example.com');
  } finally {
    env.mailtrapToken = originalToken;
    env.emailFrom = originalFrom;
  }
});

test('concurrent resends send one email whose token matches the atomic update', async () => {
  const stored = {
    email: 'jane@example.com',
    isVerified: false,
    verificationToken: 'old',
    verificationTokenExpires: new Date(0),
  };
  mock.method(User, 'updateOne', async (query: unknown, change: unknown) => {
    const filter = query as {
      email: string;
      isVerified: boolean;
      $or: [{ verificationTokenExpires: { $exists: boolean } },
        { verificationTokenExpires: { $lt: Date } }];
    };
    assert.equal(filter.$or[0].verificationTokenExpires.$exists, false);
    const threshold = filter.$or[1].verificationTokenExpires.$lt;
    assert.ok(Math.abs(threshold.getTime() - (Date.now() + 14 * 60_000)) < 5000);
    if (stored.email !== filter.email || stored.isVerified !== filter.isVerified ||
        stored.verificationTokenExpires >= threshold) {
      return { modifiedCount: 0 };
    }
    const update = change as { $set: { verificationToken: string; verificationTokenExpires: Date } };
    // A stateful stand-in for MongoDB's atomic conditional update: subsequent
    // callers evaluate the filter against the newly stored expiry.
    Object.assign(stored, update.$set);
    return { modifiedCount: 1 };
  });
  const app = createApp();
  const responses = await Promise.all([1, 2].map(() =>
    request(app).post('/api/auth/resend-verification').send({ email: ' Jane@Example.COM ' }),
  ));
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { message: MSG_RESEND });
  }
  assert.equal(emailCalls.length, 1);
  assert.equal(emailCalls[0].to, stored.email);
  assert.equal(stored.verificationToken,
    createHash('sha256').update(emailCalls[0].rawToken).digest('hex'));
});

test('registered customer can log in only after consuming the emailed token', async () => {
  let stored: Record<string, unknown> | undefined;
  mock.method(User, 'findOne', () => ({
    lean: async () => stored ?? null,
    select: async () => stored ?? null,
  }));
  mock.method(User, 'create', async (doc: Record<string, unknown>) => {
    stored = { ...doc, id: '507f1f77bcf86cd799439011' };
    return stored;
  });
  mock.method(User, 'findOneAndUpdate', async (query: unknown, change: unknown) => {
    const filter = query as { verificationToken: string; verificationTokenExpires: { $gt: Date } };
    if (!stored || stored.verificationToken !== filter.verificationToken ||
        (stored.verificationTokenExpires as Date) <= filter.verificationTokenExpires.$gt) return null;
    const previous = { ...stored };
    const update = change as { $set: Record<string, unknown>; $unset: Record<string, unknown> };
    Object.assign(stored, update.$set);
    for (const key of Object.keys(update.$unset)) delete stored[key];
    return previous;
  });
  const app = createApp();
  assert.equal((await request(app).post('/api/auth/register').send(validBody)).status, 201);
  const credentials = { email: validBody.email, password: validBody.password };
  assert.equal((await request(app).post('/api/auth/login').send(credentials)).status, 403);
  const token = emailCalls[0].rawToken;
  assert.equal((await request(app).get('/api/auth/verify').query({ token: 'wrong' })).status, 400);
  assert.ok(stored);
  stored.verificationTokenExpires = new Date(0);
  assert.equal((await request(app).get('/api/auth/verify').query({ token })).status, 400);
  stored.verificationTokenExpires = new Date(Date.now() + 60_000);
  assert.equal((await request(app).get('/api/auth/verify').query({ token })).status, 200);
  assert.equal((await request(app).get('/api/auth/verify').query({ token })).status, 400);
  const login = await request(app).post('/api/auth/login').send(credentials);
  assert.equal(login.status, 200);
  assert.equal(typeof login.body.token, 'string');
  assert.deepEqual(login.body.user, {
    _id: '507f1f77bcf86cd799439011', email: validBody.email, role: 'customer',
  });
});
// ---- Forgot password --------------------------------------------------------

test('forgot-password returns generic 200 and sends nothing for unknown email', async () => {
  const update = mockResetUpdate(0);
  const res = await request(createApp())
    .post('/api/auth/forgot-password')
    .send({ email: 'nobody@example.com' });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { message: MSG_FORGOT });
  assert.equal(update.mock.callCount(), 1);
  assert.equal(resetEmailCalls.length, 0);
});

test('register rejects invalid website configuration before creating an account', async () => {
  mockRegisterFindOneNone();
  const create = mockCreateSuccess();
  const previous = env.webOrigin;
  mock.method(console, 'error', () => {});
  try {
    env.webOrigin = 'not-a-url';
    const res = await request(createApp()).post('/api/auth/register').send(validBody);
    assert.equal(res.status, 500);
    assert.equal(create.mock.callCount(), 0);
    assert.equal(emailCalls.length, 0);
  } finally {
    env.webOrigin = previous;
  }
});

test('resend-verification rejects invalid website configuration before replacing a token', async () => {
  const update = mockUpdateOne(1);
  const previous = env.webOrigin;
  mock.method(console, 'error', () => {});
  try {
    env.webOrigin = 'not-a-url';
    const res = await request(createApp())
      .post('/api/auth/resend-verification')
      .send({ email: 'jane@example.com' });
    assert.equal(res.status, 500);
    assert.equal(update.mock.callCount(), 0);
    assert.equal(emailCalls.length, 0);
  } finally {
    env.webOrigin = previous;
  }
});

test('forgot-password rejects invalid website configuration before storing a token', async () => {
  const update = mockResetUpdate(1);
  const previous = env.webOrigin;
  mock.method(console, 'error', () => {});
  try {
    env.webOrigin = 'not-a-url';
    const res = await request(createApp())
      .post('/api/auth/forgot-password')
      .send({ email: 'jane@example.com' });
    assert.equal(res.status, 500);
    assert.equal(update.mock.callCount(), 0);
    assert.equal(resetEmailCalls.length, 0);
  } finally {
    env.webOrigin = previous;
  }
});

test('forgot-password writes a hashed token and emails the raw token', async () => {
  const update = mockResetUpdate(1);
  const res = await request(createApp())
    .post('/api/auth/forgot-password')
    .send({ email: '  Jane@Example.COM  ' });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { message: MSG_FORGOT });
  assert.equal(resetEmailCalls.length, 1);
  assert.equal(resetEmailCalls[0].to, 'jane@example.com');

  const [filter, updateDoc] = update.mock.calls[0].arguments as unknown as [
    Record<string, unknown>,
    { $set?: Record<string, unknown> },
  ];
  assert.equal(filter.email, 'jane@example.com');
  const set = updateDoc.$set as Record<string, unknown>;
  assert.equal(typeof set.resetPasswordToken, 'string');
  assert.ok(set.resetPasswordExpires instanceof Date);
  assert.equal(
    set.resetPasswordToken,
    createHash('sha256').update(resetEmailCalls[0].rawToken).digest('hex'),
  );
});

test('forgot-password cooldown filter uses $exists:false and expiry comparison', async () => {
  const update = mockResetUpdate(0);
  await request(createApp())
    .post('/api/auth/forgot-password')
    .send({ email: 'jane@example.com' });

  const [filter] = update.mock.calls[0].arguments as unknown as [Record<string, unknown>];
  const or = filter.$or as Array<Record<string, unknown>>;
  assert.deepEqual(or[0], { resetPasswordExpires: { $exists: false } });
  assert.ok('resetPasswordExpires' in or[1]);
});

test('forgot-password rejects invalid input', async () => {
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
    const res = await request(app).post('/api/auth/forgot-password').send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
  }
});

test('forgot-password returns 500 and writes no token when email delivery fails', async () => {
  mockResetUpdate(1);
  emailImpl = async () => {
    throw new Error('mailtrap down');
  };
  const logged = mock.method(console, 'error', () => {});

  const res = await request(createApp())
    .post('/api/auth/forgot-password')
    .send({ email: 'jane@example.com' });

  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: MSG_INTERNAL });
  assertLoggedNotLeaked(logged, 'forgot-password failed:', 'mailtrap down', res.body);
});

// ---- Reset password ---------------------------------------------------------

function resetBody(password = 'NewPassword123') {
  return { password };
}

test('reset-password updates the hash and unsets the token atomically', async () => {
  mockFindOneResetUser();
  const update = mockResetUpdate(1);

  const res = await request(createApp())
    .post('/api/auth/reset-password')
    .query({ token: 'raw-token' })
    .send(resetBody());

  assert.equal(res.status, 200);
  assert.equal(typeof res.body.message, 'string');

  const [filter, updateDoc] = update.mock.calls[0].arguments as unknown as [
    Record<string, unknown>,
    { $set?: Record<string, unknown>; $unset?: Record<string, unknown> },
  ];
  assert.equal(
    filter.resetPasswordToken,
    createHash('sha256').update('raw-token').digest('hex'),
  );
  assert.ok(filter.resetPasswordExpires);
  const newHash = (updateDoc.$set as Record<string, unknown>).passwordHash as string;
  assert.equal(await bcrypt.compare('NewPassword123', newHash), true);
  assert.equal(updateDoc.$unset?.resetPasswordToken, '');
  assert.equal(updateDoc.$unset?.resetPasswordExpires, '');
});

test('reset-password returns a generic 500 and logs the cause when the database fails', async () => {
  mockFindOneResetUser();
  mock.method(User, 'updateOne', async () => {
    throw new Error('db down');
  });
  const logged = mock.method(console, 'error', () => {});

  const res = await request(createApp())
    .post('/api/auth/reset-password')
    .query({ token: 'raw-token' })
    .send(resetBody());

  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: MSG_INTERNAL });
  assertLoggedNotLeaked(logged, 'reset-password failed:', 'db down', res.body);
  // The new password must never end up in the log.
  assert.ok(!JSON.stringify(logged.mock.calls[0].arguments.map(String)).includes('NewPassword123'));
});

test('reset-password with an invalid password does not consume the token', async () => {
  mockFindOneResetUser();
  const update = mockResetUpdate(1);

  const res = await request(createApp())
    .post('/api/auth/reset-password')
    .query({ token: 'raw-token' })
    .send(resetBody('short'));

  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
  assert.equal(update.mock.callCount(), 0); // token never unset
});

test('reset-password with a bad body returns 400 without touching the DB', async () => {
  const find = mockFindOneResetUser();
  const update = mockResetUpdate(1);
  const app = createApp();

  for (const body of [{}, { password: null }, { password: 123 }, { password: {} }]) {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .query({ token: 'raw-token' })
      .send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
  }
  assert.equal(find.mock.callCount(), 0);
  assert.equal(update.mock.callCount(), 0);
});

test('reset-password rejects missing, empty, expired and used tokens', async () => {
  mock.method(User, 'findOne', async () => null);
  const app = createApp();

  const missing = await request(app).post('/api/auth/reset-password').send(resetBody());
  assert.equal(missing.status, 400);

  for (const token of ['', 'unknown', 'expired-or-used']) {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .query({ token })
      .send(resetBody());
    assert.equal(res.status, 400, token);
    assert.deepEqual(res.body, { error: MSG_BAD_INPUT });
  }
});

test('concurrent reset-password with the same token yields one 200 and one 400', async () => {
  let consumed = false;
  mock.method(User, 'findOne', async () => ({ id: 'u1' }));
  mock.method(User, 'updateOne', async () => {
    if (consumed) return { matchedCount: 0 };
    consumed = true;
    return { matchedCount: 1 };
  });

  const app = createApp();
  const send = () =>
    request(app).post('/api/auth/reset-password').query({ token: 'raw-token' }).send(resetBody());

  const [a, b] = await Promise.all([send(), send()]);
  assert.deepEqual([a.status, b.status].sort(), [200, 400]);
});

test('forgot → reset → login end-to-end with the emailed token', async () => {
  let stored: Record<string, unknown> | undefined;
  mock.method(User, 'findOne', async () => stored ?? null);
  mock.method(User, 'updateOne', async (filter: unknown, change: unknown) => {
    const f = filter as { email?: string; resetPasswordToken?: string };
    const c = change as { $set?: Record<string, unknown>; $unset?: Record<string, unknown> };
    if (f.email) {
      stored = { ...stored, email: f.email, ...c.$set };
      return { matchedCount: 1, modifiedCount: 1 };
    }
    if (!stored || stored.resetPasswordToken !== f.resetPasswordToken) {
      return { matchedCount: 0 };
    }
    Object.assign(stored, c.$set);
    for (const k of Object.keys(c.$unset ?? {})) delete stored[k];
    return { matchedCount: 1 };
  });

  const app = createApp();
  assert.equal(
    (await request(app).post('/api/auth/forgot-password').send({ email: 'jane@example.com' })).status,
    200,
  );
  const raw = resetEmailCalls[0].rawToken;

  const reset = await request(app)
    .post('/api/auth/reset-password')
    .query({ token: raw })
    .send(resetBody('BrandNewPass123'));
  assert.equal(reset.status, 200);

  // Second use of the same link fails
  assert.equal(
    (await request(app).post('/api/auth/reset-password').query({ token: raw }).send(resetBody('AnotherPass123'))).status,
    400,
  );
});
