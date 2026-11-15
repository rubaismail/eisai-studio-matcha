import { afterEach, expect, test, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { MenuItem } from '../types/menu';
import { jsonResponse, makeDrink } from '../test-utils';
import MenuPage, { SEARCH_DELAY_MS } from './MenuPage';

const drinks = [
  makeDrink({
    name: 'Golden Hour',
    inspiredBy: 'Banana bread',
    description: 'Matcha or Hojicha / Eisai’s banana milk',
    teaBases: ['matcha', 'hojicha'],
    isRecommended: true,
    imageUrl: 'https://img.example/golden.png',
    imageAlt: 'Layered matcha drink with cinnamon foam',
  }),
  makeDrink({
    name: 'Mango Dango',
    inspiredBy: 'Mango sticky rice',
    description: 'Matcha / Mango puree / Coconut sauce',
    isRecommended: true,
  }),
  makeDrink({
    name: 'Tokyo Rose',
    description: 'Matcha or Hojicha / Housemade rose syrup',
    teaBases: ['matcha', 'hojicha'],
  }),
  makeDrink({ name: 'Kyoto Fog', description: 'Earl grey foam' }),
];

function renderMenu(...responses: unknown[]) {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  render(<MenuPage />);
  return fetchMock;
}

// A fake API: GET /api/menu returns every drink, and ?search= does what the
// real server does (partial, case-insensitive match on name, description and
// inspiredBy). Returns the mock so tests can check what was asked.
function renderWithServer(menu: MenuItem[] = drinks) {
  const fetchMock = vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost');
    const search = url.searchParams.get('search')?.toLowerCase();
    const items = search
      ? menu.filter((d) =>
          [d.name, d.description, d.inspiredBy].some((text) =>
            text.toLowerCase().includes(search),
          ),
        )
      : menu;
    return jsonResponse(200, { items });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<MenuPage />);
  return fetchMock;
}

const searchCalls = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.includes('search='));

const chip = (name: RegExp) => screen.getByRole('button', { name });
const tileNames = () =>
  screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);
const search = () => screen.getByRole('searchbox', { name: 'Search drinks' });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('shows each drink without a price, with its photo and details', async () => {
  renderMenu(jsonResponse(200, { items: drinks }));
  expect(screen.getByText('Loading the menu…')).toBeInTheDocument();
  expect(await screen.findByText('4 drinks')).toBeInTheDocument();
  expect(tileNames()).toEqual([
    'Golden Hour',
    'Mango Dango',
    'Tokyo Rose',
    'Kyoto Fog',
  ]);
  const golden = screen.getByRole('heading', { name: 'Golden Hour' })
    .parentElement!.parentElement!;
  expect(within(golden).getByText('(Banana bread)')).toBeInTheDocument();
  expect(within(golden).getByText('Recommended')).toBeInTheDocument();
  expect(
    within(golden).getByRole('img', {
      name: 'Layered matcha drink with cinnamon foam',
    }),
  ).toHaveAttribute('src', 'https://img.example/golden.png');
  expect(screen.queryByText(/\$/)).toBeNull();
});

test('filter chips show counts and narrow the list', async () => {
  renderMenu(jsonResponse(200, { items: drinks }));
  await screen.findByText('4 drinks');
  expect(chip(/^All \(4\)$/)).toHaveAttribute('aria-pressed', 'true');
  expect(chip(/^Matcha \(4\)$/)).toBeInTheDocument();
  expect(chip(/^Hojicha \(2\)$/)).toBeInTheDocument();

  fireEvent.click(chip(/^Hojicha/));
  expect(chip(/^Hojicha/)).toHaveAttribute('aria-pressed', 'true');
  expect(chip(/^All/)).toHaveAttribute('aria-pressed', 'false');
  expect(tileNames()).toEqual(['Golden Hour', 'Tokyo Rose']);
  expect(screen.getByText('2 drinks')).toBeInTheDocument();

  fireEvent.click(chip(/^Recommended/));
  expect(tileNames()).toEqual(['Golden Hour', 'Mango Dango']);
});

test('search asks the server and shows its partial matches', async () => {
  const fetchMock = renderWithServer();
  await screen.findByText('4 drinks');
  fireEvent.change(search(), { target: { value: '  ROSE ' } });
  expect(await screen.findByText('1 drink')).toBeInTheDocument();
  expect(tileNames()).toEqual(['Tokyo Rose']);
  // Trimmed, and sent as-is: the server does the case-insensitive match.
  expect(searchCalls(fetchMock)).toEqual(['/api/menu?search=ROSE']);

  fireEvent.change(search(), { target: { value: 'sticky ri' } });
  await waitFor(() => expect(tileNames()).toEqual(['Mango Dango']));
  expect(searchCalls(fetchMock)).toContain('/api/menu?search=sticky%20ri');

  fireEvent.change(search(), { target: { value: 'earl gr' } });
  await waitFor(() => expect(tileNames()).toEqual(['Kyoto Fog']));
});

