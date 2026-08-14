import { ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { API_DOCS_URL } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/documents', label: 'Documents' },
  { to: '/report', label: 'Report' },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-ink text-white' : 'text-muted hover:bg-ledger hover:text-ink'
  }`;

const inactiveNavClass = navClass({ isActive: false });

const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2.5 text-sm font-medium ${
    isActive ? 'bg-ink text-white' : 'text-ink hover:bg-ledger'
  }`;

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // The mobile sheet is not remounted on navigation, so it would otherwise stay
  // open over the page the user just moved to.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b border-rule bg-surface/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            to={isAuthenticated ? '/documents' : '/login'}
            className="flex items-center gap-2.5"
          >
            <span
              aria-hidden
              className="figure grid h-8 w-8 place-items-center rounded-md bg-ink text-[0.8rem] font-semibold text-white"
            >
              ¢
            </span>
            <span className="text-sm leading-tight font-semibold">
              Pricing
              <span className="block text-[0.6875rem] font-medium tracking-wide text-muted uppercase">
                Calculator
              </span>
            </span>
          </Link>

          {isAuthenticated && (
            <nav className="ml-2 hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={navClass}>
                  {item.label}
                </NavLink>
              ))}
              <a
                href={API_DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className={inactiveNavClass}
              >
                API docs
              </a>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="hidden max-w-[16ch] truncate text-sm text-muted lg:inline">
                  {user?.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-quiet hidden md:inline-flex"
                >
                  Sign out
                </button>
                <button
                  type="button"
                  aria-expanded={menuOpen}
                  aria-controls="mobile-nav"
                  aria-label="Toggle navigation"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="btn btn-quiet px-2.5 md:hidden"
                >
                  <span aria-hidden>{menuOpen ? '✕' : '☰'}</span>
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClass}>
                  Sign in
                </NavLink>
                <NavLink
                  to="/register"
                  className="btn btn-primary whitespace-nowrap"
                >
                  <span className="hidden xs:inline">Create account</span>
                  <span className="xs:hidden">Sign up</span>
                </NavLink>
              </>
            )}
          </div>
        </div>

        {isAuthenticated && menuOpen && (
          <nav
            id="mobile-nav"
            className="space-y-1 border-t border-rule px-4 pt-2 pb-3 md:hidden"
          >
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={mobileNavClass}>
                {item.label}
              </NavLink>
            ))}
            <a
              href={API_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenuOpen(false)}
              className={mobileNavClass({ isActive: false })}
            >
              API docs
            </a>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-rule pt-3">
              <span className="min-w-0 truncate text-sm text-muted">
                {user?.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-quiet shrink-0"
              >
                Sign out
              </button>
            </div>
          </nav>
        )}
      </header>

      <main
        key={location.pathname}
        className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10"
      >
        {children}
      </main>
    </div>
  );
}
