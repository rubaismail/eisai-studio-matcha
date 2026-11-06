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

test('sendVerificationEmail emits the verify URL with the raw token', async () => {
  setValidEmailEnv();
  const raw = 'a b+c/d&=?';
  await withAppUrl('https://api.example.com', () =>
    sendVerificationEmail('jane@example.com', raw),
  );

  assert.equal(sent.length, 1);
  const url = new URL(firstUrl(sent[0].text ?? sent[0].html ?? ''));
  assert.equal(url.origin, 'https://api.example.com');
  assert.equal(url.pathname, '/api/auth/verify');
  assert.equal(url.searchParams.get('token'), raw);
});

test('sendResetPasswordEmail emits the reset URL with the raw token', async () => {
  setValidEmailEnv();
  const raw = 'r a+b/c&=?';
  await withAppUrl('https://api.example.com', () =>
    sendResetPasswordEmail('jane@example.com', raw),
  );

  assert.equal(sent.length, 1);
  const url = new URL(firstUrl(sent[0].text ?? sent[0].html ?? ''));
  assert.equal(url.origin, 'https://api.example.com');
  assert.equal(url.pathname, '/api/auth/reset-password');
  assert.equal(url.searchParams.get('token'), raw);
});

test('emitted verify URL has no double slash when APP_URL ends with /', async () => {
  setValidEmailEnv();
  await withAppUrl('https://api.example.com/', () =>
    sendVerificationEmail('jane@example.com', 'tok'),
  );
  const link = firstUrl(sent[0].text ?? sent[0].html ?? '');
  assert.ok(!/\/\/api\/auth/.test(link), `double slash in ${link}`);
  assert.equal(new URL(link).pathname, '/api/auth/verify');
});