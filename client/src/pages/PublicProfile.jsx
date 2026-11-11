import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import {
  Alert,
  Avatar,
  Badge,
  EmptyState,
  PageLoader,
  StatBox,
} from '../components/ui.jsx';
import {
  formatDay,
  formatDate,
  formatLabel,
  formatMoney,
  modeLabel,
  statusLabel,
} from '../lib/format.js';

export default function PublicProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error } = useFetch(`/users/${id}`, { deps: [id] });

  if (loading && !data) return <PageLoader label="Loading player…" />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          icon="✕"
          title="Player not found"
          description="That profile does not exist, or the link is wrong."
          action={
            <Link to="/tournaments" className="btn btn-ghost">
              Browse tournaments
            </Link>
          }
        />
        {error && <p className="mt-4 text-center text-sm text-zinc-600">{error}</p>}
      </div>
    );
  }

  const { player, teams, history, stats } = data;
  const isSelf = user?.id === player.id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={player.displayName} color={player.avatarColor} photo={player.avatarPhoto} size="lg" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ember-500">Player profile</p>
            <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-white sm:text-5xl">
              {player.displayName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge tone="ember">{player.role}</Badge>
              {player.ffUid && (
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  UID {player.ffUid}
                </span>
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Member since {formatDay(player.createdAt)}
              </span>
            </div>
          </div>
        </div>
        {isSelf && (
          <Link to="/profile" className="btn btn-primary">
            Edit profile
          </Link>
        )}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <StatBox label="Teams" value={stats.teams} hint="Rosters" />
        <StatBox label="Events" value={stats.events} hint="Tournament entries" accent />
        <StatBox label="Titles" value={stats.titles} hint="Completed-event wins" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">Teams</h2>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
              {teams.length}
            </span>
          </div>
          {teams.length ? (
            <div className="space-y-3">
              {teams.map((team) => (
                <Link key={team.id} to={`/teams/${team.id}`} className="panel panel-hover block p-4">
                  <p className="truncate font-display text-lg font-bold uppercase tracking-wide text-white hover:text-ember-300">
                    {team.name}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    {team.tag || 'NO TAG'} · {team.memberCount} players
                  </p>
                  <div className="mt-2">
                    <Badge tone={team.memberRole === 'captain' ? 'ember' : 'neutral'}>
                      {team.memberRole === 'captain' ? 'Captain' : 'Member'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon="◇" title="No team yet" description="This player is not on a roster." />
          )}
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
              Tournament history
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
              {history.length} event{history.length === 1 ? '' : 's'}
            </span>
          </div>

          {history.length ? (
            <div className="space-y-3">
              {history.map((row, index) => (
                <Link
                  key={`${row.tournamentId}-${index}`}
                  to={`/tournaments/${row.slug}`}
                  className="panel panel-hover flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold uppercase tracking-wide text-white hover:text-ember-300">
                      {row.title}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                      {formatLabel(row.format)} · {modeLabel(row.mode)} · with {row.teamName}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                      {formatDate(row.startsAt, { withYear: true })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone={row.tournamentStatus === 'completed' ? 'neutral' : 'ember'}>
                      {statusLabel(row.tournamentStatus)}
                    </Badge>
                    <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                      {formatMoney(row.prizePool)} pool
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                      {statusLabel(row.registrationStatus)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Alert type="info">
              No tournament entries yet — this player hasn&apos;t registered for an event.
            </Alert>
          )}
        </section>
      </div>
    </div>
  );
}
