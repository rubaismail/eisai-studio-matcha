import { afterEach, expect, test, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  createMemoryRouter,
  Route,
  RouterProvider,
  Routes,
  useLocation,
} from 'react-router';
import AdminPage from '../pages/AdminPage';
import type { MenuItem } from '../types/menu';

const mango: MenuItem = {
  _id: 'm1',
  name: 'Mango Dango',
  description: 'Mango puree / Whole milk',
  price: 6.5,
  category: 'Drinks',
  imageUrl: '/mango.png',
  imageAlt: 'Iced matcha over mango puree',
  inspiredBy: 'Mango sticky rice',
  teaBases: ['matcha'],
  isSeasonal: false,
  isAvailable: true,
  isRecommended: true,
  isFeatured: false,
};

const LIST_URL = '/api/menu/admin/menu';
const success = (data: unknown, status = 200) => ({
  ok: true,
  status,
  json: async () => data,
});
const failure = (status = 500) => ({
  ok: false,
  status,
  json: async () => ({}),
});

function CurrentPath() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}

// The router from the latest renderAt, for tests that use the browser's Back button.
let router: ReturnType<typeof createMemoryRouter>;

// Renders the dashboard routes at `path` (or a history of paths, ending at the
// current one). A data router is used, as in main.tsx, so the leave guard works.
// The first request is always the dashboard list; `replies` answer the requests
// after it, in order.
function renderAt(
  path: string | string[],
  items: MenuItem[],
  ...replies: unknown[]
) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(success({ items }))
    .mockResolvedValueOnce(success({ items }));
  for (const reply of replies) fetchMock.mockResolvedValueOnce(reply);
  vi.stubGlobal('fetch', fetchMock);
  router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <>
            <Routes>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/new" element={<AdminPage />} />
              <Route path="/admin/:id/edit" element={<AdminPage />} />
            </Routes>
            <CurrentPath />
          </>
        ),
      },
    ],
    { initialEntries: Array.isArray(path) ? path : [path] },
  );
  render(<RouterProvider router={router} />);
  return fetchMock;
}

// Requests other than loading the dashboard list.
const formRequests = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.filter(([url]) => url !== LIST_URL);
const listLoads = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.filter(([url]) => url === LIST_URL).length;

const panel = () =>
  screen.getByRole('region', { name: /^(add a drink|edit drink)$/i });
const inPanel = () => within(panel());
const field = (name: RegExp) => inPanel().getByLabelText(name);
const type = (name: RegExp, value: string) =>
  fireEvent.change(field(name), { target: { value } });
const choosePhoto = (file: File) =>
  fireEvent.change(field(/^photo/i), { target: { files: [file] } });
const pngFile = () => new File(['png'], 'drink.png', { type: 'image/png' });
const preview = () => panel().querySelector('img');
const submit = () =>
  fireEvent.click(inPanel().getByRole('button', { name: 'Add to menu' }));
const saveChanges = () =>
  fireEvent.click(inPanel().getByRole('button', { name: 'Save changes' }));
const bodyOf = (call: unknown[]) =>
  JSON.parse((call[1] as { body: string }).body) as Record<string, unknown>;

// The panel is closed, the URL is back to /admin and the list was reloaded.
async function expectBackOnList(fetchMock: ReturnType<typeof vi.fn>) {
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/admin$/),
  );
  expect(
    screen.queryByRole('region', { name: /^(add a drink|edit drink)$/i }),
  ).toBeNull();
  await waitFor(() => expect(listLoads(fetchMock)).toBe(2));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// --- Side panel ---

test('opens the form as a panel beside the list, which is hidden on narrow screens', async () => {
  renderAt('/admin/m1/edit', [mango]);
  const heading = await inPanel().findByRole('heading', {
    name: 'Editing Mango Dango',
  });
  await waitFor(() => expect(heading).toHaveFocus());

  // Both are on the page; CSS shows them side by side from xl up and hides the
  // list below that so the form takes the whole page.
  const list = screen
    .getByRole('heading', { level: 1, name: 'Menu' })
    .closest('section')!;
  expect(list).toHaveClass('hidden', 'xl:block');
  expect(panel()).toHaveClass('xl:w-[440px]');
  expect(
    screen.getByRole('heading', { name: 'Mango Dango' }),
  ).toBeInTheDocument();
});

