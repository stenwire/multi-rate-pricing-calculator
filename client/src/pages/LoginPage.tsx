import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/documents" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/documents', { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(caught, 'Unable to sign in.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm py-4 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted">
          Pick up where your drafts left off.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="panel space-y-4 p-5 sm:p-6">
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-flag/20 bg-flag-soft px-3 py-2 text-sm text-flag"
          >
            {error}
          </p>
        )}

        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary w-full"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-sm text-muted">
          No account?{' '}
          <Link
            to="/register"
            className="font-medium text-accrual hover:underline"
          >
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
