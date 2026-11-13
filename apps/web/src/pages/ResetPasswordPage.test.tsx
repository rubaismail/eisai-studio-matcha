import { StrictMode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import AuthProvider from '../auth/AuthProvider';
import { getToken } from '../auth/session';
import { customer, jsonResponse, signInAs } from '../test-utils';
import ResetPasswordPage from './ResetPasswordPage';

const TOKEN = 'reset-a+b/c=';
const linkPath = `/reset-password?token=${encodeURIComponent(TOKEN)}`;
const OK = { message: 'Password reset. Log in with your new password.' };

function renderPage(
  entry: string | { pathname: string; state: unknown },
  responses: unknown[] = [],
) {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  const router = createMemoryRouter(
    [
      {
        element: (
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        ),
        children: [
          { path: '/reset-password', element: <ResetPasswordPage /> },
          { path: '*', element: <h1>Another page</h1> },
        ],
      },
    ],
    { initialEntries: [entry] },
  );
  // StrictMode runs effects twice, like `npm run dev` does.
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
  return { fetchMock, router };
}

const passwordField = () => screen.getByLabelText('New password');
const confirmField = () => screen.getByLabelText('Confirm new password');
const submitButton = () =>
  screen.getByRole('button', { name: /reset password|resetting/i });

function fill(password: string, confirm = password) {
  fireEvent.change(passwordField(), { target: { value: password } });
  fireEvent.change(confirmField(), { target: { value: confirm } });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('removes the token from the address bar without sending anything', () => {
  const { fetchMock, router } = renderPage(linkPath);
  expect(
    screen.getByRole('heading', { name: 'New password' }),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/reset-password');
  expect(router.state.location.search).toBe('');
  expect(fetchMock).not.toHaveBeenCalled();
});

test('sends the token in the query and only the password in the body', async () => {
  const { fetchMock, router } = renderPage(linkPath, [jsonResponse(200, OK)]);
  fill(' new password ');
  fireEvent.click(submitButton());

  expect(
    await screen.findByRole('heading', { name: 'Password updated' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Go to log in →' })).toHaveAttribute(
    'href',
    '/login',
  );
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(
    `/api/auth/reset-password?token=${encodeURIComponent(TOKEN)}`,
  );
  expect(init.method).toBe('POST');
  // Passwords are never trimmed.
  expect(JSON.parse(init.body)).toEqual({ password: ' new password ' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(router.state.location)).not.toContain('reset-a');
});

test('a reload after the token left the address bar still shows the form', async () => {
  const { fetchMock } = renderPage(
    { pathname: '/reset-password', state: { resetToken: TOKEN } },
    [jsonResponse(200, OK)],
  );
  fill('new password');
  fireEvent.click(submitButton());
  await screen.findByRole('heading', { name: 'Password updated' });
  expect(fetchMock.mock.calls[0][0]).toBe(
    `/api/auth/reset-password?token=${encodeURIComponent(TOKEN)}`,
  );
});

test('a reload after success shows Password updated', () => {
  const { fetchMock } = renderPage({
    pathname: '/reset-password',
    state: { resetResult: 'updated' },
  });
  expect(
    screen.getByRole('heading', { name: 'Password updated' }),
  ).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('checks both passwords before sending', () => {
  const { fetchMock } = renderPage(linkPath);
  expect(screen.getByText('At least 8 characters.')).toBeInTheDocument();
  expect(passwordField()).toHaveAccessibleDescription('At least 8 characters.');

  fireEvent.click(submitButton());
  expect(screen.getByText('Enter a password.')).toBeInTheDocument();
  expect(passwordField()).toHaveFocus();

  fill('short');
  fireEvent.click(submitButton());
  expect(passwordField()).toHaveAccessibleDescription(
    'Use at least 8 characters.',
  );

  fill('long enough', 'long enougj');
  fireEvent.click(submitButton());
  expect(confirmField()).toHaveAccessibleDescription('Passwords don’t match.');
  expect(confirmField()).toHaveFocus();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('rejects passwords over 72 bytes, like the API', () => {
  const { fetchMock } = renderPage(linkPath);
  fill('é'.repeat(37));
  fireEvent.click(submitButton());
  expect(screen.getByText(/That password is too long/)).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('repeat clicks send one request', async () => {
  const { fetchMock } = renderPage(linkPath, [jsonResponse(200, OK)]);
  fill('new password');
  await act(async () => {
    fireEvent.click(submitButton());
    fireEvent.click(submitButton());
    fireEvent.click(submitButton());
  });
  await screen.findByRole('heading', { name: 'Password updated' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('a used or expired link (400) offers a new one', async () => {
  const { router } = renderPage(linkPath, [
    jsonResponse(400, { error: 'Invalid request.' }),
  ]);
  fill('new password');
  fireEvent.click(submitButton());
  expect(
    await screen.findByRole('heading', { name: 'Link expired' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Request a new link →' }),
  ).toHaveAttribute('href', '/forgot-password');
  expect(screen.getByRole('link', { name: '← Back to login' })).toHaveAttribute(
    'href',
    '/login',
  );
  expect(JSON.stringify(router.state.location)).not.toContain('reset-a');
});

test('a link without a token shows Link expired', () => {
  renderPage('/reset-password');
  expect(
    screen.getByRole('heading', { name: 'Link expired' }),
  ).toBeInTheDocument();
});

test('the reset limit (429) keeps the form and says how long to wait', async () => {
  renderPage(linkPath, [
    jsonResponse(429, { error: 'Too many login attempts. Try again later.' }),
  ]);
  fill('new password');
  fireEvent.click(submitButton());
  expect(
    await screen.findByText(
      'Too many reset attempts. Please wait and try again later.',
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText('You can try again in 15 minutes.'),
  ).toBeInTheDocument();
  expect(submitButton()).toBeDisabled();
});

test('a server error keeps the form so it can be tried again', async () => {
  const { fetchMock } = renderPage(linkPath, [
    jsonResponse(500, { error: 'x' }),
    jsonResponse(200, OK),
  ]);
  fill('new password');
  fireEvent.click(submitButton());
  expect(
    await screen.findByText(
      'Something went wrong on our end. Please try again in a moment.',
    ),
  ).toBeInTheDocument();
  expect(passwordField()).toHaveValue('new password');
  fireEvent.click(submitButton());
  await screen.findByRole('heading', { name: 'Password updated' });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('leaving while the reset is sending does not replace the new page', async () => {
  let respond!: (value: unknown) => void;
  const { fetchMock, router } = renderPage(linkPath);
  fetchMock.mockReturnValueOnce(new Promise((resolve) => (respond = resolve)));
  fill('new password');
  fireEvent.click(submitButton());
  await act(async () => {
    await router.navigate('/menu');
  });
  await act(async () => {
    respond(jsonResponse(200, OK));
  });
  expect(router.state.location.pathname).toBe('/menu');
  expect(
    screen.getByRole('heading', { name: 'Another page' }),
  ).toBeInTheDocument();
});

test('a signed-in visitor is signed out after resetting', async () => {
  signInAs(customer);
  renderPage(linkPath, [jsonResponse(200, OK)]);
  fill('new password');
  fireEvent.click(submitButton());
  await screen.findByRole('heading', { name: 'Password updated' });
  expect(getToken()).toBeNull();
});

test('empty password fields show text placeholders, not dots', () => {
  renderPage(linkPath);
  expect(passwordField()).toHaveValue('');
  expect(passwordField()).toHaveAttribute(
    'placeholder',
    'Enter a new password',
  );
  expect(confirmField()).toHaveAttribute(
    'placeholder',
    'Re-enter your password',
  );
  expect(document.body.innerHTML).not.toContain('•');
});

test('a network failure asks the visitor to check their connection and keeps the form', async () => {
  renderPage(linkPath);
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
  fill('new password');
  fireEvent.click(submitButton());
  expect(
    await screen.findByText(
      'We couldn’t reach Eisai. Check your connection and try again.',
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText(/on our end/)).not.toBeInTheDocument();
  expect(passwordField()).toHaveValue('new password');
});
