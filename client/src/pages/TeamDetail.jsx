import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import {
  Alert,
  Avatar,
  Badge,
  CopyButton,
  EmptyState,
  PageLoader,
} from '../components/ui.jsx';
import { formatDate, formatLabel, formatMoney, modeLabel, statusLabel } from '../lib/format.js';

export default function TeamDetail() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(`/teams/${id}`);

  if (loading) return <PageLoader label="Loading roster…" />;
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Alert type="error">{error}</Alert>
        <Link to="/dashboard" className="btn btn-ghost mt-4">Back to dashboard</Link>
      </div>
    );
  }

  const team = data.team;
  const members = team.members || [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to="/dashboard" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-ember-300">
        ← Back to dashboard
      </Link>

      <div className="panel relative mt-4 overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-0 grid-glow opacity-25" />
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ember-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="ember">{team.tag || 'NO TAG'}</Badge>
              {data.isMember ? <Badge tone="approved">Member</Badge> : <Badge tone="neutral">View only</Badge>}
            </div>
            <h1 className="mt-3 font-display text-5xl font-extrabold uppercase leading-none tracking-tight text-white">
              {team.name}
            </h1>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Captain {team.captainName} · {team.memberCount ?? members.length} players
            </p>
          </div>

          {data.isMember && team.joinCode && (
            <div className="rounded-lg border border-white/10 bg-black/25 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">Team invite code</p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="font-display text-2xl font-bold tracking-[0.2em] text-ember-300">
                  {team.joinCode}
                </code>
                <CopyButton value={team.joinCode} />
              </div>
              <p className="mt-1 text-[10px] text-zinc-600">Share to add teammates.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="panel p-6">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">Roster</h2>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
              {members.length} players
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/2 p-3.5">
                <Link
                  to={`/players/${member.id}`}
                  className="flex h-10 w-10 shrink-0"
                  aria-label={`${member.displayName} profile`}
                >
                  <Avatar name={member.displayName} color={member.avatarColor} photo={member.avatarPhoto} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/players/${member.id}`}
                    className="block truncate text-sm font-semibold text-white hover:text-ember-300"
                  >
                    {member.displayName}
                  </Link>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {member.role === 'captain' ? 'Captain' : 'Member'}
                    {member.ffUid ? ` · UID ${member.ffUid}` : ''}
                  </p>
                </div>
                {member.role === 'captain' && <Badge tone="ember">C</Badge>}
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
            Tournament history
          </h2>

          {data.registrations?.length ? (
            <div className="mt-4 space-y-2.5">
              {data.registrations.map((registration, index) => (
                <Link
                  key={`${registration.tournamentId}-${index}`}
                  to={`/tournaments/${registration.slug}`}
                  className="block rounded-lg border border-white/8 bg-white/2 p-3.5 transition hover:border-ember-500/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{registration.title}</p>
                    <Badge tone={registration.status}>{statusLabel(registration.status)}</Badge>
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
                    {formatLabel(registration.format)} · {modeLabel(registration.mode)}
                    {registration.seed ? ` · Seed ${registration.seed}` : ''}
                  </p>
                  <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
                    <span>{formatDate(registration.startsAt)}</span>
                    <span className="text-ember-400">{formatMoney(registration.prizePool)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon="▤"
                title="No entries yet"
                description="Register this team for an open tournament."
                action={<Link to="/tournaments" className="btn btn-ghost btn-sm">Find an event</Link>}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
