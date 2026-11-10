import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import closeIcon from '../assets/close-x.svg';
import logo from '../assets/eisai-logo-purple.png';
import menuIcon from '../assets/menu-icon.svg';
import { focusRing, label } from './styles';

const siteLinks = [
  { to: '/menu', label: 'Menu' },
  { to: '/our-story', label: 'Our story' },
  { to: '/products', label: 'Products' },
  // Always the schedule on the home page.
  { to: '/#find-us', label: 'Find us' },
];
type SiteLink = (typeof siteLinks)[number];

type AccountLink =
  { to: string; label: string } | { action: 'logout'; label: string };

const desktopLink = `${label} text-ink underline-offset-4 hover:underline aria-[current=page]:underline ${focusRing}`;
const phoneRow = `flex w-full items-center justify-between border-b border-rule py-5 text-left text-[28px] tracking-[-0.01em] text-ink ${focusRing}`;

export default function Navbar() {
  const { user, logOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const accountLinks: AccountLink[] = !user
    ? [{ to: '/login', label: 'Account' }]
    : [
        ...(user.role === 'admin'
          ? [{ to: '/admin', label: 'Menu editor' }]
          : []),
        { to: '/account', label: 'My account' },
        { action: 'logout', label: 'Log out' },
      ];

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  // Close if resized to desktop, or the page stays locked.
  useEffect(() => {
    if (!open || !window.matchMedia) return;
    const desktop = window.matchMedia('(min-width: 64rem)');
    const handleChange = () => {
      if (desktop.matches) setOpen(false);
    };
    handleChange();
    desktop.addEventListener('change', handleChange);
    return () => desktop.removeEventListener('change', handleChange);
  }, [open]);

  // Focus the close button and lock page scroll.
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
    openButtonRef.current?.focus();
  }

  function handleLogOut() {
    setOpen(false);
    logOut();
  }

  // Escape closes; Tab stays inside.
  function handlePanelKeyDown(e: ReactKeyboardEvent) {
    if (e.key === 'Escape') {
      closeMenu();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable =
      panelRef.current?.querySelectorAll<HTMLElement>('a, button');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function renderSiteLink(item: SiteLink, className: string, phone = false) {
    const content = phone ? <PhoneRowContent label={item.label} /> : item.label;
    // Section links shouldn't show as the current page.
    if (item.to.includes('#')) {
      return (
        <Link to={item.to} className={className}>
          {content}
        </Link>
      );
    }
    return (
      <NavLink to={item.to} className={className}>
        {content}
      </NavLink>
    );
  }

  function renderAccountLink(
    item: AccountLink,
    className: string,
    phone = false,
  ) {
    const content = phone ? <PhoneRowContent label={item.label} /> : item.label;
    if ('action' in item) {
      return (
        <button type="button" onClick={handleLogOut} className={className}>
          {content}
        </button>
      );
    }
    return (
      <NavLink to={item.to} className={className}>
        {content}
      </NavLink>
    );
  }

  return (
    <header className="border-b border-ink bg-white">
      {/* Desktop */}
      <nav
        aria-label="Main"
        className="hidden grid-cols-[1fr_auto_1fr] items-center gap-8 px-[43px] py-5 lg:grid"
      >
        <ul className="flex gap-8">
          {siteLinks.map((item) => (
            <li key={item.label}>{renderSiteLink(item, desktopLink)}</li>
          ))}
        </ul>
        <Link to="/" className={`block ${focusRing}`}>
          <img
            src={logo}
            alt="Eisai Studio home"
            className="h-[34px] w-[132px] object-contain"
          />
        </Link>
        <ul className="flex justify-end gap-8">
          {accountLinks.map((item) => (
            <li key={item.label}>{renderAccountLink(item, desktopLink)}</li>
          ))}
        </ul>
      </nav>

      {/* Phone */}
      <div className="flex h-16 items-center justify-between px-4 lg:hidden">
        <Link to="/" className={`block ${focusRing}`}>
          <img
            src={logo}
            alt="Eisai Studio home"
            className="h-7 w-[108px] object-contain"
          />
        </Link>
        <button
          ref={openButtonRef}
          type="button"
          aria-expanded={open}
          aria-controls="phone-menu"
          onClick={() => setOpen(true)}
          className={`flex size-11 items-center justify-center ${focusRing}`}
        >
          <img src={menuIcon} alt="" width={24} height={24} />
          <span className="sr-only">Open menu</span>
        </button>
      </div>

      {open && (
        <div
          ref={panelRef}
          id="phone-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          onKeyDown={handlePanelKeyDown}
          // Close on any link, even to the current page.
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) setOpen(false);
          }}
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white lg:hidden"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink px-4">
            <Link to="/" className={`block ${focusRing}`}>
              <img
                src={logo}
                alt="Eisai Studio home"
                className="h-7 w-[108px] object-contain"
              />
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeMenu}
              className={`flex size-11 items-center justify-center ${focusRing}`}
            >
              <img src={closeIcon} alt="" width={24} height={24} />
              <span className="sr-only">Close menu</span>
            </button>
          </div>
          <nav aria-label="Main" className="px-4 py-6">
            <ul>
              {siteLinks.map((item) => (
                <li key={item.label}>{renderSiteLink(item, phoneRow, true)}</li>
              ))}
              {accountLinks.map((item) => (
                <li key={item.label}>
                  {renderAccountLink(item, phoneRow, true)}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}

function PhoneRowContent({ label }: { label: string }) {
  return (
    <>
      <span>{label}</span>
      <span aria-hidden="true" className="text-[22px] text-ink-muted">
        →
      </span>
    </>
  );
}
