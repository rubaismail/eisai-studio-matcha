import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router';
import { admin, jsonResponse, renderWithAuth, signInAs } from '../test-utils';
import RegisterPage from './RegisterPage';

function CheckEmailProbe() {
  const state = useLocation().state as { email?: string };
  return <p>check email page for {state?.email}</p>;
}

function renderRegister(responses: unknown[] = []) {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  renderWithAuth(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/check-email" element={<CheckEmailProbe />} />
      <Route path="/admin" element={<p>admin dashboard</p>} />
      <Route path="/login" element={<p>login page</p>} />
    </Routes>,
    ['/register'],
  );
  return fetchMock;
}

const input = (label: string) => screen.getByLabelText(label);
const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

function fill(
  values: {
    first?: string;
    last?: string;
    email?: string;
    password?: string;
    confirm?: string;
  } = {},
) {
  const {
    first = 'Jane',
    last = 'Doe',
    email = 'jane@example.com',
    password = 'secret-pass',
  } = values;
  const confirm = values.confirm ?? password;
  fireEvent.change(input('First name'), { target: { value: first } });
  fireEvent.change(input('Last name'), { target: { value: last } });
  fireEvent.change(input('Email address'), { target: { value: email } });
  fireEvent.change(input('Password'), { target: { value: password } });
  fireEvent.change(input('Confirm password'), { target: { value: confirm } });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('an empty form shows every message and focuses the first field', () => {
  const fetchMock = renderRegister();
  submit();
  expect(screen.getByText('Enter your first name.')).toBeInTheDocument();
  expect(screen.getByText('Enter your last name.')).toBeInTheDocument();
  expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
  expect(screen.getByText('Enter a password.')).toBeInTheDocument();
  expect(screen.getByText('Re-enter your password.')).toBeInTheDocument();
  expect(input('First name')).toHaveFocus();
  expect(input('First name')).toHaveAttribute('aria-invalid', 'true');
  expect(fetchMock).not.toHaveBeenCalled();
});

test('names made of spaces are rejected, like the API', () => {
  renderRegister();
  fill({ first: '   ' });
  submit();
  expect(screen.getByText('Enter your first name.')).toBeInTheDocument();
});

test('short and mismatched passwords are caught before sending', () => {
  const fetchMock = renderRegister();
  fill({ password: 'short', confirm: 'different' });
  submit();
  expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
  expect(screen.getByText('Passwords don’t match.')).toBeInTheDocument();
  expect(input('Password')).toHaveFocus();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('sends exactly the four fields and goes to Check your inbox', async () => {
  const fetchMock = renderRegister([
    jsonResponse(201, { message: 'Account created.' }),
  ]);
  fill({ first: ' Jane ', last: ' Doe ', email: ' Jane@Example.com ' });
  submit();
  expect(
    await screen.findByText('check email page for jane@example.com'),
  ).toBeInTheDocument();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/auth/register');
  expect(init.method).toBe('POST');
  expect(init.headers.Authorization).toBeUndefined();
  expect(JSON.parse(init.body)).toEqual({
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'Jane@Example.com',
    password: 'secret-pass',
  });
});

test('passwords are sent exactly as typed, spaces included', async () => {
  const fetchMock = renderRegister([jsonResponse(201, {})]);
  fill({ password: '  spaced pass  ' });
  submit();
  await screen.findByText(/check email page/);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).password).toBe(
    '  spaced pass  ',
  );
});

test('409 says the email is taken and links to log in', async () => {
  renderRegister([
    jsonResponse(409, { error: 'Email address already registered.' }),
  ]);
  fill();
  submit();
  expect(
    await screen.findByText(/An account with this email already exists/),
  ).toBeInTheDocument();
  expect(input('Email address')).toHaveAttribute('aria-invalid', 'true');
  expect(input('Email address')).toHaveFocus();
  expect(screen.getByRole('link', { name: 'Log in instead' })).toHaveAttribute(
    'href',
    '/login',
  );
  expect(
    screen.getByRole('button', { name: 'Create account →' }),
  ).toBeEnabled();
});

test.each([
  [400, 'Some details weren’t accepted'],
  [429, 'Too many sign-up attempts'],
  [500, 'Something went wrong on our end'],
])('%i shows a form-level message', async (status, text) => {
  renderRegister([jsonResponse(status, { error: 'x' })]);
  fill();
  submit();
  expect(await screen.findByRole('alert')).toHaveTextContent(text);
});

test('a network failure shows the general message', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
  renderWithAuth(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
    </Routes>,
    ['/register'],
  );
  fill();
  submit();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Something went wrong on our end',
  );
});

test('cannot be submitted twice while sending', async () => {
  let respond: (value: unknown) => void = () => {};
  const fetchMock = vi.fn(() => new Promise((r) => (respond = r)));
  vi.stubGlobal('fetch', fetchMock);
  renderWithAuth(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/check-email" element={<CheckEmailProbe />} />
    </Routes>,
    ['/register'],
  );
  fill();
  submit();
  const button = screen.getByRole('button', { name: 'Creating account…' });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  fireEvent.submit(button.closest('form')!);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  respond(jsonResponse(201, {}));
  expect(await screen.findByText(/check email page/)).toBeInTheDocument();
});

test('signed-in visitors skip the form', () => {
  signInAs(admin);
  renderRegister();
  expect(screen.getByText('admin dashboard')).toBeInTheDocument();
});

test('links back to log in', () => {
  renderRegister();
  const row = screen.getByText('Already have an account?').parentElement!;
  expect(within(row).getByRole('link', { name: 'Log in' })).toHaveAttribute(
    'href',
    '/login',
  );
});
