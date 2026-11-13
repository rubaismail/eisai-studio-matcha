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
const CHECK_PATH = `/api/auth/reset-password/check?token=${encodeURIComponent(TOKEN)}`;
const VALID_LINK = jsonResponse(200, { message: 'Reset link is valid.' });

type Entry = string | { pathname: string; state: unknown };

// The page checks the link when it opens (GET .../check), then submits the
// reset (POST). `check` answers every link check; `responses` answer the
// submits in order.
function renderPage(
  entry: Entry,
  responses: unknown[] = [],
  check: () => Promise<unknown> = async () => VALID_LINK,
) {
  const queue = [...responses];
  const fetchMock = vi.fn((url: string, _init?: RequestInit) =>
    url.startsWith('/api/auth/reset-password/check')
      ? check()
      : Promise.resolve(queue.shift()),
  );
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
  const resetCalls = () =>
    fetchMock.mock.calls.filter(
      ([url]) => !url.startsWith('/api/auth/reset-password/check'),
    ) as unknown as [string, RequestInit & { body: string }][];
  const checkCalls = () =>
    fetchMock.mock.calls.filter(([url]) =>
      url.startsWith('/api/auth/reset-password/check'),
    );
  return { fetchMock, router, resetCalls, checkCalls };
}

// Opens the page and waits for the link check to finish and the form to show.
async function openForm(entry: Entry = linkPath, responses: unknown[] = []) {
  const page = renderPage(entry, responses);
  await screen.findByRole('heading', { name: 'New password' });
  return page;
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

test('removes the token from the address bar and only checks the link', async () => {
  signInAs(customer);
  const { router, resetCalls, checkCalls } = renderPage(linkPath);
  expect(
    screen.getByRole('heading', { name: 'Checking your link' }),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole('heading', { name: 'New password' }),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/reset-password');
  expect(router.state.location.search).toBe('');
  expect(resetCalls()).toHaveLength(0);
  expect(checkCalls().length).toBeGreaterThan(0);
  for (const [url, init] of checkCalls()) {
    expect(url).toBe(CHECK_PATH);
    expect(init?.method).toBe('GET');
    // The check never sends the visitor's login.
    expect(
      (init?.headers as Record<string, string> | undefined)?.Authorization,
    ).toBeUndefined();
  }
});

test('a used or expired link says so as soon as it opens', async () => {
  const { router, resetCalls } = renderPage(linkPath, [], async () =>
    jsonResponse(400, { error: 'Invalid request.' }),
  );
  expect(
    await screen.findByRole('heading', { name: 'Link expired' }),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Request a new link →' }),
  ).toHaveAttribute('href', '/forgot-password');
  expect(resetCalls()).toHaveLength(0);
  expect(JSON.stringify(router.state.location)).not.toContain('reset-a');
});

test.each([
  ['offline', async () => Promise.reject(new TypeError('offline'))],
  ['a server error', async () => jsonResponse(500, { error: 'x' })],
  ['the rate limit', async () => jsonResponse(429, { error: 'x' })],
])('if the check fails (%s) the form still shows', async (_name, check) => {
  renderPage(linkPath, [], check);
  expect(
    await screen.findByRole('heading', { name: 'New password' }),
  ).toBeInTheDocument();
  expect(passwordField()).toBeEnabled();
});

test('sends the token in the query and only the password in the body', async () => {
  const { router, resetCalls } = await openForm(linkPath, [
    jsonResponse(200, OK),
  ]);
  fill(' new password ');
  fireEvent.click(submitButton());

  expect(
    await screen.findByRole('heading', { name: 'Password updated' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Go to log in →' })).toHaveAttribute(
    'href',
    '/login',
  );
  const [url, init] = resetCalls()[0];
  expect(url).toBe(
    `/api/auth/reset-password?token=${encodeURIComponent(TOKEN)}`,
  );
  expect(init.method).toBe('POST');
  // Passwords are never trimmed.
  expect(JSON.parse(init.body)).toEqual({ password: ' new password ' });
  expect(resetCalls()).toHaveLength(1);
  expect(JSON.stringify(router.state.location)).not.toContain('reset-a');
});

test('a reload after the token left the address bar still shows the form', async () => {
  const { resetCalls } = await openForm(
    { pathname: '/reset-password', state: { resetToken: TOKEN } },
    [jsonResponse(200, OK)],
  );
  fill('new password');
  fireEvent.click(submitButton());
  await screen.findByRole('heading', { name: 'Password updated' });
  expect(resetCalls()[0][0]).toBe(
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

test('checks both passwords before sending', async () => {
  const { resetCalls } = await openForm();
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
  expect(resetCalls()).toHaveLength(0);
});

test('rejects passwords over 72 bytes, like the API', async () => {
  const { resetCalls } = await openForm();
  fill('é'.repeat(37));
  fireEvent.click(submitButton());
  expect(screen.getByText(/That password is too long/)).toBeInTheDocument();
  expect(resetCalls()).toHaveLength(0);
});

test('repeat clicks send one request', async () => {
  const { resetCalls } = await openForm(linkPath, [jsonResponse(200, OK)]);
  fill('new password');
  await act(async () => {
    fireEvent.click(submitButton());
    fireEvent.click(submitButton());
    fireEvent.click(submitButton());
  });
  await screen.findByRole('heading', { name: 'Password updated' });
  expect(resetCalls()).toHaveLength(1);
});

test('a link that expires while the form is open (400 on submit) offers a new one', async () => {
  const { router } = await openForm(linkPath, [
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
  await openForm(linkPath, [
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
  const { resetCalls } = await openForm(linkPath, [
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
  expect(resetCalls()).toHaveLength(2);
});

test('leaving while the reset is sending does not replace the new page', async () => {
  let respond!: (value: unknown) => void;
  const { fetchMock, router } = await openForm();
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
  await openForm(linkPath, [jsonResponse(200, OK)]);
  fill('new password');
  fireEvent.click(submitButton());
  await screen.findByRole('heading', { name: 'Password updated' });
  expect(getToken()).toBeNull();
});

test('empty password fields show text placeholders, not dots', async () => {
  await openForm();
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
  await openForm();
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
