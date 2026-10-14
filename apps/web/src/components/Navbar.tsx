import { NavLink } from 'react-router';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-semibold text-matcha' : 'hover:text-matcha';

export default function Navbar() {
  return (
    <header className="border-b border-matcha-light">
      <nav className="mx-auto flex max-w-4xl items-center gap-6 p-4">
        <NavLink to="/" className="mr-auto text-xl font-bold">
          Eisai Studio
        </NavLink>
        <NavLink to="/" end className={linkClass}>
          Home
        </NavLink>
        <NavLink to="/menu" className={linkClass}>
          Menu
        </NavLink>
      </nav>
    </header>
  );
}