test('the list shows normally when no form is open', async () => {
  renderAt('/admin', [mango]);
  const list = (
    await screen.findByRole('heading', { level: 1, name: 'Menu' })
  ).closest('section')!;
  expect(list).not.toHaveClass('hidden');
  expect(
    screen.queryByRole('region', { name: /^(add a drink|edit drink)$/i }),
  ).toBeNull();
});

test('+ Add a drink opens the add panel and Cancel closes it, refreshes the list and returns focus', async () => {
  const fetchMock = renderAt('/admin', [mango]);
  fireEvent.click(await screen.findByRole('link', { name: '+ Add a drink' }));

  expect(screen.getByTestId('path')).toHaveTextContent('/admin/new');
  expect(
    inPanel().getByRole('heading', { name: 'Add a drink' }),
  ).toBeInTheDocument();
  fireEvent.click(inPanel().getByRole('button', { name: 'Cancel' }));

  await expectBackOnList(fetchMock);
  expect(screen.getByRole('heading', { level: 1, name: 'Menu' })).toHaveFocus();
});

test('shows a message when the drink to edit doesn’t exist', async () => {
  renderAt('/admin/nope/edit', [mango]);
  expect(await inPanel().findByRole('alert')).toHaveTextContent(
    'We couldn’t find that drink.',
  );
});

// --- Validation ---

test('shows required-field errors linked to their fields, with a focused summary', async () => {
  const fetchMock = renderAt('/admin/new', []);
  await waitFor(() => expect(listLoads(fetchMock)).toBe(1));
  submit();

  const summary = inPanel().getByRole('alert');
  expect(summary).toHaveTextContent(
    'Fix the 2 highlighted fields, then add the drink again.',
  );
  await waitFor(() => expect(summary).toHaveFocus());
  expect(field(/drink name/i)).toHaveAttribute('aria-invalid', 'true');
  expect(field(/drink name/i)).toHaveAccessibleDescription(
    'Give the drink a name so customers can order it.',
  );
  expect(field(/^price/i)).toHaveAccessibleDescription(
    /Enter a price, like 6.50./,
  );
  expect(formRequests(fetchMock)).toHaveLength(0);
});

test.each(['-2', 'abc', '6.5.0'])('rejects an invalid price (%s)', (price) => {
  const fetchMock = renderAt('/admin/new', []);
  type(/drink name/i, 'Kyoto Fog');
  type(/^price/i, price);
  submit();

  expect(inPanel().getByRole('alert')).toHaveTextContent(
    'Fix the 1 highlighted field',
  );
  expect(field(/^price/i)).toHaveAccessibleDescription(
    /Enter a price of 0 or more/,
  );
  expect(formRequests(fetchMock)).toHaveLength(0);
});

// --- Photo upload ---

test('requires a photo description once there is a photo', async () => {
  const fetchMock = renderAt(
    '/admin/new',
    [],
    success({ imageUrl: 'https://cdn.example/drink.png' }, 201),
  );
  type(/drink name/i, 'Kyoto Fog');
  type(/^price/i, '6');
  choosePhoto(pngFile());
  await waitFor(() =>
    expect(preview()).toHaveAttribute('src', 'https://cdn.example/drink.png'),
  );
  const [url, init] = formRequests(fetchMock)[0]!;
  expect(url).toBe('/api/uploads');
  expect(init.body).toBeInstanceOf(FormData);
  expect((init.body as FormData).get('image')).toBeInstanceOf(File);
  expect(init.headers['Content-Type']).toBeUndefined();

  submit();
  expect(inPanel().getByRole('alert')).toHaveTextContent(
    'Fix the 1 highlighted field',
  );
  expect(field(/describe the photo/i)).toHaveAccessibleDescription(
    /Describe the photo for customers who can’t see it./,
  );
  expect(formRequests(fetchMock)).toHaveLength(1);
});

test('rejects the wrong file type in the browser without uploading', () => {
  const fetchMock = renderAt('/admin/new', []);
  choosePhoto(new File(['x'], 'menu-photo.heic', { type: 'image/heic' }));
  expect(inPanel().getByRole('alert')).toHaveTextContent(
    'Choose a JPG, PNG or WebP photo.',
  );
  expect(field(/^photo/i)).toHaveAttribute('aria-invalid', 'true');
  expect(formRequests(fetchMock)).toHaveLength(0);
});

