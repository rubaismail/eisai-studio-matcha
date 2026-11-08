// Usage: <RequireAdmin><AdminPage /></RequireAdmin>
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import StaffOnlyPage from '../pages/StaffOnlyPage';
import { useAuth } from './AuthContext';

export interface LoginRedirectState {
  from?: string;
  expired?: boolean;
}

function useLoginRedirect() {
  const { sessionExpired } = useAuth();
  const location = useLocation();
  const state: LoginRedirectState = {
    from: location.pathname + location.search,
    expired: sessionExpired,
  };
  return <Navigate to="/login" replace state={state} />;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const redirect = useLoginRedirect();
  return user ? children : redirect;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const redirect = useLoginRedirect();
  if (!user) return redirect;
  if (user.role !== 'admin') return <StaffOnlyPage />;
  return children;
}
