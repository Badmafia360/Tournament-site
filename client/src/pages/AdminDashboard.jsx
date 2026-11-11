import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import {
  Alert,
  Badge,
  EmptyState,
  PageLoader,
  StatBox,
} from '../components/ui.jsx';
import {
  formatDate,
  formatLabel,
  formatMoney,
  statusLabel,
} from '../lib/format.js';

export default function AdminDashboard() {
  const { user } = useAuth();
  const path = user.role === 'admin' ? '/tournaments?scope=all' : '/tournaments?mine=1';
  const { data, loading, error } = useFetch(path, { deps: [user.role] });

  if (loading) return <PageLoader label="Loading console…" />;
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Alert type="error">{error}</Alert>
      </div>
    );
  }

  const tournaments = data?.tournaments || [];
  const live = tournaments.filter((tournament) => tournament.status === 'live');
  const open = tournaments.filter((tournament) => tournament.status === 'registration');
  const pending = tournaments.reduce(
    (sum, tournament) => sum + (tournament.pendingCount || 0),
    0,
  );
  const prize = tournaments.reduce((sum, tournament) => sum + (tournament.prizePool || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ember-500">
            {user.role === 'admin' ? 'Administrator' : 'Organizer'} console
          </p>
          <h1 className="mt-1 font-display text-5xl font-extrabold uppercase tracking-tight text-white">
            Event control
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            {user.role === 'admin'
              ? 'Every tournament on the platform. Create events, manage registrations, and publish results.'
              : 'Create and run your events. Registrations, seeding, brackets, and results all live here.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/tournaments" className="btn btn-ghost">
            Public board
          </Link>
          <Link to="/admin/tournaments/new" className="btn btn-primary">
            + Create tournament
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBox label="Total events" value={tournaments.length} hint="Across all statuses" />
        <StatBox label="Live now" value={live.length} hint="Currently underway" accent />
        <StatBox label="Pending approvals" value={pending} hint="Teams waiting on you" />
        <StatBox label="Prize on the line" value={formatMoney(prize)} hint="Combined prize pools" />
      </div>

      {open.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {open.slice(0, 4).map((tournament) => (
            <Link
              key={tournament.id}
              to={`/admin/tournaments/${tournament.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:border-ember-500/40 hover:text-ember-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {tournament.title}
              <span className="text-zinc-600">{tournament.approvedCount}/{tournament.slots}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="panel mt-8 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/6 px-5 py-4">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
            Your events
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
            {tournaments.length} total
          </span>
        </div>

        {tournaments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/6 text-left text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  <th className="px-5 py-3">Event</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Format</th>
                  <th className="px-4 py-3">Teams</th>
                  <th className="px-4 py-3">Pending</th>
                  <th className="px-4 py-3">Starts</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((tournament) => (
                  <tr key={tournament.id} className="border-b border-white/5 transition hover:bg-white/2">
                    <td className="px-5 py-4">
                      <Link
                        to={`/admin/tournaments/${tournament.id}`}
                        className="font-semibold text-white hover:text-ember-300"
                      >
                        {tournament.title}
                      </Link>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">
                        {formatMoney(tournament.prizePool)} prize · {tournament.organizerName}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={tournament.status} dot>
                        {statusLabel(tournament.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-xs text-zinc-400">
                      {formatLabel(tournament.format)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-semibold text-zinc-300">
                        {tournament.approvedCount}/{tournament.slots}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {tournament.pendingCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          {tournament.pendingCount} waiting
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-zinc-500">
                      {formatDate(tournament.startsAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/tournaments/${tournament.slug}`}
                          className="btn btn-ghost btn-sm"
                        >
                          View
                        </Link>
                        <Link
                          to={`/admin/tournaments/${tournament.id}`}
                          className="btn btn-primary btn-sm"
                        >
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              icon="✎"
              title="No events yet"
              description="Create your first tournament and open registration. You can save it as a draft until you are ready."
              action={
                <Link to="/admin/tournaments/new" className="btn btn-primary btn-sm">
                  Create tournament
                </Link>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
