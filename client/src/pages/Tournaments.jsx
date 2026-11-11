import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import ScheduleList from '../components/ScheduleList.jsx';
import { Alert, EmptyState, SkeletonCards } from '../components/ui.jsx';

const FILTERS = [
  { value: 'all', label: 'All events' },
  { value: 'live', label: 'Live' },
  { value: 'registration', label: 'Registration open' },
  { value: 'completed', label: 'Completed' },
];

export default function Tournaments() {
  const { user } = useAuth();
  const canSeeMine = Boolean(user && ['organizer', 'admin'].includes(user.role));
  const [mineOnly, setMineOnly] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const showMine = canSeeMine && mineOnly;
  const { data, loading, error } = useFetch(
    showMine ? '/tournaments?mine=1' : '/tournaments',
    { deps: [showMine] },
  );

  const tournaments = data?.tournaments || [];

  const counts = useMemo(
    () =>
      tournaments.reduce(
        (acc, tournament) => {
          acc.all += 1;
          acc[tournament.status] = (acc[tournament.status] || 0) + 1;
          return acc;
        },
        { all: 0 },
      ),
    [tournaments],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tournaments.filter((tournament) => {
      if (filter !== 'all' && tournament.status !== filter) return false;
      if (!query) return true;
      return (
        tournament.title.toLowerCase().includes(query) ||
        (tournament.organizerName || '').toLowerCase().includes(query)
      );
    });
  }, [tournaments, filter, search]);

  const nothingYet = !loading && !error && filtered.length === 0;

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-72 overflow-hidden border-b border-white/6">
        <div className="grid-glow absolute inset-0 opacity-30" />
        <div className="absolute left-1/2 top-0 h-64 w-[700px] -translate-x-1/2 rounded-full bg-ember-500/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ember-500">
          The board
        </p>
        <h1 className="mt-2 font-display text-5xl font-extrabold uppercase tracking-tight text-white sm:text-6xl">
          Tournaments
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-400">
          Every event, day by day. One day can hold several lobbies — pick your
          slot, lock in your squad, and never miss a start time.
        </p>

        <div className="mt-8 flex flex-col gap-4 border-b border-white/6 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`shrink-0 rounded-md px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                  filter === item.value
                    ? 'bg-ember-500/15 text-ember-300 ring-1 ring-ember-500/30'
                    : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                {item.label}
                <span className="ml-2 text-zinc-600">{counts[item.value] || 0}</span>
              </button>
            ))}

            {canSeeMine && (
              <button
                type="button"
                onClick={() => setMineOnly((value) => !value)}
                aria-pressed={mineOnly}
                className={`ml-1 shrink-0 rounded-md border px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                  mineOnly
                    ? 'border-ember-500/50 bg-ember-500/15 text-ember-300'
                    : 'border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-200'
                }`}
              >
                ★ My events
              </button>
            )}
          </div>

          <div className="relative lg:w-72">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-600">
              ⌕
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events or organizers"
              className="field pl-8"
              aria-label="Search tournaments"
            />
          </div>
        </div>

        {error && <Alert type="error" className="mt-6">{error}</Alert>}

        {showMine && (
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-ember-400">
            Showing only events you created
          </p>
        )}

        <div className="mt-8">
          {loading ? (
            <SkeletonCards count={6} />
          ) : filtered.length ? (
            <ScheduleList tournaments={filtered} currentUserId={user?.id ?? null} />
          ) : nothingYet && showMine ? (
            <EmptyState
              icon="✎"
              title="You have not created any events yet"
              description="Set up your first tournament, open registration, and it will show up here."
              action={
                <Link to="/admin/tournaments/new" className="btn btn-primary btn-sm">
                  Create tournament
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon="⌁"
              title="No events match"
              description="Try a different filter or search term. New lobbies drop regularly."
              action={
                <Link
                  to="/tournaments"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setFilter('all');
                    setSearch('');
                    setMineOnly(false);
                  }}
                >
                  Clear filters
                </Link>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
