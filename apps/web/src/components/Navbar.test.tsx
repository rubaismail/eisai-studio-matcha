import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { TOKEN_KEY } from '../auth/session';
import { admin, customer, renderWithAuth, signInAs } from '../test-utils';
import Navbar from './Navbar';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// [0] is the desktop nav.
const desktopNav = () => screen.getAllByRole('navigation', { name: 'Main' })[0];

test('signed-out visitors see an Account link to log in', () => {
  renderWithAuth(<Navbar />);
  const nav = within(desktopNav());
  expect(nav.getByRole('link', { name: 'Account' })).toHaveAttribute(
    'href',
    '/login',
  );
  expect(nav.queryByRole('button', { name: 'Log out' })).toBeNull();
});

test('customers see My account and Log out, but not the menu editor', () => {
  signInAs(customer);
  renderWithAuth(<Navbar />);
  const nav = within(desktopNav());
  expect(nav.getByRole('link', { name: 'My account' })).toHaveAttribute(
    'href',
    '/account',
  );
  expect(nav.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  expect(nav.queryByRole('link', { name: 'Menu editor' })).toBeNull();
});

test('staff also see the menu editor', () => {
  signInAs(admin);
  renderWithAuth(<Navbar />);
  expect(
    within(desktopNav()).getByRole('link', { name: 'Menu editor' }),
  ).toHaveAttribute('href', '/admin');
});

test('Log out signs out and shows the Account link again', () => {
  signInAs(customer);
  renderWithAuth(<Navbar />);
  fireEvent.click(
    within(desktopNav()).getByRole('button', { name: 'Log out' }),
  );
  expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  expect(
    within(desktopNav()).getByRole('link', { name: 'Account' }),
  ).toBeInTheDocument();
});

test('the phone menu opens, traps focus on its close button, and closes with Escape', () => {
  renderWithAuth(<Navbar />);
  const openButton = screen.getByRole('button', { name: 'Open menu' });
  expect(openButton).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(openButton);
  const dialog = screen.getByRole('dialog', { name: 'Site menu' });
  expect(openButton).toHaveAttribute('aria-expanded', 'true');
  expect(
    within(dialog).getByRole('button', { name: 'Close menu' }),
  ).toHaveFocus();
  expect(within(dialog).getByRole('link', { name: /Menu/ })).toHaveAttribute(
    'href',
    '/menu',
  );

  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(openButton).toHaveFocus();
});

test('site links go to their pages, and Find us to the home schedule', () => {
  for (const path of ['/', '/menu', '/login']) {
    renderWithAuth(<Navbar />, [path]);
    const nav = within(desktopNav());
    expect(nav.getByRole('link', { name: 'Our story' })).toHaveAttribute(
      'href',
      '/our-story',
    );
    expect(nav.getByRole('link', { name: 'Products' })).toHaveAttribute(
      'href',
      '/products',
    );
    expect(nav.getByRole('link', { name: 'Find us' })).toHaveAttribute(
      'href',
      '/#find-us',
    );
    cleanup();
  }
});

test('the phone menu lists every site link', () => {
  renderWithAuth(<Navbar />);
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Site menu' }));
  for (const name of ['Menu', 'Our story', 'Products', 'Find us'])
    expect(dialog.getByRole('link', { name: new RegExp(`^${name}`) }));
});

test('only the current page is marked current, not home-page sections', () => {
  renderWithAuth(<Navbar />, ['/']);
  const nav = within(desktopNav());
  expect(nav.getByRole('link', { name: 'Find us' })).not.toHaveAttribute(
    'aria-current',
  );
});

test('Products is marked current on the products page', () => {
  renderWithAuth(<Navbar />, ['/products']);
  expect(
    within(desktopNav()).getByRole('link', { name: 'Products' }),
  ).toHaveAttribute('aria-current', 'page');
});

test('the Menu link is marked current on the menu page', () => {
  renderWithAuth(<Navbar />, ['/menu']);
  expect(
    within(desktopNav()).getByRole('link', { name: 'Menu' }),
  ).toHaveAttribute('aria-current', 'page');
});

test('Instagram links say they open a new tab', () => {
  renderWithAuth(<Navbar />);
  const link = within(desktopNav()).getByRole('link', {
    name: /^Instagram\s*\(opens in a new tab\)$/,
  });
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});

test('the phone menu closes when a link to the current page is tapped', () => {
  renderWithAuth(<Navbar />, ['/menu']);
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
  const dialog = screen.getByRole('dialog', { name: 'Site menu' });
  fireEvent.click(within(dialog).getByRole('link', { name: /^Menu/ }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.body.style.overflow).toBe('');
});
