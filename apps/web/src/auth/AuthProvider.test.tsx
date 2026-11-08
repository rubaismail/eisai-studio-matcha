import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import { apiRequest } from '../api/client';
import {
  customer,
  jsonResponse,
  makeToken,
  renderWithAuth,
  signInAs,
} from '../test-utils';
import { useAuth } from './AuthContext';
import { TOKEN_KEY, USER_KEY } from './session';

function Status() {
  const { user, sessionExpired, signOut } = useAuth();
  return (
    <>
      <p>user: {user?.email ?? 'none'}</p>
      <p>expired: {String(sessionExpired)}</p>
      <button onClick={signOut}>sign out</button>
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
});

test('restores a saved session after a reload', () => {
  signInAs(customer);
  renderWithAuth(<Status />);
  expect(screen.getByText('user: jane@example.com')).toBeInTheDocument();
  expect(screen.getByText('expired: false')).toBeInTheDocument();
});

test('an expired saved token signs out and is reported as expired', () => {
  signInAs(customer, -60);
  renderWithAuth(<Status />);
  expect(screen.getByText('user: none')).toBeInTheDocument();
  expect(screen.getByText('expired: true')).toBeInTheDocument();
  expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
});

test('a damaged saved user is ignored', () => {
  localStorage.setItem(TOKEN_KEY, makeToken());
  localStorage.setItem(USER_KEY, '{"email": 42}');
  renderWithAuth(<Status />);
  expect(screen.getByText('user: none')).toBeInTheDocument();
});

test('signs out when the token expires while the page is open', () => {
  vi.useFakeTimers();
  signInAs(customer, 5);
  renderWithAuth(<Status />);
  expect(screen.getByText('user: jane@example.com')).toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(6000);
  });
  expect(screen.getByText('user: none')).toBeInTheDocument();
  expect(screen.getByText('expired: true')).toBeInTheDocument();
});

test('a 401 on a signed-in request ends the session as expired', async () => {
  signInAs(customer);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(jsonResponse(401, { error: 'Invalid token' })),
  );
  renderWithAuth(<Status />);
  await expect(apiRequest('/menu/admin/menu')).rejects.toMatchObject({
    status: 401,
  });
  await waitFor(() =>
    expect(screen.getByText('user: none')).toBeInTheDocument(),
  );
  expect(screen.getByText('expired: true')).toBeInTheDocument();
});

test('a 401 on a request without a token does not end the session', async () => {
  signInAs(customer);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(jsonResponse(401, { error: 'Invalid' })),
  );
  renderWithAuth(<Status />);
  await expect(
    apiRequest('/auth/login', { method: 'POST', body: {}, auth: false }),
  ).rejects.toMatchObject({ status: 401, serverMessage: 'Invalid' });
  expect(screen.getByText('user: jane@example.com')).toBeInTheDocument();
});

test('signing out clears the saved session without marking it expired', () => {
  signInAs(customer);
  renderWithAuth(<Status />);
  act(() => screen.getByText('sign out').click());
  expect(screen.getByText('user: none')).toBeInTheDocument();
  expect(screen.getByText('expired: false')).toBeInTheDocument();
  expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  expect(localStorage.getItem(USER_KEY)).toBeNull();
});

test('a slow 401 for an old token does not sign out a newer login', async () => {
  const oldToken = signInAs(customer);
  let respond: (value: unknown) => void = () => {};
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise((resolve) => (respond = resolve))),
  );
  renderWithAuth(<Status />);
  const request = apiRequest('/menu/admin/menu');
  const newToken = signInAs(customer, 7200);
  expect(newToken).not.toBe(oldToken);
  respond(jsonResponse(401, { error: 'Invalid or expired token' }));
  await expect(request).rejects.toMatchObject({ status: 401 });
  expect(localStorage.getItem(TOKEN_KEY)).toBe(newToken);
  expect(screen.getByText('expired: false')).toBeInTheDocument();
});

test('logging in still works when the browser blocks storage', () => {
  const setItem = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
  function SignIn() {
    const { signIn } = useAuth();
    return (
      <button onClick={() => signIn({ token: makeToken(), user: customer })}>
        sign in
      </button>
    );
  }
  renderWithAuth(
    <>
      <SignIn />
      <Status />
    </>,
  );
  act(() => screen.getByText('sign in').click());
  expect(screen.getByText('user: jane@example.com')).toBeInTheDocument();
  setItem.mockRestore();
});
