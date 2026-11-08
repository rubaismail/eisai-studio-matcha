// Uses a data router like main.tsx.
import { afterEach, expect, test, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <AuthProvider>
            <App />
          </AuthProvider>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
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

test('Log out with unsaved menu edits: Cancel keeps the edits and the login', async () => {
  signInAs(admin);
  const router = renderApp('/admin/new');
  const name = await screen.findByLabelText(/Drink name/);
  fireEvent.change(name, { target: { value: 'Yuzu Cloud' } });
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

  fireEvent.click(
    within(desktopNav()).getByRole('button', { name: 'Log out' }),
  );

  await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
  expect(router.state.location.pathname).toBe('/admin/new');
  expect(screen.getByLabelText(/Drink name/)).toHaveValue('Yuzu Cloud');
  expect(localStorage.getItem(TOKEN_KEY)).not.toBeNull();
  confirmSpy.mockRestore();
});

test('Log out with unsaved menu edits: confirming leaves and signs out', async () => {
  signInAs(admin);
  const router = renderApp('/admin/new');
  const name = await screen.findByLabelText(/Drink name/);
  fireEvent.change(name, { target: { value: 'Yuzu Cloud' } });
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

  fireEvent.click(
    within(desktopNav()).getByRole('button', { name: 'Log out' }),
  );

  expect(
    await screen.findByRole('heading', { name: 'Eisai Studio' }),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/');
  expect(router.state.location.state).toBeNull();
  expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  confirmSpy.mockRestore();
});

test('Find us on the menu editor goes to the home page footer', async () => {
  signInAs(admin);
  renderApp('/admin');
  await screen.findByText('No drinks yet');
  expect(
    within(desktopNav()).getByRole('link', { name: 'Find us' }),
  ).toHaveAttribute('href', '/#find-us');
});

test('signed-in admins who open /login go to the menu editor', async () => {
  signInAs(admin);
  const router = renderApp('/login');
  await screen.findByText('No drinks yet');
  expect(router.state.location.pathname).toBe('/admin');
});
