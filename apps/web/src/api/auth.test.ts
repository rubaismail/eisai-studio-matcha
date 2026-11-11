import { afterEach, expect, test, vi } from 'vitest';
import { deleteAccount } from './auth';
import { ApiError, setUnauthorizedHandler } from './client';
import { customer, jsonResponse, signInAs } from '../test-utils';

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
  localStorage.clear();
});

function stubFetch(response: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

test('deleteAccount posts only the password, with the login token', async () => {
  const token = signInAs(customer);
  const fetchMock = stubFetch(
    jsonResponse(200, { message: 'Account deleted.' }),
  );

  await expect(deleteAccount('secret123')).resolves.toEqual({
    message: 'Account deleted.',
  });
  const [url, init] = fetchMock.mock.calls[0]!;
  expect(url).toBe('/api/auth/delete-account');
  expect(init.method).toBe('POST');
  expect(init.headers.Authorization).toBe(`Bearer ${token}`);
  expect(init.headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(init.body)).toEqual({ password: 'secret123' });
});

test('a wrong password (403) rejects with the status and doesn’t sign out', async () => {
  signInAs(customer);
  const onUnauthorized = vi.fn();
  setUnauthorizedHandler(onUnauthorized);
  stubFetch(jsonResponse(403, { error: 'Incorrect password' }));

  const err = await deleteAccount('wrong').catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect((err as ApiError).status).toBe(403);
  expect((err as ApiError).serverMessage).toBe('Incorrect password');
  expect(onUnauthorized).not.toHaveBeenCalled();
});

test('the only admin (409) passes on the API’s message', async () => {
  signInAs(customer);
  stubFetch(jsonResponse(409, { error: 'You are the only admin.' }));

  const err = (await deleteAccount('secret123').catch(
    (e: unknown) => e,
  )) as ApiError;
  expect(err.status).toBe(409);
  expect(err.serverMessage).toBe('You are the only admin.');
});

test('rate limiting (429) carries the Retry-After wait', async () => {
  signInAs(customer);
  stubFetch({
    ...jsonResponse(429, { error: 'Too many requests' }),
    headers: new Headers({ 'Retry-After': '90' }),
  });

  const err = (await deleteAccount('secret123').catch(
    (e: unknown) => e,
  )) as ApiError;
  expect(err.status).toBe(429);
  expect(err.retryAfterSeconds).toBe(90);
});

test('a network failure rejects with the original error, not an ApiError', async () => {
  signInAs(customer);
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

  const err = await deleteAccount('secret123').catch((e: unknown) => e);
  expect(err).toBeInstanceOf(TypeError);
});
