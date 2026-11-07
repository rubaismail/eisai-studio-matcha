import { afterEach, expect, test, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminPage from './AdminPage';
import type { MenuItem } from '../types/menu';

const baseItem = {
  price: 6,
  category: 'matcha',
  imageAlt: '',
  inspiredBy: '',
  teaBases: [],
  isSeasonal: false,
  isRecommended: false,
  isFeatured: false,
};
const mango: MenuItem = {
  ...baseItem,
  _id: 'm1',
  name: 'Mango Dango',
  description: 'Mango puree',
  imageUrl: '/mango.png',
  isAvailable: true,
  isFeatured: true,
};
const breeze: MenuItem = {
  ...baseItem,
  _id: 'b2',
  name: 'Okinawa Breeze',
  description: 'Coconut water',
  imageUrl: '',
  isAvailable: false,
  // Featured but hidden, so it must not count as "on home".
  isFeatured: true,
};

const success = (data: unknown) => ({
  ok: true,
  status: 200,
  json: async () => data,
});
const failure = { ok: false, status: 500, json: async () => ({}) };

// Stubs fetch so the first call (loading the list) returns these items.
// Later calls are queued by each test with mockResolvedValueOnce.
function renderPage(items: MenuItem[] = [mango, breeze]) {
  const fetchMock = vi.fn().mockResolvedValueOnce(success({ items }));
  vi.stubGlobal('fetch', fetchMock);
  render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  );
  return fetchMock;
}

const findMango = () => screen.findByRole('heading', { name: 'Mango Dango' });
const mangoCheckbox = () =>
  screen.getByRole('checkbox', { name: 'On menu: Mango Dango' });
const mangoDelete = () =>
  screen.getByRole('button', { name: 'Delete Mango Dango' });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('loads all items from the admin endpoint with the saved token', async () => {
  localStorage.setItem('token', 'test-token');
  const fetchMock = renderPage();
  expect(screen.getByText('Loading drinks…')).toBeInTheDocument();
  await findMango();

  const [url, init] = fetchMock.mock.calls[0]!;
  expect(url).toBe('/api/menu/admin/menu');
  expect(init.headers.Authorization).toBe('Bearer test-token');
  expect(
    screen.getByText('2 drinks · 1 on the menu · 1 on home'),
  ).toBeInTheDocument();
  expect(screen.getAllByText('Hidden')).toHaveLength(1);
  const hiddenRow = screen
    .getByRole('heading', { name: 'Okinawa Breeze' })
    .closest('li')!;
  expect(within(hiddenRow).getByText('Hidden')).toBeInTheDocument();
  expect(document.querySelector('img')).toHaveAttribute('alt', '');
});

test('links to the add and edit forms and labels each checkbox', async () => {
  renderPage();
  await findMango();
  expect(screen.getByRole('link', { name: '+ Add a drink' })).toHaveAttribute(
    'href',
    '/admin/new',
  );
  expect(
    screen.getByRole('link', { name: 'Edit Mango Dango' }),
  ).toHaveAttribute('href', '/admin/m1/edit');
  expect(mangoCheckbox()).toBeChecked();
  expect(
    screen.getByRole('checkbox', { name: 'On menu: Okinawa Breeze' }),
  ).not.toBeChecked();
  expect(
    screen.getByRole('checkbox', { name: 'Recommended: Mango Dango' }),
  ).not.toBeChecked();
  expect(
    screen.getByRole('checkbox', { name: 'On home: Mango Dango' }),
  ).toBeChecked();
  expect(
    screen.getByRole('checkbox', { name: 'Recommended: Okinawa Breeze' }),
  ).not.toBeChecked();
  expect(
    screen.getByRole('checkbox', { name: 'On home: Okinawa Breeze' }),
  ).toBeChecked();
});

