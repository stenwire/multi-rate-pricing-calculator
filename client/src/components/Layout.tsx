import { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1.5 text-sm ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'
  }`;

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <Link
            to={isAuthenticated ? '/documents' : '/login'}
            className="font-semibold"
          >
            Pricing Calculator
          </Link>

          {isAuthenticated && (
            <>
              <NavLink to="/documents" className={linkClass}>
                Documents
              </NavLink>
              <NavLink to="/report" className={linkClass}>
                Report
              </NavLink>
            </>
          )}

          <div className="ml-auto flex items-center gap-3 text-sm">
            {isAuthenticated ? (
              <>
                <span className="text-slate-500">{user?.email}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass}>
                  Log in
                </NavLink>
                <NavLink to="/register" className={linkClass}>
                  Register
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
