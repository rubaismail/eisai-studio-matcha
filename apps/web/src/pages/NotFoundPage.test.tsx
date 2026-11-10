import { afterEach, expect, test } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { renderWithAuth } from '../test-utils';
import NotFoundPage from './NotFoundPage';

afterEach(cleanup);

test('offers a way home and to the menu', () => {
  renderWithAuth(<NotFoundPage />);
  expect(
    screen.getByRole('heading', { level: 1, name: 'Page not found.' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute(
    'href',
    '/',
  );
  expect(screen.getByRole('link', { name: 'See the menu' })).toHaveAttribute(
    'href',
    '/menu',
  );
});
