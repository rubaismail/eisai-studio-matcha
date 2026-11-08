// Uses a data router like main.tsx.
import { afterEach, expect, test, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import App from './App';
import AuthProvider from './auth/AuthProvider';
import { TOKEN_KEY } from './auth/session';
import { admin, customer, jsonResponse, signInAs } from './test-utils';

function renderApp(path: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(jsonResponse(200, { items: [] })),
  );
  const router = createMemoryRouter([{ path: '*', element: <App /> }], {
    initialEntries: [path],
  });
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return router;
}

const desktopNav = () => screen.getAllByRole('navigation', { name: 'Main' })[0];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('Log out in the navbar on My account goes home, not to log in', async () => {
  signInAs(customer);
  const router = renderApp('/account');
  expect(
    await screen.findByRole('heading', { name: 'My account.' }),
  ).toBeInTheDocument();
  fireEvent.click(
    within(desktopNav()).getByRole('button', { name: 'Log out' }),
  );
  expect(
    await screen.findByRole('heading', { name: 'Eisai Studio' }),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/');
  expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
});

test('Log out in the navbar on the menu editor goes home', async () => {
  signInAs(admin);
  const router = renderApp('/admin');
  expect(await screen.findByText('No drinks yet')).toBeInTheDocument();
  fireEvent.click(
    within(desktopNav()).getByRole('button', { name: 'Log out' }),
  );
  expect(
    await screen.findByRole('heading', { name: 'Eisai Studio' }),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/');
});

test('signed-out visitors to /admin/new land on the login page', async () => {
  const router = renderApp('/admin/new');
  expect(
    await screen.findByRole('heading', { name: 'Welcome back!' }),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/login');
});

test('the footer shows on public pages but not the menu editor', async () => {
  renderApp('/login');
  expect(await screen.findByText('Whisking schedule')).toBeInTheDocument();
  cleanup();
  signInAs(admin);
  renderApp('/admin');
  await screen.findByText('No drinks yet');
  expect(screen.queryByText('Whisking schedule')).toBeNull();
});

test('customers who open the menu editor see Staff only with the footer', async () => {
  signInAs(customer);
  renderApp('/admin');
  expect(
    await screen.findByRole('heading', { name: 'Staff only.' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Whisking schedule')).toBeInTheDocument();
});
