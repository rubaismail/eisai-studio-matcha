import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/config/env.js';

const messages: Array<Record<string, string>> = [];
let failDelivery = false;
mock.module('nodemailer', {
  defaultExport: {
    createTransport: () => ({
      sendMail: async (message: Record<string, string>) => {
        if (failDelivery) throw new Error('delivery unavailable');
        messages.push(message);
        return {};
      },
    }),
  },
});

// Configure before importing the real service: it captures configuration at startup.
env.mailtrapToken = '  test-token  ';
env.emailFrom = '  sender@example.com  ';
env.webOrigin = 'https://www.example.com';
const { sendVerificationEmail } = await import('../src/services/email.js');

test('real email service builds matching absolute HTML/text links with normalized sender', async () => {
  await sendVerificationEmail('customer@example.com', 'a b+c/d');
  assert.equal(messages.length, 1);
  const message = messages[0];
  assert.equal(message.from, 'sender@example.com');
  assert.equal(message.to, 'customer@example.com');
  const link = message.text.split('\n').find((line) => line.startsWith('https://'));
  assert.ok(link);
  const url = new URL(link);
  assert.equal(url.origin, 'https://www.example.com');
  assert.equal(url.pathname, '/verify-email');
  assert.deepEqual([...url.searchParams], [['token', 'a b+c/d']]);
  assert.ok(message.html.includes(`href="${link}"`));
  assert.ok(message.text.includes('15 minutes'));
});

test('real email service propagates delivery failures to the controller', async () => {
  failDelivery = true;
  try {
    await assert.rejects(sendVerificationEmail('customer@example.com', 'token'), /delivery unavailable/);
    assert.equal(messages.length, 1);
  } finally {
    failDelivery = false;
  }
});
