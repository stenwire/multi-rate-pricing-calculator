import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
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
      await register(email, password);
      navigate('/documents', { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(caught, 'Unable to create the account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm py-4 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create account
        </h1>
        <p className="mt-1 text-sm text-muted">
          Your documents are visible only to you.
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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field"
          />
          <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary w-full"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-sm text-muted">
          Already registered?{' '}
          <Link
            to="/login"
            className="font-medium text-accrual hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
