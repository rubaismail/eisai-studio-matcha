import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import OurStoryPage from './OurStoryPage';

afterEach(cleanup);

test('has one page title and a heading for each part of the story', () => {
  render(<OurStoryPage />);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(
    screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
  ).toEqual([
    'Two people. A whisk. A lot of opinions about matcha.',
    'A little Zen. A little unexpected. Seriously good matcha.',
    'You became part of the story.',
    'Still whisking.',
  ]);
});
