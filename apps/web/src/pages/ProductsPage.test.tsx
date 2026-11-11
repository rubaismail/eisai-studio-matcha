import { afterEach, expect, test } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { renderWithAuth } from '../test-utils';
import ProductsPage from './ProductsPage';

afterEach(cleanup);

test('says products are coming soon and links to the menu and Instagram', () => {
  renderWithAuth(<ProductsPage />);
  expect(
    screen.getByRole('heading', { level: 1, name: 'Coming soon.' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'See the menu' })).toHaveAttribute(
    'href',
    '/menu',
  );
  const instagram = screen.getByRole('link', {
    name: /^Follow on Instagram\s*\(opens in a new tab\)$/,
  });
  expect(instagram).toHaveAttribute(
    'href',
    'https://www.instagram.com/eisaistudio/',
  );
  expect(instagram).toHaveAttribute('rel', 'noopener noreferrer');
});
