import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/6 bg-ink-950">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="angular flex h-9 w-9 items-center justify-center bg-gradient-to-br from-ember-400 to-ember-600 font-display text-lg font-extrabold italic text-black">
              FF
            </span>
            <span className="font-display text-xl font-extrabold uppercase tracking-wider text-white">
              Free Fire <span className="text-ember-500">Arena</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
            Competitive Free Fire tournaments for squads who want real brackets, real
            standings, and real bragging rights.
          </p>
          <p className="mt-5 text-[11px] leading-relaxed text-zinc-600">
            Free Fire Arena is an independent community project. It is not affiliated
            with, endorsed by, or sponsored by Garena. All game assets and trademarks
            belong to their respective owners.
          </p>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Compete</p>
          <div className="mt-4 space-y-2.5 text-sm">
            <Link to="/tournaments" className="block text-zinc-400 hover:text-ember-300">
              Browse tournaments
            </Link>
            <Link to="/dashboard" className="block text-zinc-400 hover:text-ember-300">
              Player dashboard
            </Link>
            <Link to="/register" className="block text-zinc-400 hover:text-ember-300">
              Create an account
            </Link>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Organize</p>
          <div className="mt-4 space-y-2.5 text-sm">
            <Link to="/register" className="block text-zinc-400 hover:text-ember-300">
              Become an organizer
            </Link>
            <Link to="/admin" className="block text-zinc-400 hover:text-ember-300">
              Organizer console
            </Link>
            <a href="mailto:hello@freefirearena.gg" className="block text-zinc-400 hover:text-ember-300">
              Contact the team
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-[11px] text-zinc-600 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Free Fire Arena. Built for the community.</p>
          <p className="uppercase tracking-[0.18em]">Play fair. Fight hard.</p>
        </div>
      </div>
    </footer>
  );
}
