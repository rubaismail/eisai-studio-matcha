import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { setUnauthorizedHandler } from '../api/client';
import { AuthContext } from './AuthContext';
import {
  TOKEN_KEY,
  USER_KEY,
  clearSession,
  getToken,
  readSession,
  saveSession,
  tokenExpiresAt,
} from './session';
import type { Session } from './session';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession());
  // A leftover token means the session expired.
  const [sessionExpired, setSessionExpired] = useState(
    () => session === null && getToken() !== null,
  );

  const expire = useCallback(() => {
    clearSession();
    setSession(null);
    setSessionExpired(true);
  }, []);

  const signIn = useCallback((next: Session) => {
    saveSession(next);
    setSession(next);
    setSessionExpired(false);
  }, []);

  // Transition so it renders together with the page change.
  const signOut = useCallback(() => {
    clearSession();
    startTransition(() => {
      setSession(null);
      setSessionExpired(false);
    });
  }, []);

  useEffect(() => {
    if (session === null && getToken() !== null) clearSession();
  }, [session]);

  useEffect(() => {
    setUnauthorizedHandler(expire);
    return () => setUnauthorizedHandler(null);
  }, [expire]);

  // Tokens last 1 hour.
  useEffect(() => {
    if (!session) return;
    const expiresAt = tokenExpiresAt(session.token);
    if (expiresAt === null) return;
    const timer = setTimeout(expire, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [session, expire]);

  // Sync with other tabs.
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== null && e.key !== TOKEN_KEY && e.key !== USER_KEY) return;
      setSession(readSession());
      setSessionExpired(false);
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo(
    () => ({ user: session?.user ?? null, sessionExpired, signIn, signOut }),
    [session, sessionExpired, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
