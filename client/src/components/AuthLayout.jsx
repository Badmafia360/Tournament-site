import { Link } from 'react-router-dom';

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-0 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-stretch lg:gap-8 lg:py-12">
      <div className="flex items-center">
        <div className="w-full max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ember-500">{eyebrow}</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-3 text-sm text-zinc-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>

      <div className="relative mt-12 hidden overflow-hidden rounded-2xl border border-white/8 bg-ink-900 lg:mt-0 lg:block">
        <div className="absolute inset-0 grid-glow opacity-40" />
        <div className="absolute -left-10 top-1/3 h-64 w-64 rounded-full bg-ember-500/20 blur-[90px]" />
        <div className="absolute -right-10 bottom-10 h-52 w-52 rounded-full bg-neon-400/10 blur-[80px]" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <div>
            <span className="angular inline-flex h-12 w-12 items-center justify-center bg-gradient-to-br from-ember-400 to-ember-600 font-display text-2xl font-extrabold italic text-black">
              FF
            </span>
            <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.32em] text-ember-400">
              Free Fire Arena
            </p>
            <h2 className="mt-3 font-display text-6xl font-extrabold uppercase leading-[0.85] tracking-tight text-white">
              Built for
              <br />
              the <span className="italic text-ember-500">grind</span>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-zinc-400">
              Real brackets. Transparent standings. Room credentials that unlock
              when it matters. Everything a squad needs to compete.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              ['04', 'Tournament formats supported'],
              ['100%', 'Bracket and standings transparency'],
              ['12s', 'Live leaderboard refresh'],
              ['24/7', 'Organizer control'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg border border-white/8 bg-white/3 p-3.5">
                <p className="font-display text-2xl font-extrabold text-ember-400">{value}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">{label}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            <Link to="/tournaments" className="transition hover:text-zinc-300">
              Browse the tournament board →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
