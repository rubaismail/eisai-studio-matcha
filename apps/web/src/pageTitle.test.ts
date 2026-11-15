import { expect, test } from 'vitest';
import { pageTitle } from './pageTitle';

test('names every page and falls back to "Page not found"', () => {
  expect(pageTitle('/')).toBe('Eisai Studio');
  expect(pageTitle('/menu')).toBe('Menu | Eisai Studio');
  expect(pageTitle('/menu/')).toBe('Menu | Eisai Studio');
  expect(pageTitle('/login')).toBe('Log in | Eisai Studio');
  expect(pageTitle('/account')).toBe('My account | Eisai Studio');
  expect(pageTitle('/admin')).toBe('Menu editor | Eisai Studio');
  expect(pageTitle('/admin/new')).toBe('Add a drink | Eisai Studio');
  expect(pageTitle('/admin/6afa25d2caadcdf371b0dbb8/edit')).toBe('Edit drink | Eisai Studio');
  expect(pageTitle('/nope')).toBe('Page not found | Eisai Studio');
});
