import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import MenuPage from './MenuPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('shows menu items from the API', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ _id: '1', name: 'Test Matcha', description: '', price: 6 }],
      }),
    }),
  );
  render(<MenuPage />);
  expect(await screen.findByText('Test Matcha')).toBeInTheDocument();
  expect(screen.getByText('$6.00')).toBeInTheDocument();
});

test('shows an error when the API is down', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  render(<MenuPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    "Couldn't load the menu",
  );
});
