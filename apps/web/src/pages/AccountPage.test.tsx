import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { RequireAuth } from '../auth/guards';
import { TOKEN_KEY } from '../auth/session';
import { customer, renderWithAuth, signInAs } from '../test-utils';
import AccountPage from './AccountPage';

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
