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
import { jsonResponse } from '../test-utils';
import ForgotPasswordPage from './ForgotPasswordPage';

const NEUTRAL = {
  message:
    'If an account exists for this email, a password-reset link has been sent.',
};

function renderPage(state: unknown = null, responses: unknown[] = []) {
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
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '*', element: <h1>Another page</h1> },
        ],
      },
    ],
    { initialEntries: [{ pathname: '/forgot-password', state }] },
  );
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
  return { fetchMock, router };
}

const emailField = () => screen.getByLabelText('Email address');
const sendButton = () =>
  screen.getByRole('button', { name: /send reset link|sending/i });
const resendButton = () =>
  screen.getByRole('button', { name: /resend reset link|sending/i });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test('sends the email and shows the same message whether or not the account exists', async () => {
  const { fetchMock } = renderPage(null, [jsonResponse(200, NEUTRAL)]);
  expect(
    screen.getByRole('heading', { name: 'Forgot password?' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '← Back to login' })).toHaveAttribute(
    'href',
    '/login',
  );
  fireEvent.change(emailField(), { target: { value: '  Jane@Example.com ' } });
  fireEvent.click(sendButton());

  expect(
    await screen.findByRole('heading', { name: 'Check your inbox.' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText('If an account exists, we’ll email a reset link.'),
  ).toBeInTheDocument();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/auth/forgot-password');
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toEqual({ email: 'Jane@Example.com' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('prefills the address passed by My account', () => {
  renderPage({ email: 'jane@example.com' });
  expect(emailField()).toHaveValue('jane@example.com');
});

test('checks the address before sending', () => {
  const { fetchMock } = renderPage();
  fireEvent.click(sendButton());
  expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
  expect(emailField()).toHaveFocus();
  expect(emailField()).toHaveAttribute('aria-invalid', 'true');

  fireEvent.change(emailField(), { target: { value: 'jane@example' } });
  fireEvent.click(sendButton());
  expect(
    screen.getByText('Enter a valid email address, like you@example.com.'),
  ).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('repeat clicks send one request', async () => {
  const { fetchMock } = renderPage(null, [jsonResponse(200, NEUTRAL)]);
  fireEvent.change(emailField(), { target: { value: 'jane@example.com' } });
  await act(async () => {
    fireEvent.click(sendButton());
    fireEvent.click(sendButton());
    fireEvent.click(sendButton());
  });
  await screen.findByRole('heading', { name: 'Check your inbox.' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('Back from Check your inbox returns to the form with the address', async () => {
  const { router } = renderPage(null, [jsonResponse(200, NEUTRAL)]);
  fireEvent.change(emailField(), { target: { value: 'jane@example.com' } });
  fireEvent.click(sendButton());
  await screen.findByRole('heading', { name: 'Check your inbox.' });

  await act(async () => {
    await router.navigate(-1);
  });
  expect(
    screen.getByRole('heading', { name: 'Forgot password?' }),
  ).toBeInTheDocument();
  expect(emailField()).toHaveValue('jane@example.com');
  // The API wouldn't send again yet, so the form waits too.
  expect(sendButton()).toBeDisabled();
  expect(
    screen.getByText(/You can ask for a new link in (60|59|58) seconds/),
  ).toBeInTheDocument();
  // A different address isn't held up.
  fireEvent.change(emailField(), { target: { value: 'jo@example.com' } });
  expect(sendButton()).toBeEnabled();
});

test('leaving while the link is sending does not pull the visitor back', async () => {
  let respond!: (value: unknown) => void;
  const { fetchMock, router } = renderPage();
  fetchMock.mockReturnValueOnce(new Promise((resolve) => (respond = resolve)));
  fireEvent.change(emailField(), { target: { value: 'jane@example.com' } });
  fireEvent.click(sendButton());
  await act(async () => {
    await router.navigate('/login');
  });
  await act(async () => {
    respond(jsonResponse(200, NEUTRAL));
  });
  expect(router.state.location.pathname).toBe('/login');
  expect(
    screen.getByRole('heading', { name: 'Another page' }),
  ).toBeInTheDocument();
});

test('Resend waits a minute after the first link, then sends again', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const { fetchMock } = renderPage(null, [
    jsonResponse(200, NEUTRAL),
    jsonResponse(200, NEUTRAL),
  ]);
  fireEvent.change(emailField(), { target: { value: 'jane@example.com' } });
  fireEvent.click(sendButton());
  await screen.findByRole('heading', { name: 'Check your inbox.' });

  expect(resendButton()).toBeDisabled();
  expect(
    screen.getByText(/You can ask for a new link in (60|59|58) seconds/),
  ).toBeInTheDocument();
  // No "new link" message until Resend is used.
  expect(screen.queryByText(/a new reset link is on its way/)).toBeNull();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(61_000);
  });
  expect(resendButton()).toBeEnabled();
  fireEvent.click(resendButton());
  expect(
    await screen.findByText(
      'If an account exists, a new reset link is on its way.',
    ),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
    email: 'jane@example.com',
  });
  expect(resendButton()).toBeDisabled();
});

test('a reload keeps Check your inbox and the remaining wait', () => {
  renderPage({ sentTo: 'jane@example.com', sentAt: Date.now() - 30_000 });
  expect(
    screen.getByRole('heading', { name: 'Check your inbox.' }),
  ).toBeInTheDocument();
  expect(resendButton()).toBeDisabled();
  expect(
    screen.getByText(/You can ask for a new link in (30|29|28) seconds/),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '← Back to login' })).toHaveAttribute(
    'href',
    '/login',
  );
});

test('the email limit (429) on the form says how long to wait', async () => {
  renderPage(null, [
    jsonResponse(429, { error: 'Too many login attempts. Try again later.' }),
  ]);
  fireEvent.change(emailField(), { target: { value: 'jane@example.com' } });
  fireEvent.click(sendButton());
  expect(
    await screen.findByText('You’ve asked for several links already.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Please try again in 15 minutes.'),
  ).toBeInTheDocument();
  expect(sendButton()).toBeDisabled();
  expect(
    screen.getByRole('heading', { name: 'Forgot password?' }),
  ).toBeInTheDocument();
});

test('the limit on Resend says how long to wait', async () => {
  renderPage({ sentTo: 'jane@example.com', sentAt: Date.now() - 61_000 }, [
    jsonResponse(429, { error: 'Too many login attempts. Try again later.' }),
  ]);
  fireEvent.click(resendButton());
  expect(
    await screen.findByText('You’ve asked for several links already.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Please try again in 15 minutes.'),
  ).toBeInTheDocument();
  expect(resendButton()).toBeDisabled();
});

test('a failed send stays on the form and can be tried again', async () => {
  const { fetchMock } = renderPage(null, [
    jsonResponse(500, { error: 'x' }),
    jsonResponse(200, NEUTRAL),
  ]);
  fireEvent.change(emailField(), { target: { value: 'jane@example.com' } });
  fireEvent.click(sendButton());
  expect(
    await screen.findByText('Couldn’t send a reset link. Please try again.'),
  ).toBeInTheDocument();
  expect(sendButton()).toBeEnabled();
  fireEvent.click(sendButton());
  expect(
    await screen.findByRole('heading', { name: 'Check your inbox.' }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
