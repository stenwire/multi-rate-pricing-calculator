import { ReactNode, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/documents', label: 'Documents' },
  { to: '/report', label: 'Report' },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-ink text-white' : 'text-muted hover:bg-ledger hover:text-ink'
  }`;

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b border-rule bg-surface/90 backdrop-blur">
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
            <nav className="ml-4 hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={navClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="hidden text-sm text-muted md:inline">
                  {user?.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-quiet"
                >
                  Sign out
                </button>
                <button
                  type="button"
                  aria-expanded={menuOpen}
                  aria-label="Toggle navigation"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="btn btn-quiet px-2.5 sm:hidden"
                >
                  <span aria-hidden>{menuOpen ? '✕' : '☰'}</span>
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClass}>
                  Sign in
                </NavLink>
                <NavLink to="/register" className="btn btn-primary">
                  Create account
                </NavLink>
              </>
            )}
          </div>
        </div>

        {isAuthenticated && menuOpen && (
          <nav className="border-t border-rule px-4 pb-3 sm:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `mt-2 block rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-ink text-white' : 'text-ink hover:bg-ledger'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
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
