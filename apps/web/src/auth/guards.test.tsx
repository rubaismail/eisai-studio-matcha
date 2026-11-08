import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router';
import { admin, customer, renderWithAuth, signInAs } from '../test-utils';
import { RequireAdmin, RequireAuth } from './guards';
import type { LoginRedirectState } from './guards';

function LoginProbe() {
  const state = (useLocation().state ?? {}) as LoginRedirectState;
  return (
    <p>
      login page from={state.from} expired={String(state.expired)}
    </p>
  );
}

const routes = (
  <Routes>
    <Route path="/login" element={<LoginProbe />} />
    <Route
      path="/admin"
      element={
        <RequireAdmin>
          <p>admin dashboard</p>
        </RequireAdmin>
      }
    />
    <Route
      path="/account"
      element={
        <RequireAuth>
          <p>account page</p>
        </RequireAuth>
      }
    />
  </Routes>
);

afterEach(() => {
  cleanup();
  localStorage.clear();
});

test('signed-out visitors to /admin are sent to log in and back', () => {
  renderWithAuth(routes, ['/admin']);
  expect(
    screen.getByText('login page from=/admin expired=false'),
  ).toBeInTheDocument();
});

test('an expired session is passed to the login page', () => {
  signInAs(admin, -1);
  renderWithAuth(routes, ['/admin']);
  expect(
    screen.getByText('login page from=/admin expired=true'),
  ).toBeInTheDocument();
});

test('signed-in customers see "Staff only" instead of the dashboard', () => {
  signInAs(customer);
  renderWithAuth(routes, ['/admin']);
  expect(
    screen.getByRole('heading', { name: 'Staff only.' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/jane@example\.com/)).toBeInTheDocument();
  expect(screen.queryByText('admin dashboard')).not.toBeInTheDocument();
});

test('"Log in with a staff account" signs out and returns to /admin after', () => {
  signInAs(customer);
  renderWithAuth(routes, ['/admin']);
  fireEvent.click(
    screen.getByRole('button', { name: 'Log in with a staff account' }),
  );
  expect(
    screen.getByText('login page from=/admin expired=false'),
  ).toBeInTheDocument();
});

test('admins see the dashboard', () => {
  signInAs(admin);
  renderWithAuth(routes, ['/admin']);
  expect(screen.getByText('admin dashboard')).toBeInTheDocument();
});

test('any signed-in user can open a RequireAuth page', () => {
  signInAs(customer);
  renderWithAuth(routes, ['/account']);
  expect(screen.getByText('account page')).toBeInTheDocument();
});

test('signed-out visitors to a RequireAuth page are sent to log in', () => {
  renderWithAuth(routes, ['/account']);
  expect(
    screen.getByText('login page from=/account expired=false'),
  ).toBeInTheDocument();
});
