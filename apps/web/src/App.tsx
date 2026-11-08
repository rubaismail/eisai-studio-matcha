// Every page of the website is listed here. Add a <Route> when you add a page.
import type { ReactNode } from 'react';
import { Route, Routes, useMatch } from 'react-router';
import { useAuth } from './auth/AuthContext';
import { RequireAdmin, RequireAuth } from './auth/guards';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import AccountPage from './pages/AccountPage';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MenuPage from './pages/MenuPage';
import NotFoundPage from './pages/NotFoundPage';

// Old narrow layout for Home and Menu until #24.
function Narrow({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-4xl p-6">{children}</div>;
}

export default function App() {
  // Admin pages are full width with no footer.
  const adminMatches = [
    useMatch('/admin'),
    useMatch('/admin/new'),
    useMatch('/admin/:id/edit'),
  ];
  const isAdminRoute = adminMatches.some((match) => match !== null);
  const { user } = useAuth();
  // Customers on admin URLs see Staff only, which has a footer.
  const isAdmin = isAdminRoute && user?.role === 'admin';

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <Narrow>
                <HomePage />
              </Narrow>
            }
          />
          <Route
            path="/menu"
            element={
              <Narrow>
                <MenuPage />
              </Narrow>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/new"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/:id/edit"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
          {/* TODO: /register, /verify-email, /forgot-password, /reset-password */}
          <Route
            path="*"
            element={
              <Narrow>
                <NotFoundPage />
              </Narrow>
            }
          />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}
