import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/config/env.js';

type SentMail = { to: string; subject: string; text?: string; html?: string };
let sent: SentMail[] = [];

// Stub nodemailer's default export (email.ts uses `import nodemailer from "nodemailer"`).
mock.module('nodemailer', {
  defaultExport: {
    createTransport: () => ({
      sendMail: async (msg: SentMail) => {
        sent.push(msg);
        return { messageId: 'test' };
      },
    }),
  },
});

const { sendVerificationEmail, sendResetPasswordEmail } = await import(
  '../src/services/email.js'
);

const ENV_KEYS = [
  'mailtrapToken',
  'emailFrom',
  'mailtrapUseSandbox',
  'mailtrapInboxId',
  'appUrl',
  'webOrigin',
] as const;
const originalEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, env[k]])) as Record<
  (typeof ENV_KEYS)[number],
  string
>;

function setValidEmailEnv() {
  env.mailtrapToken = 'test-token';
  env.emailFrom = 'test@example.com';
  env.mailtrapUseSandbox = 'true';
  env.mailtrapInboxId = '1';
}

afterEach(() => {
  sent = [];
  for (const k of ENV_KEYS) env[k] = originalEnv[k];
  mock.restoreAll();
});

function firstUrl(body: string): string {
  const m = body.match(/https?:\/\/[^\s"'<>]+/);
  assert.ok(m, `no URL in message body:\n${body}`);
  return m[0].replace(/[).,;]+$/, '');
}

async function withAppUrl(url: string, fn: () => Promise<void>): Promise<void> {
  const prev = env.appUrl;
  env.appUrl = url;
  try {
    await fn();
  } finally {
    env.appUrl = prev;
  }
}

test('sendVerificationEmail emits the website verify URL with the raw token', async () => {
  setValidEmailEnv();
  env.webOrigin = 'https://shop.example.com';
  const raw = 'a b+c/d&=?';
  // APP_URL (the API origin) must not leak into the link.
  await withAppUrl('https://api.example.com', () =>
    sendVerificationEmail('jane@example.com', raw),
  );

  assert.equal(sent.length, 1);
  for (const body of [sent[0].text, sent[0].html]) {
    const url = new URL(firstUrl(body ?? ''));
    assert.equal(url.origin, 'https://shop.example.com');
    assert.equal(url.pathname, '/verify-email');
    assert.deepEqual([...url.searchParams], [['token', raw]]);
  }
});

test('sendResetPasswordEmail emits the reset URL with the raw token', async () => {
  setValidEmailEnv();
  env.webOrigin = 'https://shop.example.com/';
  const raw = 'r a+b/c&=?';
  await withAppUrl('https://api.example.com', () =>
    sendResetPasswordEmail('jane@example.com', raw),
  );

  assert.equal(sent.length, 1);
  for (const body of [sent[0].text, sent[0].html]) {
    const url = new URL(firstUrl(body ?? ''));
    assert.equal(url.origin, 'https://shop.example.com');
    assert.equal(url.pathname, '/reset-password');
    assert.deepEqual([...url.searchParams], [['token', raw]]);
  }
});

test('emitted verify URL has no double slash when WEB_ORIGIN ends with /', async () => {
  setValidEmailEnv();
  env.webOrigin = 'https://shop.example.com/';
  await sendVerificationEmail('jane@example.com', 'tok');
  const link = firstUrl(sent[0].text ?? sent[0].html ?? '');
  assert.ok(!/\/\/verify-email/.test(link), `double slash in ${link}`);
  assert.equal(new URL(link).pathname, '/verify-email');
});

test('invalid website configuration sends no verification email', async () => {
  setValidEmailEnv();
  for (const origin of ['', 'not-a-url', 'javascript:alert(1)', 'https://user:pass@example.com']) {
    env.webOrigin = origin;
    await assert.rejects(sendVerificationEmail('jane@example.com', 'token'), /WEB_ORIGIN/);
  }
  assert.equal(sent.length, 0);
});

test('invalid website configuration sends no reset email', async () => {
  setValidEmailEnv();
  for (const origin of ['', 'not-a-url', 'javascript:alert(1)', 'https://user:pass@example.com']) {
    env.webOrigin = origin;
    await assert.rejects(sendResetPasswordEmail('jane@example.com', 'token'), /WEB_ORIGIN/);
  }
  assert.equal(sent.length, 0);
});
