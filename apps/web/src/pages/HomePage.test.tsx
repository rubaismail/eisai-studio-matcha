import { afterEach, expect, test, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { jsonResponse, makeDrink, renderWithAuth } from '../test-utils';
import HomePage from './HomePage';

function renderHome(...responses: unknown[]) {
  const fetchMock = vi.fn();
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
    else fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal('fetch', fetchMock);
  renderWithAuth(<HomePage />);
  return fetchMock;
}

const special = () =>
  screen.getByRole('heading', { name: 'Eisai’s Special' }).closest('section')!;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('the hero links to the menu and the schedule', () => {
  renderHome(jsonResponse(200, { items: [] }));
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'See the menu' })).toHaveAttribute(
    'href',
    '/menu',
  );
  expect(
    screen.getByRole('link', { name: 'Find us this week' }),
  ).toHaveAttribute('href', '/#find-us');
  expect(
    screen.getByRole('link', { name: 'Read our story →' }),
  ).toHaveAttribute('href', '/our-story');
});

test('Eisai’s Special shows drinks featured on home, like the mobile app', async () => {
  const fetchMock = renderHome(
    jsonResponse(200, {
      items: [
        makeDrink({ name: 'Golden Hour', isFeatured: true }),
        makeDrink({ name: 'Kyoto Fog' }),
        makeDrink({
          name: 'Matcha Cookie',
          isFeatured: true,
          category: 'Treats',
        }),
        makeDrink({ name: 'Tokyo Rose', isFeatured: true }),
      ],
    }),
  );
  await screen.findByRole('heading', { name: 'Golden Hour' });
  expect(
    within(special())
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent),
  ).toEqual(['Golden Hour', 'Tokyo Rose']);
  expect(
    within(special()).getByRole('link', { name: 'See the full menu →' }),
  ).toHaveAttribute('href', '/menu');
  expect(fetchMock.mock.calls[0][0]).toBe('/api/menu');
});

test('with nothing featured it says so and still links to the menu', async () => {
  renderHome(jsonResponse(200, { items: [makeDrink({ name: 'Kyoto Fog' })] }));
  expect(
    await screen.findByText('No featured drinks right now.'),
  ).toBeInTheDocument();
  expect(
    within(special()).getByRole('link', { name: 'See the full menu →' }),
  ).toBeInTheDocument();
});

test('if the menu can’t load it offers to try again', async () => {
  const fetchMock = renderHome(
    new Error('offline'),
    jsonResponse(200, {
      items: [makeDrink({ name: 'Golden Hour', isFeatured: true })],
    }),
  );
  expect(
    await screen.findByText('Featured drinks could not be loaded.'),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(
    await screen.findByRole('heading', { name: 'Golden Hour' }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('Eisai’s Special holds its space while the menu loads', async () => {
  let respond!: (value: unknown) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockReturnValue(new Promise((resolve) => (respond = resolve))),
  );
  renderWithAuth(<HomePage />);
  // Placeholder tiles keep the footer from moving after a jump to it.
  expect(special().querySelectorAll('[aria-hidden="true"] > div')).toHaveLength(
    3,
  );
  respond(jsonResponse(200, { items: [] }));
  await waitFor(() =>
    expect(
      screen.getByText('No featured drinks right now.'),
    ).toBeInTheDocument(),
  );
});
