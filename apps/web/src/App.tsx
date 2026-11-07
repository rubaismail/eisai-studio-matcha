// Every page of the website is listed here. Add a <Route> when you add a page.
import { Route, Routes, useMatch } from 'react-router';
import Navbar from './components/Navbar';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  // The admin pages are full width. Every other page keeps the narrow column.
  const adminMatches = [
    useMatch('/admin'),
    useMatch('/admin/new'),
    useMatch('/admin/:id/edit'),
  ];
  const isAdmin = adminMatches.some((match) => match !== null);

  return (
    <>
      <Navbar />
      <main className={isAdmin ? undefined : 'mx-auto max-w-4xl p-6'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          {/* TODO: wrap /admin with the shared admin guard once it exists. */}
          <Route path="/admin" element={<AdminPage />} />
          {/* TODO: wrap the add/edit routes with the shared admin guard once it exists.
              They show the dashboard with the add/edit form open. */}
          <Route path="/admin/new" element={<AdminPage />} />
          <Route path="/admin/:id/edit" element={<AdminPage />} />
          {/* Coming soon: /login, /register, /verify-email, /reset-password */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
