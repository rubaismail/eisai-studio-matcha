import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Footer from './Footer';

afterEach(cleanup);

test('Follow along shows the Instagram icon with the handle', () => {
  render(<Footer />);
  const link = screen.getByRole('link', {
    name: /^@eisaistudio\s*on Instagram \(opens in a new tab\)$/,
  });
  expect(link).toHaveAttribute(
    'href',
    'https://www.instagram.com/eisaistudio/',
  );
  expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});
