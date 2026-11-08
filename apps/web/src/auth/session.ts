// 'token' is the key the API client and admin pages already use.
import type { AuthUser } from '../types/auth';

export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';

export interface Session {
  token: string;
  user: AuthUser;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Reads exp from the JWT. Not a security check; the API verifies tokens.
export function tokenExpiresAt(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function isAuthUser(value: unknown): value is AuthUser {
  const user = value as Partial<AuthUser> | null;
  return (
    typeof user?._id === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'customer' || user.role === 'admin')
  );
}

export function readSession(now = Date.now()): Session | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user: unknown = JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
    if (!token || !isAuthUser(user)) return null;
    const expiresAt = tokenExpiresAt(token);
    if (expiresAt === null || expiresAt <= now) return null;
    return { token, user };
  } catch {
    return null;
  }
}

export function saveSession({ token, user }: Session) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Storage blocked.
  }
}
