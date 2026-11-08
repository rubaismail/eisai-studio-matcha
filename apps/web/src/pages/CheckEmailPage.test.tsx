import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { jsonResponse, renderWithAuth } from '../test-utils';
import CheckEmailPage from './CheckEmailPage';

function renderPage(state: unknown, responses: unknown[] = []) {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  renderWithAuth(
    <Routes>
      <Route path="/check-email" element={<CheckEmailPage />} />
    </Routes>,
    [{ pathname: '/check-email', state }],
  );
  return fetchMock;
}

const resendButton = () =>
  screen.getByRole('button', { name: /resend|sending/i });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test('shows the address the email went to', () => {
  renderPage({ email: 'jane@example.com' });
  expect(
    screen.getByRole('heading', { name: 'Check your inbox' }),
  ).toBeInTheDocument();
  expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '← Back to login' })).toHaveAttribute(
    'href',
    '/login',
  );
  expect(
    screen.getByText(/Check your spam or junk folder/),
  ).toBeInTheDocument();
});

test('Resend email sends to that address, then waits a minute', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const fetchMock = renderPage({ email: 'jane@example.com' }, [
    jsonResponse(200, { message: 'If this account needs verification…' }),
  ]);
  fireEvent.click(resendButton());
  expect(
    await screen.findByText(/a new link is on its way/),
  ).toBeInTheDocument();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/auth/resend-verification');
  expect(JSON.parse(init.body)).toEqual({ email: 'jane@example.com' });

  expect(resendButton()).toBeDisabled();
  expect(
    screen.getByText(/ask for another in (60|59|58) seconds/),
  ).toBeInTheDocument();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(61_000);
  });
  expect(resendButton()).toBeEnabled();
  expect(screen.queryByText(/ask for another in/)).toBeNull();
});

test('the resend limit (429) says how long to wait', async () => {
  renderPage({ email: 'jane@example.com' }, [
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

test('a failed resend can be tried again right away', async () => {
  const fetchMock = renderPage({ email: 'jane@example.com' }, [
    jsonResponse(500, { error: 'x' }),
    jsonResponse(200, {}),
  ]);
  fireEvent.click(resendButton());
  expect(
    await screen.findByText('Couldn’t send a new link. Please try again.'),
  ).toBeInTheDocument();
  expect(resendButton()).toBeEnabled();
  fireEvent.click(resendButton());
  expect(
    await screen.findByText(/a new link is on its way/),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('opened without an address, it asks for one before resending', async () => {
  const fetchMock = renderPage(null, [jsonResponse(200, {})]);
  fireEvent.click(screen.getByRole('button', { name: 'Send a new link →' }));
  expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'jane@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send a new link →' }));
  expect(
    await screen.findByText(/a new link is on its way/),
  ).toBeInTheDocument();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    email: 'jane@example.com',
  });
});

test('ignores an address that is not a string', () => {
  renderPage({ email: { evil: true } });
  expect(screen.getByLabelText('Email address')).toBeInTheDocument();
});
