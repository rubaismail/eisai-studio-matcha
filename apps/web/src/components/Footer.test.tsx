import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Footer from './Footer';

afterEach(cleanup);

function renderFooter() {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

test('Follow along shows the Instagram icon with the handle', () => {
  renderFooter();
  const link = screen.getByRole('link', {
    name: /^@eisaistudio\s*on Instagram \(opens in a new tab\)$/,
  });
  expect(link).toHaveAttribute(
    'href',
    'https://www.instagram.com/eisaistudio/',
  );
  expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});

test('links to the privacy policy', () => {
  renderFooter();
  expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
    'href',
    '/privacy',
  );
});
