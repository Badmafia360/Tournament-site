import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { Alert, Spinner } from '../components/ui.jsx';

const DEMOS = [
  { label: 'Player', email: 'player@freefire.gg', password: 'player123' },
  { label: 'Organizer', email: 'organizer@freefire.gg', password: 'organizer123' },
  { label: 'Admin', email: 'admin@freefire.gg', password: 'admin123' },
];

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!loading && user) {
    return <Navigate to={location.state?.from || '/dashboard'} replace />;
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function signIn(email, password) {
    setBusy(true);
    setError('');
    try {
      const account = await login(email, password);
      const fallback = ['organizer', 'admin'].includes(account.role) ? '/admin' : '/dashboard';
      navigate(location.state?.from || fallback, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    signIn(form.email, form.password);
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Pick up where you left off — your teams, registrations, and lobbies are waiting."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            className="field"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            className="field"
            placeholder="••••••••"
          />
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <button type="submit" disabled={busy} className="btn btn-primary w-full py-3">
          {busy ? <Spinner className="h-4 w-4" /> : 'Sign in'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/8" />
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">Demo accounts</span>
        <span className="h-px flex-1 bg-white/8" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {DEMOS.map((demo) => (
          <button
            key={demo.label}
            type="button"
            disabled={busy}
            onClick={() => signIn(demo.email, demo.password)}
            className="btn btn-ghost btn-sm"
          >
            {demo.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
        Demo logins are pre-seeded with teams, brackets, and live results. Passwords are shown in the README.
      </p>

      <p className="mt-6 text-sm text-zinc-500">
        New to the arena?{' '}
        <Link to="/register" className="font-semibold text-ember-400 hover:text-ember-300">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
