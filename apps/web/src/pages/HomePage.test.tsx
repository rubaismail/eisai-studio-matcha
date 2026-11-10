import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { jsonResponse, makeDrink, renderWithAuth } from '../test-utils';
import HomePage from './HomePage';

function renderHome(response: unknown) {
  const fetchMock = vi.fn();
  if (response instanceof Error) fetchMock.mockRejectedValue(response);
  else fetchMock.mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  renderWithAuth(<HomePage />);
  return fetchMock;
}

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

test('Eisai’s Special shows only drinks featured on home', async () => {
  const fetchMock = renderHome(
    jsonResponse(200, {
      items: [
        makeDrink({ name: 'Golden Hour', isFeatured: true }),
        makeDrink({ name: 'Kyoto Fog' }),
        makeDrink({ name: 'Tokyo Rose', isFeatured: true }),
      ],
    }),
  );
  const section = (
    await screen.findByRole('heading', { name: 'Eisai’s Special' })
  ).closest('section')!;
  expect(
    within(section)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent),
  ).toEqual(['Golden Hour', 'Tokyo Rose']);
  expect(
    within(section).getByRole('link', { name: 'See the full menu →' }),
  ).toHaveAttribute('href', '/menu');
  expect(fetchMock.mock.calls[0][0]).toBe('/api/menu');
});

test('Eisai’s Special stays hidden with nothing featured or no menu', async () => {
  renderHome(jsonResponse(200, { items: [makeDrink({ name: 'Kyoto Fog' })] }));
  await screen.findByRole('heading', { name: 'At the pop-up' });
  await new Promise((r) => setTimeout(r, 0));
  expect(screen.queryByRole('heading', { name: 'Eisai’s Special' })).toBeNull();
  cleanup();

  renderHome(new Error('offline'));
  await new Promise((r) => setTimeout(r, 0));
  expect(screen.queryByRole('heading', { name: 'Eisai’s Special' })).toBeNull();
});

test('Eisai’s Special holds its space while the menu loads', async () => {
  let respond!: (value: unknown) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockReturnValue(new Promise((resolve) => (respond = resolve))),
  );
  renderWithAuth(<HomePage />);
  // Keeps the footer from moving after a jump to the schedule.
  expect(
    screen.getByRole('heading', { name: 'Eisai’s Special' }),
  ).toBeInTheDocument();
  respond(jsonResponse(200, { items: [] }));
  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: 'Eisai’s Special' }),
    ).toBeNull(),
  );
});
