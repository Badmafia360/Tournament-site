import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { Alert, Spinner } from '../components/ui.jsx';

export default function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirm: '',
    ffUid: '',
    role: 'player',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!loading && user) {
    return <Navigate to={['organizer', 'admin'].includes(user.role) ? '/admin' : '/dashboard'} replace />;
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const account = await register({
        displayName: form.displayName,
        email: form.email,
        password: form.password,
        ffUid: form.ffUid,
        role: form.role,
      });
      navigate(account.role === 'organizer' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Join the arena"
      title="Create account"
      subtitle="One account for your player profile, teams, and tournament registrations."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            ['player', 'I am a player'],
            ['organizer', 'I run events'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => update('role', value)}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                form.role === value
                  ? 'border-ember-500/50 bg-ember-500/10'
                  : 'border-white/10 bg-white/3 hover:border-white/20'
              }`}
            >
              <span className={`block text-[10px] font-bold uppercase tracking-[0.16em] ${form.role === value ? 'text-ember-300' : 'text-zinc-400'}`}>
                {label}
              </span>
              <span className="mt-1 block text-[10px] leading-snug text-zinc-600">
                {value === 'player' ? 'Register and compete' : 'Create and manage events'}
              </span>
            </button>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            required
            minLength={3}
            value={form.displayName}
            onChange={(event) => update('displayName', event.target.value)}
            className="field"
            placeholder="GhostByte"
          />
        </div>

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
          <label className="label" htmlFor="ffUid">Free Fire UID <span className="text-zinc-600">(optional)</span></label>
          <input
            id="ffUid"
            inputMode="numeric"
            value={form.ffUid}
            onChange={(event) => update('ffUid', event.target.value.replace(/\D/g, ''))}
            className="field"
            placeholder="712345678"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              className="field"
              placeholder="Min. 6 characters"
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirm</label>
            <input
              id="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={form.confirm}
              onChange={(event) => update('confirm', event.target.value)}
              className="field"
              placeholder="Repeat password"
            />
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <button type="submit" disabled={busy} className="btn btn-primary w-full py-3">
          {busy ? <Spinner className="h-4 w-4" /> : 'Create account'}
        </button>

        <p className="text-[10px] leading-relaxed text-zinc-600">
          By creating an account you agree to compete fairly and follow each event's
          rules. Organizer accounts are reviewed before events go public.
        </p>
      </form>

      <p className="mt-6 text-sm text-zinc-500">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-ember-400 hover:text-ember-300">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
