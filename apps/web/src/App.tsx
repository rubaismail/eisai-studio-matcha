// Every page of the website is listed here. Add a <Route> when you add a page.
import { Route, Routes } from 'react-router';
import Navbar from './components/Navbar';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl p-6">
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
