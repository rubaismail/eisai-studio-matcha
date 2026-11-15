import { afterEach, expect, test, vi } from 'vitest';
import { jsonResponse } from '../test-utils';
import { getMenu } from './menu';

afterEach(() => vi.unstubAllGlobals());

function stubFetch() {
  const fetchMock = vi.fn(async () => jsonResponse(200, { items: [] }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const calledUrl = (fetchMock: ReturnType<typeof stubFetch>) =>
  String((fetchMock.mock.calls[0] as unknown[])[0]);

test('getMenu without a search asks for the whole menu', async () => {
  const fetchMock = stubFetch();
  await getMenu();
  expect(calledUrl(fetchMock)).toBe('/api/menu');
});

test('getMenu with a blank search asks for the whole menu', async () => {
  const fetchMock = stubFetch();
  await getMenu('   ');
  expect(calledUrl(fetchMock)).toBe('/api/menu');
});

test('getMenu sends the search trimmed and URL-encoded', async () => {
  const fetchMock = stubFetch();
  await getMenu('  oat & rose #1 ');
  expect(calledUrl(fetchMock)).toBe('/api/menu?search=oat%20%26%20rose%20%231');
});
