import { afterEach, expect, test, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router';
import { RequireAuth } from '../auth/guards';
import { TOKEN_KEY, USER_KEY } from '../auth/session';
import {
  customer,
  jsonResponse,
  renderWithAuth,
  signInAs,
} from '../test-utils';
import AccountPage from './AccountPage';
import HomePage from './HomePage';

// Shows the current history state, to check the deleted flag doesn't linger.
function HistoryState() {
  return (
    <p data-testid="history-state">{JSON.stringify(useLocation().state)}</p>
  );
}

function renderAccount() {
  renderWithAuth(
    <Routes>
      <Route path="/" element={<p>home page</p>} />
      <Route path="/login" element={<p>login page</p>} />
      <Route
        path="/account"
        element={
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        }
      />
    </Routes>,
    ['/account'],
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('shows the signed-in email and a reset password link', () => {
  signInAs(customer);
  renderAccount();
  expect(
    screen.getByRole('heading', { name: 'My account.' }),
  ).toBeInTheDocument();
  expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Reset password →' }),
  ).toHaveAttribute('href', '/forgot-password');
});

test('Log out signs out and goes home, not to the login page', () => {
  signInAs(customer);
  renderAccount();
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
  expect(screen.getByText('home page')).toBeInTheDocument();
  expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
});

// --- Delete account (issue #103) ---

const DELETE_URL = '/api/auth/delete-account';

// Answers the delete request with `reply`; the home page's menu gets no drinks.
function stubFetch(reply: unknown) {
  const fetchMock = vi.fn((url: string, _init?: RequestInit) =>
    url === DELETE_URL
      ? (reply as Promise<unknown>)
      : Promise.resolve(jsonResponse(200, { items: [] })),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const deleteCalls = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls.filter(([url]) => url === DELETE_URL);

function renderWithHome() {
  renderWithAuth(
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<p>login page</p>} />
        <Route
          path="/account"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
      </Routes>
      <HistoryState />
    </>,
    ['/account'],
  );
}

const openButton = () => screen.getByRole('button', { name: 'Delete account' });
const step = () => screen.getByRole('group', { name: 'Delete your account?' });
const passwordField = () => screen.getByLabelText('Current password');
const confirmButton = () =>
  screen.getByRole('button', { name: 'Delete my account' });

function openStep() {
  fireEvent.click(openButton());
}
function confirmWith(password: string) {
  fireEvent.change(passwordField(), { target: { value: password } });
  fireEvent.click(confirmButton());
}

test('Delete account opens a confirm step that takes focus and explains it’s permanent', async () => {
  signInAs(customer);
  renderAccount();
  openStep();

  expect(step()).toHaveAccessibleDescription(
    /permanently deletes.*can’t be undone/,
  );
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Delete your account?' }),
    ).toHaveFocus(),
  );
  expect(passwordField()).toHaveAttribute('type', 'password');
  expect(passwordField()).toHaveAttribute('autocomplete', 'current-password');
  expect(screen.queryByRole('button', { name: 'Delete account' })).toBeNull();
});

test('Cancel closes the step, clears the password and returns focus', async () => {
  signInAs(customer);
  renderAccount();
  openStep();
  fireEvent.change(passwordField(), { target: { value: 'secret123' } });
  fireEvent.click(within(step()).getByRole('button', { name: 'Cancel' }));

  expect(screen.queryByRole('group')).toBeNull();
  await waitFor(() => expect(openButton()).toHaveFocus());
  openStep();
  expect(passwordField()).toHaveValue('');
});

test('Escape closes the step, clears the password and returns focus', async () => {
  signInAs(customer);
  renderAccount();
  openStep();
  fireEvent.change(passwordField(), { target: { value: 'secret123' } });
  fireEvent.keyDown(passwordField(), { key: 'Escape' });

  expect(screen.queryByRole('group')).toBeNull();
  await waitFor(() => expect(openButton()).toHaveFocus());
  openStep();
  expect(passwordField()).toHaveValue('');
});

test('an empty password shows an inline error and sends nothing', () => {
  signInAs(customer);
  const fetchMock = stubFetch(Promise.resolve(jsonResponse(200, {})));
  renderAccount();
  openStep();
  fireEvent.click(confirmButton());

  expect(passwordField()).toHaveAccessibleDescription(
    'Enter your current password.',
  );
  expect(passwordField()).toHaveAttribute('aria-invalid', 'true');
  expect(passwordField()).toHaveFocus();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('a wrong password (403) shows an error, keeps the step open and stays signed in', async () => {
  const token = signInAs(customer);
  const fetchMock = stubFetch(
    Promise.resolve(jsonResponse(403, { error: 'Incorrect password' })),
  );
  renderAccount();
  openStep();
  confirmWith('wrong-password');

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Incorrect password. Your account wasn’t deleted.',
  );
  expect(passwordField()).toHaveValue('');
  expect(passwordField()).toHaveFocus();
  expect(passwordField()).toHaveAttribute('aria-invalid', 'true');
  expect(step()).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'My account.' }),
  ).toBeInTheDocument();
  expect(localStorage.getItem(TOKEN_KEY)).toBe(token);

  const [, init] = deleteCalls(fetchMock)[0]!;
  expect(init?.method).toBe('POST');
  expect(JSON.parse(init?.body as string)).toEqual({
    password: 'wrong-password',
  });
});

