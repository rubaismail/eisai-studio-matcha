import { createContext, useContext } from 'react';
import type { AuthUser } from '../types/auth';
import type { Session } from './session';

export interface AuthContextValue {
  user: AuthUser | null;
  // True if the last session expired, for the login page message.
  sessionExpired: boolean;
  signIn: (session: Session) => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// Usage: const { user, signOut } = useAuth();
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