test('rejects a photo over 5 MB in the browser without uploading', () => {
  const fetchMock = renderAt('/admin/new', []);
  const big = pngFile();
  Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
  choosePhoto(big);
  expect(inPanel().getByRole('alert')).toHaveTextContent('larger than 5 MB');
  expect(formRequests(fetchMock)).toHaveLength(0);
});

test('disables Save while uploading and keeps the input when the upload fails', async () => {
  const fetchMock = renderAt('/admin/new', []);
  await waitFor(() => expect(listLoads(fetchMock)).toBe(1));
  let reply!: (response: unknown) => void;
  fetchMock.mockReturnValueOnce(
    new Promise((resolve) => {
      reply = resolve;
    }),
  );
  type(/drink name/i, 'Kyoto Fog');
  choosePhoto(pngFile());

  expect(inPanel().getByRole('status')).toHaveTextContent('Uploading photo…');
  expect(inPanel().getByRole('button', { name: 'Add to menu' })).toBeDisabled();
  reply(failure(500));

  expect(await inPanel().findByRole('alert')).toHaveTextContent(
    'Couldn’t upload that photo.',
  );
  expect(field(/drink name/i)).toHaveValue('Kyoto Fog');
  expect(preview()).toBeNull();
  expect(inPanel().getByRole('button', { name: 'Add to menu' })).toBeEnabled();
});

// --- Photo descriptions (API handoff, PR #70) ---

test('uses the drink name as the preview alt when the photo has no description', async () => {
  renderAt('/admin/m1/edit', [{ ...mango, imageAlt: '' }]);
  await inPanel().findByRole('heading', { name: 'Editing Mango Dango' });
  expect(preview()).toHaveAttribute('alt', 'Mango Dango');

  type(/describe the photo/i, 'Iced matcha with mango');
  expect(preview()).toHaveAttribute('alt', 'Iced matcha with mango');
});

test('uses the typed name as the alt for a new photo until it is described', async () => {
  renderAt('/admin/new', [], success({ imageUrl: '/new.png' }, 201));
  type(/drink name/i, 'Kyoto Fog');
  choosePhoto(pngFile());
  await waitFor(() => expect(preview()).toHaveAttribute('src', '/new.png'));
  expect(preview()).toHaveAttribute('alt', 'Kyoto Fog');
  expect(inPanel().queryByLabelText(/still matches/i)).toBeNull();
});

test('replacing a photo requires confirming the old description, then sends both together', async () => {
  const fetchMock = renderAt(
    '/admin/m1/edit',
    [mango],
    success({ imageUrl: '/new-mango.png' }, 201),
    success({ item: mango }),
  );
  await inPanel().findByRole('heading', { name: 'Editing Mango Dango' });
  expect(preview()).toHaveAttribute('src', '/mango.png');

  choosePhoto(pngFile());
  await waitFor(() =>
    expect(preview()).toHaveAttribute('src', '/new-mango.png'),
  );
  saveChanges();

  expect(inPanel().getByRole('alert')).toHaveTextContent(
    'Fix the 1 highlighted field, then save again.',
  );
  expect(field(/describe the photo/i)).toHaveAccessibleDescription(
    /You replaced the photo. Update the description, or confirm it still matches/,
  );
  expect(formRequests(fetchMock)).toHaveLength(1);

  fireEvent.click(field(/this description still matches the new photo/i));
  saveChanges();

  await expectBackOnList(fetchMock);
  const [url, init] = formRequests(fetchMock)[1]!;
  expect(url).toBe('/api/menu/m1');
  expect(init.method).toBe('PUT');
  expect(bodyOf(formRequests(fetchMock)[1]!)).toEqual({
    imageUrl: '/new-mango.png',
    imageAlt: 'Iced matcha over mango puree',
  });
});

