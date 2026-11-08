// Every page of the website is listed here. Add a <Route> when you add a page.
import { Route, Routes, useMatch } from 'react-router';
import Navbar from './components/Navbar';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  // The admin dashboard is full width. Every other page keeps the narrow column.
  const isAdmin = useMatch('/admin') !== null;

  return (
    <>
      <Navbar />
      <main className={isAdmin ? undefined : 'mx-auto max-w-4xl p-6'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          {/* TODO: wrap /admin with the shared admin guard once it exists. */}
          <Route path="/admin" element={<AdminPage />} />
          {/* Coming soon: /login, /register, /verify-email, /reset-password */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