test('typing quickly sends one search, after the pause', async () => {
  const fetchMock = renderWithServer();
  await screen.findByText('4 drinks');
  for (const value of ['m', 'ma', 'man', 'mang'])
    fireEvent.change(search(), { target: { value } });
  // Until the server answers, the current list stays as it is.
  expect(tileNames()).toHaveLength(4);
  await waitFor(() => expect(tileNames()).toEqual(['Mango Dango']));
  expect(searchCalls(fetchMock)).toEqual(['/api/menu?search=mang']);
});

test('search results still respect the selected filter', async () => {
  renderWithServer();
  await screen.findByText('4 drinks');
  fireEvent.click(chip(/^Hojicha/));
  fireEvent.change(search(), { target: { value: 'matcha' } });
  // Golden Hour, Mango Dango and Tokyo Rose mention matcha; two are hojicha.
  await waitFor(() =>
    expect(tileNames()).toEqual(['Golden Hour', 'Tokyo Rose']),
  );
  // Chip counts describe the whole menu, as before.
  expect(chip(/^All \(4\)$/)).toBeInTheDocument();
});

test('clearing the search shows the whole menu without asking the server', async () => {
  const fetchMock = renderWithServer();
  await screen.findByText('4 drinks');
  fireEvent.change(search(), { target: { value: 'rose' } });
  await screen.findByText('1 drink');
  const calls = fetchMock.mock.calls.length;
  fireEvent.change(search(), { target: { value: '   ' } });
  expect(screen.getByText('4 drinks')).toBeInTheDocument();
  await new Promise((resolve) => setTimeout(resolve, SEARCH_DELAY_MS + 50));
  expect(fetchMock.mock.calls.length).toBe(calls);
});

test('the search box stops at the API limit', async () => {
  renderWithServer();
  await screen.findByText('4 drinks');
  expect(search()).toHaveAttribute('maxLength', '100');
});

test('a failed search can be retried', async () => {
  const fetchMock = renderWithServer();
  await screen.findByText('4 drinks');
  fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: 'x' }));
  fireEvent.change(search(), { target: { value: 'rose' } });
  expect(
    await screen.findByText(/couldn’t search the menu right now/),
  ).toBeInTheDocument();
  expect(tileNames()).toEqual([]);

  fireEvent.click(screen.getByRole('button', { name: 'Try again →' }));
  expect(await screen.findByText('1 drink')).toBeInTheDocument();
  expect(tileNames()).toEqual(['Tokyo Rose']);
});

test('an out-of-date answer never replaces a newer search', async () => {
  const fetchMock = renderWithServer();
  await screen.findByText('4 drinks');
  let answerSlowly: (value: ReturnType<typeof jsonResponse>) => void = () => {};
  fetchMock.mockImplementationOnce(
    () => new Promise((resolve) => (answerSlowly = resolve)),
  );
  fireEvent.change(search(), { target: { value: 'rose' } });
  await waitFor(() => expect(searchCalls(fetchMock)).toHaveLength(1));
  fireEvent.change(search(), { target: { value: 'fog' } });
  await waitFor(() => expect(tileNames()).toEqual(['Kyoto Fog']));
  answerSlowly(jsonResponse(200, { items: [drinks[2]] }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(tileNames()).toEqual(['Kyoto Fog']);
});

test('no matches offers to clear the search', async () => {
  renderWithServer();
  await screen.findByText('4 drinks');
  fireEvent.change(search(), { target: { value: 'strawberry espresso' } });
  expect(
    await screen.findByRole('heading', { name: 'No matches this time.' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/No drinks match “strawberry espresso”/),
  ).toBeInTheDocument();
  expect(screen.getByText('0 drinks')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(search()).toHaveValue('');
  expect(search()).toHaveFocus();
  expect(tileNames()).toHaveLength(4);
});

test('a filter with no drinks offers to show them all', async () => {
  renderMenu(
    jsonResponse(200, { items: drinks.filter((d) => !d.isRecommended) }),
  );
  await screen.findByText('2 drinks');
  fireEvent.click(chip(/^Recommended \(0\)$/));
  expect(
    screen.getByText('There are no recommended drinks on the menu right now.'),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show all drinks' }));
  expect(tileNames()).toHaveLength(2);
});

test('a load error can be retried', async () => {
  const fetchMock = renderMenu(
    jsonResponse(500, { error: 'x' }),
    jsonResponse(200, { items: drinks }),
  );
  expect(
    await screen.findByRole('heading', { name: 'A little hiccup.' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again →' }));
  expect(screen.getByText('Loading the menu…')).toBeInTheDocument();
  expect(await screen.findByText('4 drinks')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('an empty menu says so instead of showing filters', async () => {
  renderMenu(jsonResponse(200, { items: [] }));
  expect(
    await screen.findByRole('heading', { name: 'No drinks on the menu yet.' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('searchbox')).toBeNull();
  expect(screen.queryByRole('group', { name: 'Filter drinks' })).toBeNull();
});

test('a drink without a photo still shows its tile', async () => {
  renderMenu(jsonResponse(200, { items: [makeDrink({ name: 'Plain' })] }));
  await screen.findByText('1 drink');
  expect(screen.queryByRole('img', { name: /./ })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Plain' })).toBeInTheDocument();
});
