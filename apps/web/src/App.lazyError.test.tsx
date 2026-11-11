// A lazy page whose download fails, as happens when a deploy removes the old
// files while a visitor still has the site open.
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
import { jsonResponse } from './test-utils';

vi.mock('./pages/LoginPage', () => {
  throw new Error('Failed to fetch dynamically imported module');
});

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
  vi.restoreAllMocks();
  localStorage.clear();
});

test('a page that fails to download shows a reload message and keeps the navbar', async () => {
  // React logs caught render errors; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const reload = vi.fn();
  vi.stubGlobal('location', { ...window.location, reload });
  renderApp('/login');

  const alert = await screen.findByRole('alert');
  expect(
    within(alert).getByRole('heading', {
      level: 1,
      name: 'This page couldn’t load',
    }),
  ).toBeInTheDocument();
  expect(desktopNav()).toBeInTheDocument();
  expect(screen.getByRole('contentinfo')).toBeInTheDocument();

  fireEvent.click(within(alert).getByRole('button', { name: 'Reload' }));
  expect(reload).toHaveBeenCalledTimes(1);
});

test('going to a working page after the error shows that page', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const router = renderApp('/login');
  await screen.findByRole('heading', { name: 'This page couldn’t load' });

  fireEvent.click(
    within(desktopNav()).getByRole('link', { name: 'Our story' }),
  );
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Our story' }),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/our-story');
  expect(screen.queryByRole('alert')).toBeNull();
});
