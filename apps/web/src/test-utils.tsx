import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import AuthProvider from './auth/AuthProvider';
import { saveSession } from './auth/session';
import type { AuthUser } from './types/auth';
import type { MenuItem } from './types/menu';

export const customer: AuthUser = {
  _id: 'u1',
  email: 'jane@example.com',
  role: 'customer',
};
export const admin: AuthUser = {
  _id: 'u2',
  email: 'staff@example.com',
  role: 'admin',
};

// Fake JWT that expires in N seconds. Only the website reads it.
export function makeToken(secondsFromNow = 3600): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  const exp = Math.floor(Date.now() / 1000) + secondsFromNow;
  return `${encode({ alg: 'HS256' })}.${encode({ sub: 'u1', exp })}.signature`;
}

export function signInAs(user: AuthUser, secondsFromNow = 3600) {
  const token = makeToken(secondsFromNow);
  saveSession({ token, user });
  return token;
}

export function renderWithAuth(
  ui: ReactNode,
  initialEntries: Parameters<typeof MemoryRouter>[0]['initialEntries'] = ['/'],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

export const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

export function makeDrink(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    _id: overrides.name ?? 'drink',
    name: 'Drink',
    description: '',
    price: 6,
    category: 'Drinks',
    imageUrl: '',
    imageAlt: '',
    inspiredBy: '',
    teaBases: ['matcha'],
    isSeasonal: false,
    isAvailable: true,
    isRecommended: false,
    isFeatured: false,
    ...overrides,
  };
}
