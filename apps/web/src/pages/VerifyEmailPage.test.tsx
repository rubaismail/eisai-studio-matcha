import { StrictMode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import AuthProvider from '../auth/AuthProvider';
import { jsonResponse } from '../test-utils';
import VerifyEmailPage from './VerifyEmailPage';

// Unique tokens per test: the page remembers tokens it already sent.
let tokenCount = 0;
const newToken = () => `token-${++tokenCount}-a+b/c`;

function renderVerify(path: string, responses: unknown[] = []) {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <AuthProvider>
            <VerifyEmailPage />
          </AuthProvider>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  // StrictMode runs effects twice, like `npm run dev` does.
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
  return { fetchMock, router };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('a good link verifies once and removes the token from the address bar', async () => {
  const token = newToken();
  const { fetchMock, router } = renderVerify(
    `/verify-email?token=${encodeURIComponent(token)}`,
    [jsonResponse(200, { message: 'Email verified.' })],
  );
  expect(
    screen.getByRole('heading', { name: 'Checking your email' }),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole('heading', { name: 'Email verified' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Log in →' })).toHaveAttribute(
    'href',
    '/login',
  );

  // Sent exactly once, even with StrictMode's double effects.
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe(
    `/api/auth/verify?token=${encodeURIComponent(token)}`,
  );
  expect(router.state.location.search).toBe('');
  expect(router.state.location.state).toEqual({ verifyResult: 'verified' });
});

test('an expired or used link (400) offers a new one', async () => {
  const { router } = renderVerify(`/verify-email?token=${newToken()}`, [
    jsonResponse(400, { error: 'Missing or invalid input…' }),
  ]);
  expect(
    await screen.findByRole('heading', { name: 'Link expired' }),
  ).toBeInTheDocument();
  expect(router.state.location.search).toBe('');
  expect(screen.getByLabelText('Email address')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '← Back to login' })).toHaveAttribute(
    'href',
    '/login',
  );
});

test('the Link expired form sends a new link', async () => {
  const { fetchMock } = renderVerify(`/verify-email?token=${newToken()}`, [
    jsonResponse(400, {}),
    jsonResponse(200, {}),
  ]);
  await screen.findByRole('heading', { name: 'Link expired' });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'jane@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send a new link →' }));
  expect(
    await screen.findByText(/a new link is on its way/),
  ).toBeInTheDocument();
  expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/resend-verification');
});

test('no token at all shows Link expired without calling the API', () => {
  const { fetchMock } = renderVerify('/verify-email');
  expect(
    screen.getByRole('heading', { name: 'Link expired' }),
  ).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('a server error can be retried with the same link', async () => {
  const token = newToken();
  const { fetchMock } = renderVerify(
    `/verify-email?token=${encodeURIComponent(token)}`,
    [jsonResponse(500, { error: 'x' }), jsonResponse(200, {})],
  );
  expect(
    await screen.findByRole('heading', { name: 'Something went wrong' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(
    await screen.findByRole('heading', { name: 'Email verified' }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][0]).toBe(
    `/api/auth/verify?token=${encodeURIComponent(token)}`,
  );
});

test('a network failure shows the retry screen', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <AuthProvider>
            <VerifyEmailPage />
          </AuthProvider>
        ),
      },
    ],
    { initialEntries: [`/verify-email?token=${newToken()}`] },
  );
  render(<RouterProvider router={router} />);
  expect(
    await screen.findByRole('heading', { name: 'Something went wrong' }),
  ).toBeInTheDocument();
});

test('reloading after verifying shows the result without re-sending', () => {
  const { fetchMock } = renderVerify('/verify-email');
  cleanup();
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <AuthProvider>
            <VerifyEmailPage />
          </AuthProvider>
        ),
      },
    ],
    {
      initialEntries: [
        { pathname: '/verify-email', state: { verifyResult: 'verified' } },
      ],
    },
  );
  render(<RouterProvider router={router} />);
  expect(
    screen.getByRole('heading', { name: 'Email verified' }),
  ).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('screen readers hear each result', async () => {
  renderVerify(`/verify-email?token=${newToken()}`, [jsonResponse(200, {})]);
  const live = screen.getAllByRole('status')[0];
  expect(live).toHaveTextContent('Checking your verification link.');
  await screen.findByRole('heading', { name: 'Email verified' });
  expect(live).toHaveTextContent('Email verified. You can now log in.');
});

test('a check that fails after leaving the page is retried on the next visit', async () => {
  const token = newToken();
  let fail: (value: unknown) => void = () => {};
  const fetchMock = vi
    .fn()
    .mockImplementationOnce(() => new Promise((resolve) => (fail = resolve)))
    .mockResolvedValueOnce(jsonResponse(200, {}));
  vi.stubGlobal('fetch', fetchMock);
  const path = `/verify-email?token=${encodeURIComponent(token)}`;
  const make = () =>
    createMemoryRouter(
      [
        {
          path: '*',
          element: (
            <AuthProvider>
              <VerifyEmailPage />
            </AuthProvider>
          ),
        },
      ],
      { initialEntries: [path] },
    );

  render(<RouterProvider router={make()} />);
  cleanup(); // left the page while checking
  fail(jsonResponse(500, { error: 'x' }));
  await new Promise((r) => setTimeout(r, 0));

  render(<RouterProvider router={make()} />);
  expect(
    await screen.findByRole('heading', { name: 'Email verified' }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
