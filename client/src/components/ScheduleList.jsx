import { Link } from 'react-router-dom';
import {
  dayKey,
  dayLabel,
  dayWeekday,
  entryLabel,
  formatMoney,
  formatTime,
  modeLabel,
  statusLabel,
} from '../lib/format.js';
import { Badge } from './ui.jsx';

function startMs(tournament) {
  const time = tournament.startsAt ? new Date(tournament.startsAt).getTime() : NaN;
  return Number.isNaN(time) ? null : time;
}

/**
 * Groups tournaments into local calendar days and renders them as a
 * day-by-day schedule: upcoming days first (soonest on top), past days
 * below, undated events last.
 */
export default function ScheduleList({ tournaments = [], currentUserId = null }) {
  const groups = new Map();
  let hasUndated = false;

  for (const tournament of tournaments) {
    const key = dayKey(tournament.startsAt);
    if (!key) {
      hasUndated = true;
      continue;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tournament);
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayKey = dayKey(startOfToday.toISOString());

  const upcoming = [...groups.entries()]
    .filter(([key]) => key >= todayKey)
    .sort(([a], [b]) => a.localeCompare(b));
  const past = [...groups.entries()]
    .filter(([key]) => key < todayKey)
    .sort(([a], [b]) => b.localeCompare(a));

  const ordered = [...upcoming, ...past];

  if (!ordered.length && !hasUndated) {
    return null;
  }

  return (
    <div className="space-y-8">
      {ordered.map(([key, items]) => {
        const sorted = [...items].sort((a, b) => {
          const aMs = startMs(a);
          const bMs = startMs(b);
          if (aMs === null && bMs === null) return 0;
          if (aMs === null) return 1;
          if (bMs === null) return -1;
          return aMs - bMs;
        });
        const liveCount = sorted.filter((item) => item.status === 'live').length;

        return (
          <section key={key} aria-label={dayLabel(key)}>
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-extrabold uppercase tracking-[0.2em] text-ember-400">
                {dayWeekday(key)}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                {dayLabel(key)}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-zinc-600">
                {key.slice(5).replace('-', '/')}
              </span>
              <span className="h-px flex-1 bg-white/8" />
              {liveCount > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-300">
                  <span className="live-dot" /> {liveCount} live
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                {sorted.length} {sorted.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {sorted.map((tournament) => (
                <ScheduleRow
                  key={tournament.id}
                  tournament={tournament}
                  isMine={currentUserId != null && tournament.organizerId === currentUserId}
                />
              ))}
            </div>
          </section>
        );
      })}

      {hasUndated && (
        <section aria-label="Date TBA">
          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-extrabold uppercase tracking-[0.2em] text-zinc-500">
              —
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white">
              Date TBA
            </span>
            <span className="h-px flex-1 bg-white/8" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              {tournaments.filter((item) => !dayKey(item.startsAt)).length} events
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {tournaments
              .filter((item) => !dayKey(item.startsAt))
              .map((tournament) => (
                <ScheduleRow
                  key={tournament.id}
                  tournament={tournament}
                  isMine={currentUserId != null && tournament.organizerId === currentUserId}
                />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ScheduleRow({ tournament, isMine }) {
  const approved = tournament.approvedCount ?? 0;
  const slots = tournament.slots || 1;
  const fill = Math.min(100, Math.round((approved / slots) * 100));
  const isLive = tournament.status === 'live';

  return (
    <Link
      to={`/tournaments/${tournament.slug}`}
      className="panel panel-hover group flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5 sm:flex-nowrap"
    >
      <div className="w-16 shrink-0 border-r border-white/6 pr-4 text-left sm:text-center">
        <p
          className={`font-display text-base font-extrabold leading-none ${isLive ? 'text-rose-400' : 'text-white'}`}
        >
          {tournament.startsAt ? formatTime(tournament.startsAt) : 'TBA'}
        </p>
        {isLive && (
          <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em] text-rose-400">
            Live
          </p>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-display text-lg font-bold uppercase tracking-wide text-white transition group-hover:text-ember-300">
            {tournament.title}
          </h3>
          <Badge tone={tournament.status} dot>
            {statusLabel(tournament.status)}
          </Badge>
          {isMine && (
            <span className="rounded border border-ember-500/30 bg-ember-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-ember-300">
              Created by you
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {modeLabel(tournament.mode)} · {tournament.format === 'battle_royale' ? 'Battle royale' : 'Bracket'} ·{' '}
          {tournament.slots} slots · {tournament.organizerName || 'Free Fire Arena'}
        </p>
      </div>

      <div className="hidden w-36 shrink-0 sm:block">
        <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-zinc-500">
          <span>
            {approved}/{tournament.slots}
          </span>
          <span>{fill}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-ember-600 to-ember-300"
            style={{ width: `${fill}%` }}
          />
        </div>
      </div>

      <div className="w-24 shrink-0 text-right">
        <p className="font-display text-base font-extrabold text-ember-400">
          {formatMoney(tournament.prizePool)}
        </p>
        <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
          {entryLabel(tournament.entryFee)}
        </p>
      </div>

      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-ember-500 transition group-hover:translate-x-1">
        View →
      </span>
    </Link>
  );
}
