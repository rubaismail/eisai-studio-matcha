import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from './App';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
test('shows API menu content and connection status', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            slug: 'sample',
            name: 'Test Matcha',
            description: 'Sample item',
            priceCents: 600,
          },
        ],
      }),
    }),
  );
  render(<App />);
  expect(await screen.findByText('Test Matcha')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(
    'API and database connected',
  );
});
test('gives an actionable error when the API fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  render(<App />);
  expect(await screen.findByText(/Cannot reach the API/)).toBeInTheDocument();
});
test('rejects unexpected API response shapes', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ items: [{}] }) }),
  );
  render(<App />);
  expect(await screen.findByText(/Cannot reach the API/)).toBeInTheDocument();
});