test('counts a drink as on home only when it is also on the menu', async () => {
  const fetchMock = renderPage();
  await findMango();
  // Okinawa Breeze is featured but hidden, so only Mango Dango counts.
  expect(
    screen.getByText('2 drinks · 1 on the menu · 1 on home'),
  ).toBeInTheDocument();

  fetchMock.mockResolvedValueOnce(
    success({ item: { ...breeze, isAvailable: true } }),
  );
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'On menu: Okinawa Breeze' }),
  );
  expect(
    await screen.findByText('2 drinks · 2 on the menu · 2 on home'),
  ).toBeInTheDocument();
});

const flagCases = [
  { label: 'Recommended', flag: 'isRecommended', onHomeAfter: 1 },
  { label: 'On home', flag: 'isFeatured', onHomeAfter: 0 },
] as const;

test.each(flagCases)(
  '$label: disables the row while saving and updates from the server reply',
  async ({ label, flag, onHomeAfter }) => {
    const fetchMock = renderPage();
    await findMango();
    const checkbox = screen.getByRole('checkbox', {
      name: `${label}: Mango Dango`,
    });
    const before = mango[flag];
    checkbox.focus();
    let reply!: (response: unknown) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        reply = resolve;
      }),
    );
    fireEvent.click(checkbox);

    await waitFor(() => expect(checkbox).toBeDisabled());
    expect(mangoCheckbox()).toBeDisabled();
    expect(checkbox).toHaveProperty('checked', before);
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe('/api/menu/m1');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify({ [flag]: !before }));

    reply(success({ item: { ...mango, [flag]: !before } }));
    await waitFor(() => expect(checkbox).toBeEnabled());
    expect(checkbox).toHaveProperty('checked', !before);
    expect(checkbox).toHaveFocus();
    expect(mangoCheckbox()).toBeEnabled();
    expect(
      screen.getByText(`2 drinks · 1 on the menu · ${onHomeAfter} on home`),
    ).toBeInTheDocument();
  },
);

test.each(flagCases)(
  '$label: leaves the row unchanged and shows an error when saving fails',
  async ({ label, flag }) => {
    const fetchMock = renderPage();
    await findMango();
    const checkbox = screen.getByRole('checkbox', {
      name: `${label}: Mango Dango`,
    });
    fetchMock.mockResolvedValueOnce(failure);
    fireEvent.click(checkbox);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't update Mango Dango");
    expect(alert.closest('li')).toHaveTextContent('Mango Dango');
    expect(checkbox).toHaveProperty('checked', mango[flag]);
    expect(checkbox).toBeEnabled();
    expect(
      screen.getByText('2 drinks · 1 on the menu · 1 on home'),
    ).toBeInTheDocument();
  },
);

// Regression: a space inside the sr-only span was dropped, giving "EditMango Dango".
test('keeps a space between the action and the drink name', async () => {
  renderPage();
  await findMango();
  const row = screen
    .getByRole('heading', { name: 'Mango Dango' })
    .closest('li')!;
  expect(within(row).getByRole('link', { name: /^Edit/ })).toHaveAccessibleName(
    'Edit Mango Dango',
  );
  expect(
    within(row).getByRole('button', { name: /^Delete/ }),
  ).toHaveAccessibleName('Delete Mango Dango');
});

test('shows the empty state', async () => {
  renderPage([]);
  expect(await screen.findByText('No drinks yet')).toBeInTheDocument();
});

test('shows an error when the list fails to load', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failure));
  render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load");
});

test('disables the checkbox while saving and updates from the server reply', async () => {
  const fetchMock = renderPage();
  await findMango();
  const checkbox = mangoCheckbox();
  checkbox.focus();
  let reply!: (response: unknown) => void;
  fetchMock.mockReturnValueOnce(
    new Promise((resolve) => {
      reply = resolve;
    }),
  );
  fireEvent.click(checkbox);

  await waitFor(() => expect(checkbox).toBeDisabled());
  expect(checkbox).toBeChecked();
  expect(screen.getAllByText('Hidden')).toHaveLength(1);
  const [url, init] = fetchMock.mock.calls[1]!;
  expect(url).toBe('/api/menu/m1');
  expect(init.method).toBe('PUT');
  expect(init.body).toBe(JSON.stringify({ isAvailable: false }));
  expect(init.headers['Content-Type']).toBe('application/json');

  reply(
    success({ item: { ...mango, isAvailable: false, name: 'Server Name' } }),
  );
  expect(
    await screen.findByRole('heading', { name: 'Server Name' }),
  ).toBeInTheDocument();
  expect(checkbox).not.toBeChecked();
  expect(checkbox).toBeEnabled();
  expect(checkbox).toHaveFocus();
  // Hiding a featured drink also takes it out of the "on home" count.
  expect(
    screen.getByText('2 drinks · 0 on the menu · 0 on home'),
  ).toBeInTheDocument();
});