test('replacing a photo and updating the description needs no extra confirmation', async () => {
  const fetchMock = renderAt(
    '/admin/m1/edit',
    [mango],
    success({ imageUrl: '/new-mango.png' }, 201),
    success({ item: mango }),
  );
  await inPanel().findByRole('heading', { name: 'Editing Mango Dango' });
  choosePhoto(pngFile());
  await waitFor(() =>
    expect(preview()).toHaveAttribute('src', '/new-mango.png'),
  );
  expect(field(/this description still matches/i)).not.toBeChecked();

  type(/describe the photo/i, 'Mango matcha in a tall glass');
  expect(
    inPanel().queryByLabelText(/this description still matches/i),
  ).toBeNull();
  saveChanges();

  await expectBackOnList(fetchMock);
  expect(bodyOf(formRequests(fetchMock)[1]!)).toEqual({
    imageUrl: '/new-mango.png',
    imageAlt: 'Mango matcha in a tall glass',
  });
});

// --- Saving ---

test('creates a drink with the defaults, closes the panel and refreshes the list', async () => {
  const fetchMock = renderAt('/admin/new', [], success({ item: mango }, 201));
  expect(field(/on the menu/i)).toBeChecked();
  expect(field(/recommended badge/i)).not.toBeChecked();
  expect(field(/feature on home/i)).not.toBeChecked();
  expect(field(/seasonal/i)).not.toBeChecked();

  type(/drink name/i, '  Kyoto Fog ');
  type(/^price/i, '6.50');
  type(/what’s in it/i, 'Whole milk / Earl grey foam');
  fireEvent.change(field(/^base/i), { target: { value: 'both' } });
  submit();

  await expectBackOnList(fetchMock);
  const [url, init] = formRequests(fetchMock)[0]!;
  expect(url).toBe('/api/menu');
  expect(init.method).toBe('POST');
  expect(bodyOf(formRequests(fetchMock)[0]!)).toEqual({
    name: 'Kyoto Fog',
    inspiredBy: '',
    category: 'Drinks',
    teaBases: ['matcha', 'hojicha'],
    price: 6.5,
    description: 'Whole milk / Earl grey foam',
    imageUrl: '',
    imageAlt: '',
    isAvailable: true,
    isRecommended: false,
    isFeatured: false,
    isSeasonal: false,
  });
});

test('disables Save while saving so it can’t be submitted twice', async () => {
  const fetchMock = renderAt('/admin/new', []);
  await waitFor(() => expect(listLoads(fetchMock)).toBe(1));
  let reply!: (response: unknown) => void;
  fetchMock.mockReturnValueOnce(
    new Promise((resolve) => {
      reply = resolve;
    }),
  );
  type(/drink name/i, 'Kyoto Fog');
  type(/^price/i, '6');
  const save = inPanel().getByRole('button', { name: 'Add to menu' });
  fireEvent.click(save);
  fireEvent.click(save);
  fireEvent.submit(save.closest('form')!);

  await waitFor(() =>
    expect(inPanel().getByRole('button', { name: 'Saving…' })).toBeDisabled(),
  );
  expect(formRequests(fetchMock)).toHaveLength(1);
  reply(success({ item: mango }, 201));
  await expectBackOnList(fetchMock);
  expect(formRequests(fetchMock)).toHaveLength(1);
});

test('keeps everything typed and shows an error when saving fails', async () => {
  renderAt('/admin/new', [], failure(500));
  type(/drink name/i, 'Kyoto Fog');
  type(/^price/i, '6');
  type(/what’s in it/i, 'Whole milk');
  submit();

  const alert = await inPanel().findByRole('alert');
  expect(alert).toHaveTextContent('Couldn’t save the drink.');
  await waitFor(() => expect(alert).toHaveFocus());
  expect(field(/drink name/i)).toHaveValue('Kyoto Fog');
  expect(field(/^price/i)).toHaveValue('6');
  expect(field(/what’s in it/i)).toHaveValue('Whole milk');
  expect(inPanel().getByRole('button', { name: 'Add to menu' })).toBeEnabled();
  expect(screen.getByTestId('path')).toHaveTextContent('/admin/new');
});

test('edit pre-fills the drink, sends only changed fields, and closes the panel', async () => {
  const fetchMock = renderAt(
    '/admin/m1/edit',
    [mango],
    success({ item: { ...mango, name: 'Mango Tango' } }),
  );
  await inPanel().findByRole('heading', { name: 'Editing Mango Dango' });
  expect(field(/drink name/i)).toHaveValue('Mango Dango');
  expect(field(/^price/i)).toHaveValue('6.5');
  expect(field(/^base/i)).toHaveValue('matcha');
  expect(field(/recommended badge/i)).toBeChecked();
  expect(preview()).toHaveAttribute('alt', 'Iced matcha over mango puree');

  type(/drink name/i, 'Mango Tango');
  type(/^price/i, '6.50');
  fireEvent.click(field(/seasonal/i));
  saveChanges();

  await expectBackOnList(fetchMock);
  const [url, init] = formRequests(fetchMock)[0]!;
  expect(url).toBe('/api/menu/m1');
  expect(init.method).toBe('PUT');
  expect(bodyOf(formRequests(fetchMock)[0]!)).toEqual({
    name: 'Mango Tango',
    isSeasonal: true,
  });
});

