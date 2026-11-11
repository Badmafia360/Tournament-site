import { Link } from 'react-router-dom';
import {
  bannerFor,
  entryLabel,
  formatDate,
  formatMoney,
  formatShort,
  modeLabel,
  statusLabel,
} from '../lib/format.js';
import { Badge } from './ui.jsx';

export default function TournamentCard({ tournament }) {
  const banner = bannerFor(tournament.banner);
  const approved = tournament.approvedCount ?? 0;
  const slots = tournament.slots || 1;
  const fill = Math.min(100, Math.round((approved / slots) * 100));

  return (
    <Link
      to={`/tournaments/${tournament.slug}`}
      className="panel panel-hover group flex flex-col overflow-hidden"
    >
      <div className={`relative h-28 overflow-hidden bg-gradient-to-br ${banner.className}`}>
        <div className="absolute inset-0 grid-glow opacity-60" />
        <div className="absolute -right-2 -top-8 select-none font-display text-[120px] font-extrabold italic leading-none text-white/10">
          FF
        </div>
        <div className="relative flex items-start justify-between gap-2 p-4">
          <Badge tone={tournament.status} dot>
            {statusLabel(tournament.status)}
          </Badge>
          <span className="rounded border border-white/20 bg-black/25 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-white/80 backdrop-blur">
            {formatShort(tournament.format)}
          </span>
        </div>
        <div className="absolute bottom-3 left-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
          <span>{modeLabel(tournament.mode)}</span>
          <span className="text-white/30">/</span>
          <span>{tournament.slots} slots</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-2xl font-bold uppercase leading-tight tracking-wide text-white transition group-hover:text-ember-300">
          {tournament.title}
        </h3>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Hosted by {tournament.organizerName || 'Free Fire Arena'}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">Prize pool</p>
            <p className="font-display text-xl font-extrabold text-ember-400">
              {formatMoney(tournament.prizePool)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">Entry</p>
            <p className="text-sm font-semibold text-zinc-200">{entryLabel(tournament.entryFee)}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <span>{approved} / {tournament.slots} teams</span>
            <span>{fill}% full</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ember-600 to-ember-300"
              style={{ width: `${fill}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3 text-[11px] text-zinc-500">
          <span>{formatDate(tournament.startsAt)}</span>
          <span className="font-bold uppercase tracking-widest text-ember-500 transition group-hover:translate-x-1">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