test('leaves the row unchanged and shows an error when saving fails', async () => {
  const fetchMock = renderPage();
  await findMango();
  fetchMock.mockResolvedValueOnce(failure);
  fireEvent.click(mangoCheckbox());

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent("Couldn't update Mango Dango");
  expect(alert.closest('li')).toHaveTextContent('Mango Dango');
  expect(mangoCheckbox()).toBeChecked();
  expect(mangoCheckbox()).toBeEnabled();
});

test('dialog is labelled, takes focus, and Escape closes it and returns focus', async () => {
  const fetchMock = renderPage();
  await findMango();
  const deleteButton = mangoDelete();
  deleteButton.focus();
  fireEvent.click(deleteButton);

  const dialog = screen.getByRole('dialog', { name: 'Delete Mango Dango?' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toHaveAccessibleDescription(/can’t be undone.*“On menu”/);
  expect(dialog).toContainElement(document.activeElement as HTMLElement);

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(deleteButton).toHaveFocus();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('dialog keeps Tab inside it in both directions', async () => {
  renderPage();
  await findMango();
  fireEvent.click(mangoDelete());
  const first = screen.getByRole('button', { name: 'Delete for good' });
  const last = screen.getByRole('button', { name: 'Cancel' });

  expect(last).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(first).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(last).toHaveFocus();
});

test('removes the row only after the delete succeeds', async () => {
  const fetchMock = renderPage();
  await findMango();
  fireEvent.click(mangoDelete());
  let reply!: (response: unknown) => void;
  fetchMock.mockReturnValueOnce(
    new Promise((resolve) => {
      reply = resolve;
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete for good' }));

  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled(),
  );
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(mangoCheckbox()).toBeInTheDocument();
  const [url, init] = fetchMock.mock.calls[1]!;
  expect(url).toBe('/api/menu/m1');
  expect(init.method).toBe('DELETE');

  reply(success({ message: 'deleted' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(
    screen.queryByRole('checkbox', { name: 'On menu: Mango Dango' }),
  ).toBeNull();
  expect(screen.getByRole('heading', { level: 1, name: 'Menu' })).toHaveFocus();
  expect(screen.getByRole('status')).toHaveTextContent('Mango Dango deleted.');
  expect(
    screen.getByText('1 drink · 0 on the menu · 0 on home'),
  ).toBeInTheDocument();
});

test('keeps the row and dialog open and shows an error when delete fails', async () => {
  const fetchMock = renderPage();
  await findMango();
  fireEvent.click(mangoDelete());
  fetchMock.mockResolvedValueOnce(failure);
  fireEvent.click(screen.getByRole('button', { name: 'Delete for good' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    "Couldn't delete Mango Dango",
  );
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus(),
  );
  expect(mangoCheckbox()).toBeInTheDocument();
});

test('Hide instead hides the drink and is not offered for hidden drinks', async () => {
  const fetchMock = renderPage();
  await findMango();
  fireEvent.click(
    screen.getByRole('button', { name: 'Delete Okinawa Breeze' }),
  );
  expect(screen.queryByRole('button', { name: 'Hide instead' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  const deleteButton = mangoDelete();
  fireEvent.click(deleteButton);
  fetchMock.mockResolvedValueOnce(
    success({ item: { ...mango, isAvailable: false } }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Hide instead' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(fetchMock.mock.calls[1]![1].body).toBe(
    JSON.stringify({ isAvailable: false }),
  );
  expect(mangoCheckbox()).not.toBeChecked();
  expect(deleteButton).toHaveFocus();
});