// --- Cancel ---

test('Cancel without changes closes the panel without asking', async () => {
  const fetchMock = renderAt('/admin/new', []);
  const confirmSpy = vi.spyOn(window, 'confirm');
  fireEvent.click(inPanel().getByRole('button', { name: 'Cancel' }));

  await expectBackOnList(fetchMock);
  expect(confirmSpy).not.toHaveBeenCalled();
  expect(formRequests(fetchMock)).toHaveLength(0);
});

test('Cancel with unsaved changes asks first and only leaves when confirmed', async () => {
  const fetchMock = renderAt('/admin/new', []);
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
  type(/drink name/i, 'Kyoto Fog');

  fireEvent.click(inPanel().getByRole('button', { name: 'Cancel' }));
  expect(confirmSpy).toHaveBeenCalledTimes(1);
  expect(field(/drink name/i)).toHaveValue('Kyoto Fog');
  expect(screen.getByTestId('path')).toHaveTextContent('/admin/new');

  confirmSpy.mockReturnValueOnce(true);
  fireEvent.click(inPanel().getByRole('link', { name: '← Back to the list' }));
  await expectBackOnList(fetchMock);
  expect(formRequests(fetchMock)).toHaveLength(0);
});

// --- Preview tile ---

const tile = () => within(inPanel().getByRole('region', { name: 'Preview' }));

test('the preview tile updates live as the drink is filled in', () => {
  renderAt('/admin/new', []);
  expect(tile().getByText('No photo yet')).toBeInTheDocument();
  expect(tile().getByText('Drink name')).toBeInTheDocument();
  expect(tile().queryByText('Recommended')).toBeNull();

  type(/drink name/i, 'Kyoto Fog');
  type(/what’s in it/i, 'Whole milk / Earl grey foam');
  expect(tile().getByText('Kyoto Fog')).toBeInTheDocument();
  expect(tile().getByText('Whole milk / Earl grey foam')).toBeInTheDocument();
  expect(tile().queryByText('Drink name')).toBeNull();

  fireEvent.click(field(/recommended badge/i));
  expect(tile().getByText('Recommended')).toBeInTheDocument();
  fireEvent.click(field(/recommended badge/i));
  expect(tile().queryByText('Recommended')).toBeNull();
});

test('the preview photo uses the description as alt, or the drink name when empty', async () => {
  renderAt('/admin/m1/edit', [{ ...mango, imageAlt: '' }]);
  await inPanel().findByRole('heading', { name: 'Editing Mango Dango' });
  expect(tile().getByRole('img')).toHaveAttribute('src', '/mango.png');
  expect(tile().getByRole('img')).toHaveAccessibleName('Mango Dango');
  expect(tile().queryByText('No photo yet')).toBeNull();

  type(/describe the photo/i, 'Iced matcha with mango');
  expect(tile().getByRole('img')).toHaveAccessibleName(
    'Iced matcha with mango',
  );
});

test('the preview is display-only and adds nothing to the tab order', async () => {
  renderAt('/admin/m1/edit', [mango]);
  await inPanel().findByRole('heading', { name: 'Editing Mango Dango' });
  const region = inPanel().getByRole('region', { name: 'Preview' });
  expect(
    region.querySelectorAll('a, button, input, select, textarea, [tabindex]'),
  ).toHaveLength(0);
  expect(tile().getByText('Recommended')).toBeInTheDocument();
});

// --- Shared per-drink pending state with the list ---