test('the only admin account (409) shows the API’s message', async () => {
  signInAs(customer);
  stubFetch(
    Promise.resolve(
      jsonResponse(409, {
        error: 'You are the only admin. Add another admin first.',
      }),
    ),
  );
  renderAccount();
  openStep();
  confirmWith('secret123');

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'You are the only admin. Add another admin first.',
  );
  expect(localStorage.getItem(TOKEN_KEY)).not.toBeNull();
});

test('too many attempts (429) shows the wait time from Retry-After', async () => {
  signInAs(customer);
  stubFetch(
    Promise.resolve({
      ...jsonResponse(429, { error: 'Too many requests' }),
      headers: new Headers({ 'Retry-After': '120' }),
    }),
  );
  renderAccount();
  openStep();
  confirmWith('secret123');

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Too many attempts. Please try again in 2 minutes.',
  );
});

test('too many attempts (429) without Retry-After says to try again later', async () => {
  signInAs(customer);
  stubFetch(Promise.resolve(jsonResponse(429, {})));
  renderAccount();
  openStep();
  confirmWith('secret123');

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Too many attempts. Please try again later.',
  );
});

test('a network error shows the generic message', async () => {
  signInAs(customer);
  stubFetch(Promise.reject(new TypeError('Failed to fetch')));
  renderAccount();
  openStep();
  confirmWith('secret123');

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Couldn’t delete your account. Please try again.',
  );
  expect(step()).toBeInTheDocument();
});

test('the confirm button is disabled while deleting, so it can’t be sent twice', async () => {
  signInAs(customer);
  let reply!: (response: unknown) => void;
  const fetchMock = stubFetch(
    new Promise((resolve) => {
      reply = resolve;
    }),
  );
  renderAccount();
  openStep();
  confirmWith('secret123');

  const pending = await screen.findByRole('button', { name: 'Deleting…' });
  expect(pending).toBeDisabled();
  expect(within(step()).getByRole('button', { name: 'Cancel' })).toBeDisabled();
  fireEvent.click(pending);
  fireEvent.submit(pending.closest('form')!);
  expect(deleteCalls(fetchMock)).toHaveLength(1);

  reply(jsonResponse(403, { error: 'Incorrect password' }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(confirmButton()).toBeEnabled();
});

test('success signs out like Log out, goes home and shows the message once', async () => {
  signInAs(customer);
  stubFetch(
    Promise.resolve(jsonResponse(200, { message: 'Account deleted.' })),
  );
  renderWithHome();
  openStep();
  confirmWith('secret123');

  const message = await screen.findByText('Your account has been deleted.');
  expect(message.closest('[role="status"]')).not.toBeNull();
  expect(
    screen.queryByRole('heading', { name: 'My account.' }),
  ).not.toBeInTheDocument();
  expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  expect(localStorage.getItem(USER_KEY)).toBeNull();
  // The flag is cleared from history, so a refresh won't show it again.
  await waitFor(() =>
    expect(screen.getByTestId('history-state')).toHaveTextContent('null'),
  );
  expect(
    screen.getByText('Your account has been deleted.'),
  ).toBeInTheDocument();
});
