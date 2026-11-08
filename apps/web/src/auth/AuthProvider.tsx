import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
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

interface SignOutState {
  signOut?: boolean;
}

// Must be inside the router: logging out is a navigation.
export default function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(() => readSession());
  // A leftover token means the session expired.
  const [sessionExpired, setSessionExpired] = useState(
    () => session === null && getToken() !== null,
  );
  const sessionRef = useRef(session);
  sessionRef.current = session;

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

  // Sign out after reaching home, so the unsaved-changes prompt can cancel it.
  const logOut = useCallback(() => {
    const state: SignOutState = { signOut: true };
    navigate('/', { state });
  }, [navigate]);

  useEffect(() => {
    if (!(location.state as SignOutState | null)?.signOut) return;
    signOut();
    // Clear the flag so a reload doesn't sign out again.
    const { pathname, search, hash } = location;
    navigate({ pathname, search, hash }, { replace: true, state: null });
  }, [location, navigate, signOut]);

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

  // Sync with other tabs. If our token already ran out, treat it as expired.
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== null && e.key !== TOKEN_KEY && e.key !== USER_KEY) return;
      const next = readSession();
      const previous = sessionRef.current;
      const expiresAt = previous ? tokenExpiresAt(previous.token) : null;
      setSession(next);
      setSessionExpired(
        next === null && expiresAt !== null && expiresAt <= Date.now(),
      );
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      sessionExpired,
      signIn,
      signOut,
      logOut,
    }),
    [session, sessionExpired, signIn, signOut, logOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