test('the edit form and the drink’s list row never save at the same time', async () => {
  const fetchMock = renderAt('/admin/m1/edit', [mango]);
  await inPanel().findByRole('heading', { name: 'Editing Mango Dango' });
  const rowCheckbox = screen.getByRole('checkbox', {
    name: 'Recommended: Mango Dango',
  });

  // A list checkbox save is pending, so the form can't save this drink yet.
  let replyToToggle!: (response: unknown) => void;
  fetchMock.mockReturnValueOnce(
    new Promise((resolve) => {
      replyToToggle = resolve;
    }),
  );
  fireEvent.click(rowCheckbox);
  await waitFor(() =>
    expect(
      inPanel().getByRole('button', { name: 'Save changes' }),
    ).toBeDisabled(),
  );
  replyToToggle(success({ item: { ...mango, isRecommended: false } }));
  await waitFor(() =>
    expect(
      inPanel().getByRole('button', { name: 'Save changes' }),
    ).toBeEnabled(),
  );

  // While the form saves, the drink's row is locked.
  let replyToSave!: (response: unknown) => void;
  fetchMock.mockReturnValueOnce(
    new Promise((resolve) => {
      replyToSave = resolve;
    }),
  );
  type(/drink name/i, 'Mango Tango');
  saveChanges();
  await waitFor(() => expect(rowCheckbox).toBeDisabled());
  expect(
    screen.getByRole('button', { name: 'Delete Mango Dango' }),
  ).toBeDisabled();

  replyToSave(success({ item: { ...mango, name: 'Mango Tango' } }));
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/admin$/),
  );
  expect(bodyOf(formRequests(fetchMock)[1]!)).toEqual({ name: 'Mango Tango' });
});

// --- Leave guard (PR #80 review) ---

const kyoto: MenuItem = {
  ...mango,
  _id: 'k2',
  name: 'Kyoto Fog',
  imageUrl: '',
  imageAlt: '',
};

test('switching to another form with unsaved changes asks first; declining keeps everything', async () => {
  renderAt('/admin/m1/edit', [mango]);
  await inPanel().findByRole('heading', { name: 'Editing Mango Dango' });
  type(/drink name/i, 'Mango Tango');
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

  fireEvent.click(screen.getByRole('link', { name: '+ Add a drink' }));
  await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId('path')).toHaveTextContent(/^\/admin\/m1\/edit$/);
  expect(field(/drink name/i)).toHaveValue('Mango Tango');

  confirmSpy.mockReturnValueOnce(true);
  fireEvent.click(screen.getByRole('link', { name: '+ Add a drink' }));
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/admin\/new$/),
  );
  expect(
    inPanel().getByRole('heading', { name: 'Add a drink' }),
  ).toBeInTheDocument();
  expect(confirmSpy).toHaveBeenCalledTimes(2);
});

test('opening another drink’s Edit with unsaved changes asks first', async () => {
  renderAt('/admin/m1/edit', [mango, kyoto]);
  await inPanel().findByRole('heading', { name: 'Editing Mango Dango' });
  type(/what’s in it/i, 'Mango / Oat milk');
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

  fireEvent.click(screen.getByRole('link', { name: 'Edit Kyoto Fog' }));
  await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId('path')).toHaveTextContent(/^\/admin\/m1\/edit$/);
  expect(field(/what’s in it/i)).toHaveValue('Mango / Oat milk');

  confirmSpy.mockReturnValueOnce(true);
  fireEvent.click(screen.getByRole('link', { name: 'Edit Kyoto Fog' }));
  expect(
    await inPanel().findByRole('heading', { name: 'Editing Kyoto Fog' }),
  ).toBeInTheDocument();
});

test('the browser Back button is guarded too', async () => {
  renderAt(['/admin', '/admin/new'], []);
  type(/drink name/i, 'Kyoto Fog');
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

  await act(() => router.navigate(-1));
  await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId('path')).toHaveTextContent(/^\/admin\/new$/);
  expect(field(/drink name/i)).toHaveValue('Kyoto Fog');

  confirmSpy.mockReturnValueOnce(true);
  await act(() => router.navigate(-1));
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/admin$/),
  );
});

test('leaving a form without changes doesn’t ask', async () => {
  renderAt('/admin/m1/edit', [mango, kyoto]);
  await inPanel().findByRole('heading', { name: 'Editing Mango Dango' });
  const confirmSpy = vi.spyOn(window, 'confirm');
  fireEvent.click(screen.getByRole('link', { name: 'Edit Kyoto Fog' }));
  expect(
    await inPanel().findByRole('heading', { name: 'Editing Kyoto Fog' }),
  ).toBeInTheDocument();
  expect(confirmSpy).not.toHaveBeenCalled();
});

