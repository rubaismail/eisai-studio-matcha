import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createApp } from '../src/app.js';
import { env, requireJwtSecret } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { validateUploadFile } from '../src/services/upload.js';

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/images/${name}`, import.meta.url));
const png = fixture('valid.png');
const token = (expiresIn = 3600) =>
  `Bearer ${jwt.sign({}, requireJwtSecret(), {
    subject: '507f1f77bcf86cd799439011',
    expiresIn,
    algorithm: 'HS256',
  })}`;
function admin() {
  mock.method(User, 'findById', async () => ({
    id: '507f1f77bcf86cd799439011',
    role: 'admin',
    isVerified: true,
  }));
}
function upload(buffer: Buffer, contentType: string, authorization = token()) {
  return request(createApp())
    .post('/api/uploads')
    .set('Authorization', authorization)
    .attach('image', buffer, { filename: 'menu-photo', contentType });
}
afterEach(() => mock.restoreAll());

for (const [name, mime, extension] of [
  ['valid.png', 'image/png', 'png'],
  ['alpha.png', 'image/png', 'png'],
  ['valid.jpg', 'image/jpeg', 'jpg'],
  ['valid-no-app.jpg', 'image/jpeg', 'jpg'],
  ['progressive.jpg', 'image/jpeg', 'jpg'],
  ['valid.webp', 'image/webp', 'webp'],
  ['lossless.webp', 'image/webp', 'webp'],
  ['animated.webp', 'image/webp', 'webp'],
]) {
  test(`uploads fully decoded ${name} with its original bytes and detected MIME type`, async () => {
    admin();
    const send = mock.method(S3Client.prototype, 'send', async () => ({}));
    const buffer = fixture(name);
    const res = await upload(buffer, mime);
    assert.equal(res.status, 201);
    assert.equal(send.mock.callCount(), 1);
    const command = send.mock.calls[0].arguments[0] as PutObjectCommand;
    assert.deepEqual(command.input.Body, buffer);
    assert.equal(command.input.ContentType, mime);
    assert.equal(command.input.Bucket, env.awsS3Bucket);
    assert.equal(command.input.ACL, undefined);
    assert.ok(command.input.Key?.endsWith(`.${extension}`));
    assert.ok(res.body.imageUrl.endsWith(`/${command.input.Key}`));
  });
}

const corruptPng = Buffer.from(png);
corruptPng[corruptPng.indexOf(Buffer.from('IDAT')) + 4] ^= 0xff;
for (const [name, buffer, mime] of [
  ['PNG header only', png.subarray(0, 33), 'image/png'],
  ['PNG without IEND', png.subarray(0, -12), 'image/png'],
  ['corrupt PNG pixel data', corruptPng, 'image/png'],
  ['four-byte JPEG', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'],
  ['truncated JPEG scan', fixture('valid.jpg').subarray(0, -12), 'image/jpeg'],
  ['truncated WebP data', fixture('valid.webp').subarray(0, -12), 'image/webp'],
  [
    'truncated animated WebP',
    fixture('animated.webp').subarray(0, -12),
    'image/webp',
  ],
  ['plain text', Buffer.from('not an image'), 'image/png'],
  ['empty image', Buffer.alloc(0), 'image/png'],
  ['MIME mismatch', png, 'image/jpeg'],
  ['unsupported MIME', png, 'image/gif'],
] as const) {
  test(`rejects ${name} before calling S3`, async () => {
    admin();
    mock.method(console, 'error', () => {});
    const send = mock.method(S3Client.prototype, 'send', async () => ({}));
    const res = await upload(buffer, mime);
    assert.equal(res.status, 415);
    assert.equal(typeof res.body.error, 'string');
    assert.equal(send.mock.callCount(), 0);
  });
}

test('rejects missing, multiple, incorrectly named and oversized uploads before S3', async () => {
  admin();
  mock.method(console, 'error', () => {});
  const send = mock.method(S3Client.prototype, 'send', async () => ({}));
  const app = createApp();
  assert.equal(
    (await request(app).post('/api/uploads').set('Authorization', token()))
      .status,
    400,
  );
  const multiple = await request(app)
    .post('/api/uploads')
    .set('Authorization', token())
    .attach('image', png, { filename: 'a.png', contentType: 'image/png' })
    .attach('image', png, { filename: 'b.png', contentType: 'image/png' });
  assert.equal(multiple.status, 400);
  const unexpected = await request(app)
    .post('/api/uploads')
    .set('Authorization', token())
    .attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
  assert.equal(unexpected.status, 400);
  assert.equal(
    (await upload(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png')).status,
    413,
  );
  assert.equal(send.mock.callCount(), 0);
});

test('validation enforces the byte limit before decoding', async () => {
  await assert.rejects(validateUploadFile(undefined), { status: 400 });
  await assert.rejects(
    validateUploadFile({
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
      size: 1,
      mimetype: 'image/png',
    }),
    { status: 413 },
  );
});

test('upload rejects missing, placeholder, expired and non-admin credentials before S3', async () => {
  mock.method(User, 'findById', async () => ({
    id: '507f1f77bcf86cd799439011',
    role: 'customer',
    isVerified: true,
  }));
  const send = mock.method(S3Client.prototype, 'send', async () => ({}));
  for (const authorization of ['', 'admin', 'Bearer admin-token', token(-1)]) {
    assert.equal((await upload(png, 'image/png', authorization)).status, 401);
  }
  assert.equal((await upload(png, 'image/png')).status, 403);
  assert.equal(send.mock.callCount(), 0);
});

test('upload waits for S3 and returns a generic error if persistence fails', async () => {
  admin();
  mock.method(console, 'error', () => {});
  const send = mock.method(S3Client.prototype, 'send', async () => {
    throw new Error('private S3 failure detail');
  });
  const res = await upload(png, 'image/png');
  assert.equal(send.mock.callCount(), 1);
  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: 'Something went wrong' });
});

test('upload preserves temporary AWS session credentials', async () => {
  admin();
  const previous = [
    env.awsAccessKeyId,
    env.awsSecretAccessKey,
    env.awsSessionToken,
  ];
  try {
    env.awsAccessKeyId = 'test-only-key';
    env.awsSecretAccessKey = 'test-only-secret';
    env.awsSessionToken = 'test-only-session';
    mock.method(S3Client.prototype, 'send', async function (this: S3Client) {
      assert.equal(
        (await this.config.credentials()).sessionToken,
        'test-only-session',
      );
      return {};
    });
    assert.equal((await upload(png, 'image/png')).status, 201);
  } finally {
    [env.awsAccessKeyId, env.awsSecretAccessKey, env.awsSessionToken] =
      previous;
  }
});
