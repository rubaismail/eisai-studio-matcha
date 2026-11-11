// Every page of the website is listed here. Add a <Route> when you add a page.
import { Component, lazy, Suspense, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
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
import AccountLayout from './components/AccountLayout';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import Spinner from './components/Spinner';
import { primaryButton } from './components/styles';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import NotFoundPage from './pages/NotFoundPage';
import OurStoryPage from './pages/OurStoryPage';
import PrivacyPage from './pages/PrivacyPage';
import ProductsPage from './pages/ProductsPage';

// Admin and account pages load only when opened, so visitors to the public
// pages don't download them. MenuItemForm splits off with AdminPage.
const AccountPage = lazy(() => import('./pages/AccountPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const CheckEmailPage = lazy(() => import('./pages/CheckEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));

// Shown while a lazy page downloads. The minimum height keeps the footer from
// showing near the top and then jumping down once the page arrives.
function PageLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner label="Loading page…" />
    </div>
  );
}

// Catches a lazy page that fails to download, for example an old file removed
// by a deploy, so the navbar and footer stay and the visitor can reload. A
// plain reload fetches the new index.html. Going to another page clears the
// error. It isn't keyed by the path, because that would remount pages that
// share an element across paths, like the menu editor and its edit panel.
class PageErrorBoundary extends Component<
  { pathname: string; children: ReactNode },
  { failed: boolean; pathname: string }
> {
  state = { failed: false, pathname: this.props.pathname };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: { pathname: string },
    state: { failed: boolean; pathname: string },
  ) {
    return props.pathname === state.pathname
      ? null
      : { failed: false, pathname: props.pathname };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert">
        <AccountLayout
          eyebrow="Eisai Studio"
          title="This page couldn’t load"
          intro="The site may have just been updated. Reload to get the latest version."
        >
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={`self-start ${primaryButton}`}
          >
            Reload
          </button>
        </AccountLayout>
      </div>
    );
  }
}

const isAdminPath = (path: string) =>
  path === '/admin' || path.startsWith('/admin/');

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
  }, [location.key, location.pathname, location.hash, navigationType]);
}

export default function App() {
  useScrollOnNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  // No footer for staff on admin pages (Staff only keeps it).
  const isAdmin = useMatch('/admin/*') !== null && user?.role === 'admin';

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <PageErrorBoundary pathname={pathname}>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/our-story" element={<OurStoryPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="*" element={<NotFoundPage />} />
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
          </Suspense>
        </PageErrorBoundary>
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}