// --- A save that finishes after its form was left (PR #80 review) ---

test('a delayed save can’t close or change a newer form, but still updates the list', async () => {
  const fetchMock = renderAt('/admin/m1/edit', [mango, kyoto]);
  await inPanel().findByRole('heading', { name: 'Editing Mango Dango' });
  await waitFor(() => expect(listLoads(fetchMock)).toBe(1));
  let replyToSave!: (response: unknown) => void;
  fetchMock.mockReturnValueOnce(
    new Promise((resolve) => {
      replyToSave = resolve;
    }),
  );
  type(/drink name/i, 'Mango Tango');
  saveChanges();
  await waitFor(() =>
    expect(inPanel().getByRole('button', { name: 'Saving…' })).toBeDisabled(),
  );

  // Leave while it's saving, then start editing another drink.
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  fireEvent.click(screen.getByRole('link', { name: 'Edit Kyoto Fog' }));
  await inPanel().findByRole('heading', { name: 'Editing Kyoto Fog' });
  type(/drink name/i, 'Kyoto Haze');

  // The first save finishes now.
  replyToSave(success({ item: { ...mango, name: 'Mango Tango' } }));
  expect(
    await screen.findByRole('heading', { name: 'Mango Tango' }),
  ).toBeInTheDocument();

  // The newer form is untouched and nothing navigated.
  expect(screen.getByTestId('path')).toHaveTextContent(/^\/admin\/k2\/edit$/);
  expect(
    inPanel().getByRole('heading', { name: 'Editing Kyoto Fog' }),
  ).toBeInTheDocument();
  expect(field(/drink name/i)).toHaveValue('Kyoto Haze');
  expect(inPanel().queryByRole('alert')).toBeNull();
  expect(bodyOf(formRequests(fetchMock)[0]!)).toEqual({ name: 'Mango Tango' });
});

// --- Category ---

test('create sends the category typed in', async () => {
  const fetchMock = renderAt('/admin/new', [], success({ item: mango }, 201));
  expect(field(/^category/i)).toHaveValue('Drinks');
  type(/drink name/i, 'Hojicha Latte');
  type(/^price/i, '5');
  type(/^category/i, ' Seasonal specials ');
  submit();

  await expectBackOnList(fetchMock);
  expect(bodyOf(formRequests(fetchMock)[0]!)).toMatchObject({
    name: 'Hojicha Latte',
    category: 'Seasonal specials',
  });
});

test('editing only the category sends only the category', async () => {
  const fetchMock = renderAt(
    '/admin/m1/edit',
    [mango],
    success({ item: mango }),
  );
  await inPanel().findByRole('heading', { name: 'Editing Mango Dango' });
  expect(field(/^category/i)).toHaveValue('Drinks');
  type(/^category/i, 'Lattes');
  saveChanges();

  await expectBackOnList(fetchMock);
  expect(bodyOf(formRequests(fetchMock)[0]!)).toEqual({ category: 'Lattes' });
});

test('editing another field doesn’t send the category', async () => {
  const fetchMock = renderAt(
    '/admin/m1/edit',
    [mango],
    success({ item: mango }),
  );
  await inPanel().findByRole('heading', { name: 'Editing Mango Dango' });
  type(/inspired by/i, 'Mango lassi');
  saveChanges();

  await expectBackOnList(fetchMock);
  const body = bodyOf(formRequests(fetchMock)[0]!);
  expect(body).toEqual({ inspiredBy: 'Mango lassi' });
  expect(body).not.toHaveProperty('category');
});

test('an empty category shows an error linked to the field', () => {
  const fetchMock = renderAt('/admin/new', []);
  type(/drink name/i, 'Hojicha Latte');
  type(/^price/i, '5');
  type(/^category/i, '  ');
  submit();

  expect(inPanel().getByRole('alert')).toHaveTextContent(
    'Fix the 1 highlighted field',
  );
  expect(field(/^category/i)).toHaveAttribute('aria-invalid', 'true');
  expect(field(/^category/i)).toHaveAccessibleDescription(
    'Enter a category, like Drinks.',
  );
  expect(formRequests(fetchMock)).toHaveLength(0);
});
