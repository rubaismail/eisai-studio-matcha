import { afterEach, expect, test, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { TOKEN_KEY } from '../auth/session';
import {
  admin,
  customer,
  jsonResponse,
  makeToken,
  renderWithAuth,
  signInAs,
} from '../test-utils';
import LoginPage from './LoginPage';

function renderLogin(state?: object, fetchResponses: unknown[] = []) {
  const fetchMock = vi.fn();
  for (const response of fetchResponses)
    fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  renderWithAuth(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<p>admin dashboard</p>} />
      <Route path="/account" element={<p>account page</p>} />
      <Route path="/menu" element={<p>menu page</p>} />
    </Routes>,
    [{ pathname: '/login', state } as never],
  );
  return fetchMock;
}

const emailField = () => screen.getByLabelText('Email address');
const passwordField = () => screen.getByLabelText('Password');

function fillAndSubmit(email = 'jane@example.com', password = 'secret-pass') {
  fireEvent.change(emailField(), { target: { value: email } });
  fireEvent.change(passwordField(), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /log in/i }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('requires a password before calling the API', () => {
  const fetchMock = renderLogin();
  fireEvent.change(emailField(), { target: { value: 'jane@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log in →' }));
  expect(screen.getByText('Password is required.')).toBeInTheDocument();
  expect(passwordField()).toHaveAttribute('aria-invalid', 'true');
  expect(passwordField()).toHaveFocus();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('rejects an email address the API would reject', () => {
  const fetchMock = renderLogin();
  fillAndSubmit('not-an-email');
  expect(screen.getByText(/Enter a valid email address/)).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('sends exactly email and password, then saves the session', async () => {
  const token = makeToken();
  const fetchMock = renderLogin(undefined, [
    jsonResponse(200, { token, user: customer }),
  ]);
  fillAndSubmit('  jane@example.com ');
  expect(await screen.findByText('account page')).toBeInTheDocument();

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/auth/login');
  expect(JSON.parse(init.body)).toEqual({
    email: 'jane@example.com',
    password: 'secret-pass',
  });
  expect(init.headers.Authorization).toBeUndefined();
  expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
});

test('sends staff to the menu editor after logging in', async () => {
  renderLogin(undefined, [
    jsonResponse(200, { token: makeToken(), user: admin }),
  ]);
  fillAndSubmit();
  expect(await screen.findByText('admin dashboard')).toBeInTheDocument();
});

test('returns to the page that asked for a login', async () => {
  renderLogin({ from: '/menu' }, [
    jsonResponse(200, { token: makeToken(), user: customer }),
  ]);
  fillAndSubmit();
  expect(await screen.findByText('menu page')).toBeInTheDocument();
});

test('401 shows the incorrect email or password alert', async () => {
  renderLogin(undefined, [
    jsonResponse(401, { error: 'Invalid email or password' }),
  ]);
  fillAndSubmit();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Email or password is incorrect. Please try again.',
  );
  expect(emailField()).toHaveAttribute('aria-invalid', 'true');
  expect(passwordField()).toHaveAttribute('aria-invalid', 'true');
  expect(
    screen.getByRole('button', { name: 'Try logging in →' }),
  ).toBeEnabled();
});

test('403 asks to verify the email and can resend the link', async () => {
  const fetchMock = renderLogin(undefined, [
    jsonResponse(403, { error: 'Please verify your email first' }),
    jsonResponse(200, { message: 'If this account needs verification…' }),
  ]);
  fillAndSubmit();
  expect(
    await screen.findByText('Please verify your email to log in.'),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', {
      name: 'No email? Request a new verification link →',
    }),
  );
  expect(await screen.findByRole('status')).toHaveTextContent(
    'a new link is on its way',
  );
  const [url, init] = fetchMock.mock.calls[1];
  expect(url).toBe('/api/auth/resend-verification');
  expect(JSON.parse(init.body)).toEqual({ email: 'jane@example.com' });
});

test('429 disables logging in and says how long to wait', async () => {
  renderLogin(undefined, [
    jsonResponse(429, { error: 'Too many login attempts. Try again later.' }),
  ]);
  fillAndSubmit();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Too many login attempts',
  );
  expect(screen.getByRole('button', { name: 'Log in →' })).toBeDisabled();
  expect(
    screen.getByText('You can try again in 15 minutes.'),
  ).toBeInTheDocument();
});

test('uses the API wait time when it is readable', async () => {
  renderLogin(undefined, [
    {
      ...jsonResponse(429, {}),
      headers: new Headers({ 'Retry-After': '90' }),
    },
  ]);
  fillAndSubmit();
  expect(
    await screen.findByText('You can try again in 2 minutes.'),
  ).toBeInTheDocument();
});

test('a server or network error shows a general message', async () => {
  renderLogin(undefined, [
    jsonResponse(500, { error: 'Something went wrong' }),
  ]);
  fillAndSubmit();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Something went wrong on our end',
  );
});

test('prevents a second submit while logging in', async () => {
  let resolve: (value: unknown) => void = () => {};
  const fetchMock = vi.fn(() => new Promise((r) => (resolve = r)));
  vi.stubGlobal('fetch', fetchMock);
  renderWithAuth(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/account" element={<p>account page</p>} />
    </Routes>,
    ['/login'],
  );
  fillAndSubmit();
  const button = screen.getByRole('button', { name: 'Logging in…' });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  resolve(jsonResponse(200, { token: makeToken(), user: customer }));
  expect(await screen.findByText('account page')).toBeInTheDocument();
});

test('explains when the session expired on the menu editor', () => {
  renderLogin({ from: '/admin', expired: true });
  expect(screen.getByRole('status')).toHaveTextContent(
    'Your session expired. Log in again to keep editing the menu.',
  );
});

test('signed-in visitors skip the form', () => {
  signInAs(customer);
  renderLogin();
  expect(screen.getByText('account page')).toBeInTheDocument();
});

test('links to password reset and account creation', () => {
  renderLogin();
  expect(
    screen.getByRole('link', { name: 'Forgot password?' }),
  ).toHaveAttribute('href', '/forgot-password');
  const signUp = screen.getByText('New to Eisai?').parentElement!;
  expect(
    within(signUp).getByRole('link', { name: 'Create account →' }),
  ).toHaveAttribute('href', '/register');
});

test('focus goes to the first invalid field', async () => {
  renderLogin();
  fireEvent.click(screen.getByRole('button', { name: 'Log in →' }));
  await waitFor(() => expect(emailField()).toHaveFocus());
  expect(screen.getByText('Email address is required.')).toBeInTheDocument();
});

test('an old expired token alone does not show the session-expired note', () => {
  signInAs(customer, -60);
  renderLogin();
  expect(screen.queryByText(/session expired/i)).toBeNull();
});
