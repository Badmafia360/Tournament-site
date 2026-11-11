import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { Avatar } from './ui.jsx';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" onClick={() => window.scrollTo(0, 0)}>
      <span className="angular flex h-9 w-9 items-center justify-center bg-gradient-to-br from-ember-400 to-ember-600 font-display text-lg font-extrabold italic text-black shadow-[0_0_24px_-6px_rgba(255,106,0,0.7)]">
        FF
      </span>
      <span className="font-display text-xl font-extrabold uppercase leading-none tracking-wider text-white">
        Free Fire <span className="text-ember-500">Arena</span>
      </span>
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const primaryLinks = [{ to: '/tournaments', label: 'Tournaments' }];
  if (user) primaryLinks.push({ to: '/dashboard', label: 'Dashboard' });
  if (user && ['organizer', 'admin'].includes(user.role)) {
    primaryLinks.push({ to: '/admin', label: user.role === 'admin' ? 'Admin' : 'Organizer' });
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {primaryLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${
                  isActive
                    ? 'bg-ember-500/10 text-ember-300'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-2.5 rounded-full border border-white/8 bg-white/3 py-1 pl-1 pr-3 transition hover:border-ember-500/40 hover:bg-white/6"
                aria-label="My profile"
              >
                <Avatar name={user.displayName} color={user.avatarColor} photo={user.avatarPhoto} size="sm" />
                <div className="min-w-0">
                  <p className="max-w-[140px] truncate text-xs font-semibold text-white">
                    {user.displayName}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-ember-500">
                    {user.role}
                  </p>
                </div>
              </Link>
              <button type="button" onClick={handleLogout} className="btn btn-ghost btn-sm">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Join the arena
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          <span className="space-y-1.5">
            <span className={`block h-0.5 w-5 bg-current transition ${open ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-5 bg-current transition ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-5 bg-current transition ${open ? '-translate-y-2 -rotate-45' : ''}`} />
          </span>
        </button>
      </div>

      {open && (
        <div className="border-t border-white/6 bg-ink-950 px-4 pb-5 pt-3 md:hidden">
          <div className="space-y-1">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2.5 text-sm font-bold uppercase tracking-wider ${
                    isActive ? 'bg-ember-500/10 text-ember-300' : 'text-zinc-300 hover:bg-white/5'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="mt-4 border-t border-white/6 pt-4">
            {user ? (
              <div className="space-y-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 rounded-md p-1 transition hover:bg-white/5"
                  aria-label="My profile"
                >
                  <Avatar name={user.displayName} color={user.avatarColor} photo={user.avatarPhoto} />
                  <div>
                    <p className="text-sm font-semibold text-white">{user.displayName}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ember-500">
                      {user.role}
                    </p>
                  </div>
                </Link>
                <button type="button" onClick={handleLogout} className="btn btn-ghost w-full">
                  Sign out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" className="btn btn-ghost">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
