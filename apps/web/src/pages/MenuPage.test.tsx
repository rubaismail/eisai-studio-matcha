import { afterEach, expect, test, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { jsonResponse, makeDrink } from '../test-utils';
import MenuPage from './MenuPage';

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

test('search matches the name, inspiration and ingredients', async () => {
  renderMenu(jsonResponse(200, { items: drinks }));
  await screen.findByText('4 drinks');
  fireEvent.change(search(), { target: { value: '  ROSE ' } });
  expect(tileNames()).toEqual(['Tokyo Rose']);
  expect(screen.getByText('1 drink')).toBeInTheDocument();
  fireEvent.change(search(), { target: { value: 'sticky rice' } });
  expect(tileNames()).toEqual(['Mango Dango']);
  fireEvent.change(search(), { target: { value: 'earl grey' } });
  expect(tileNames()).toEqual(['Kyoto Fog']);
});

test('no matches offers to clear the search', async () => {
  renderMenu(jsonResponse(200, { items: drinks }));
  await screen.findByText('4 drinks');
  fireEvent.change(search(), { target: { value: 'strawberry espresso' } });
  expect(
    screen.getByRole('heading', { name: 'No matches this time.' }),
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
