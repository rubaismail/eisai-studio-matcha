// The browser tab title for each page (issue #27, WCAG 2.4.2 "Page Titled").
// Screen readers announce it first, so each page needs its own.
const SITE = 'Eisai Studio';

const TITLES: Record<string, string> = {
  '/menu': 'Menu',
  '/our-story': 'Our story',
  '/products': 'Products',
  '/privacy': 'Privacy policy',
  '/login': 'Log in',
  '/register': 'Create account',
  '/check-email': 'Check your email',
  '/verify-email': 'Verify email',
  '/forgot-password': 'Forgot password',
  '/reset-password': 'Reset password',
  '/account': 'My account',
  '/admin': 'Menu editor',
  '/admin/new': 'Add a drink',
};

export function pageTitle(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === '/') return SITE;
  const page = /^\/admin\/[^/]+\/edit$/.test(path)
    ? 'Edit drink'
    : (TITLES[path] ?? 'Page not found');
  return `${page} | ${SITE}`;
}
