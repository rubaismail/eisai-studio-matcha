// Every page of the website is listed here. Add a <Route> when you add a page.
import { useEffect, useRef } from 'react';
import {
  Outlet,
  Route,
  Routes,
  useLocation,
  useMatch,
  useNavigationType,
} from 'react-router';
import { useAuth } from './auth/AuthContext';
import { RequireAdmin, RequireAuth } from './auth/guards';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import AccountPage from './pages/AccountPage';
import AdminPage from './pages/AdminPage';
import CheckEmailPage from './pages/CheckEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MenuPage from './pages/MenuPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

const isAdminPath = (path: string) =>
  path === '/admin' || path.startsWith('/admin/');

// Old narrow layout for Home and Menu until #24.
function Narrow() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <Outlet />
    </div>
  );
}

// Scroll to the top on new pages, or to a #section.
// Skips Back/Forward and moves between admin pages.
function useScrollOnNavigate() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    const from = previousPath.current;
    previousPath.current = location.pathname;
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      document.getElementById(id)?.scrollIntoView?.();
      return;
    }
    if (navigationType === 'POP' || from === location.pathname) return;
    if (isAdminPath(from) && isAdminPath(location.pathname)) return;
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash, navigationType]);
}

export default function App() {
  useScrollOnNavigate();
  const { user } = useAuth();
  // No footer for staff on admin pages (Staff only keeps it).
  const isAdmin = useMatch('/admin/*') !== null && user?.role === 'admin';

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar hasFooter={!isAdmin} />
      <main className="flex-1">
        <Routes>
          <Route element={<Narrow />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route
            element={
              <RequireAdmin>
                <Outlet />
              </RequireAdmin>
            }
          >
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/new" element={<AdminPage />} />
            <Route path="/admin/:id/edit" element={<AdminPage />} />
          </Route>
        </Routes>
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}
