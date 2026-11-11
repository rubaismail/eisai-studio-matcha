import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PrivacyPage, { LAST_UPDATED } from './PrivacyPage';
import { CONTACT_EMAIL } from '../components/links';

afterEach(cleanup);

function renderPage() {
  render(
    <MemoryRouter>
      <PrivacyPage />
    </MemoryRouter>,
  );
}

test('has one page title, a last-updated date and every policy section', () => {
  renderPage();
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByText(`Last updated ${LAST_UPDATED}`)).toBeInTheDocument();
  expect(
    screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
  ).toEqual([
    'What we collect',
    'How we use it',
    'Cookies and tracking',
    'Who we share it with',
    'How long we keep it',
    'Your choices',
    'Security',
    'Children',
    'Changes to this policy',
    'Contact us',
  ]);
});

test('gives a working contact email for privacy requests', () => {
  renderPage();
  for (const link of screen.getAllByRole('link', { name: CONTACT_EMAIL })) {
    expect(link).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`);
  }
});
