import { expect, test } from 'vitest';
import {
  confirmPasswordError,
  emailError,
  newPasswordError,
} from './validation';

test('email must look like an address, ignoring outer spaces', () => {
  expect(emailError('')).toBe('Enter your email address.');
  expect(emailError('jane')).toMatch(/valid email/);
  expect(emailError('jane@example')).toMatch(/valid email/);
  expect(emailError('  jane@example.com ')).toBeUndefined();
});

test('new passwords need 8 characters, counting emoji as one', () => {
  expect(newPasswordError('')).toBe('Enter a password.');
  expect(newPasswordError('1234567')).toBe('Use at least 8 characters.');
  expect(newPasswordError('12345678')).toBeUndefined();
  // 8 emoji = 8 characters, 32 bytes.
  expect(newPasswordError('😀'.repeat(8))).toBeUndefined();
});

test('new passwords are limited to 72 bytes, like the API', () => {
  expect(newPasswordError('a'.repeat(72))).toBeUndefined();
  expect(newPasswordError('a'.repeat(73))).toMatch(/too long/);
  // 19 emoji = 76 bytes.
  expect(newPasswordError('😀'.repeat(19))).toMatch(/too long/);
});

test('passwords are not trimmed', () => {
  expect(newPasswordError('       x')).toBeUndefined();
});

test('the confirmation must match exactly', () => {
  expect(confirmPasswordError('secret-pass', '')).toBe(
    'Re-enter your password.',
  );
  expect(confirmPasswordError('secret-pass', 'secret-Pass')).toBe(
    'Passwords don’t match.',
  );
  expect(confirmPasswordError('secret-pass', 'secret-pass')).toBeUndefined();
});
