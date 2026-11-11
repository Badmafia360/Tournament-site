import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import {
  Alert,
  Avatar,
  Badge,
  CopyButton,
  EmptyState,
  PageLoader,
  Spinner,
  StatBox,
} from '../components/ui.jsx';
import {
  formatDate,
  formatLabel,
  formatMoney,
  modeLabel,
  statusLabel,
} from '../lib/format.js';

export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const { data, loading, error, refresh } = useFetch('/dashboard', {
    deps: [user?.id],
    refreshMs: 30_000,
  });
  const [newTeam, setNewTeam] = useState({ name: '', tag: '', ffUid: '' });
  const [joinForm, setJoinForm] = useState({ code: '', ffUid: '' });
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);

  if (loading && !data) return <PageLoader label="Loading your locker…" />;
  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Alert type="error">{error}</Alert>
      </div>
    );
  }

  const teams = data?.teams || [];
  const registrations = data?.registrations || [];
  const matches = data?.matches || [];
  const activeRegistrations = registrations.filter((registration) =>
    ['approved', 'pending', 'waitlist'].includes(registration.status),
  );
  const unlockedRooms = registrations.filter((registration) => registration.room?.revealed);

  async function createTeam(event) {
    event.preventDefault();
    setBusy('create');
    setNotice(null);
    try {
      await api.post('/teams', newTeam);
      updateUser({ ...user, ffUid: newTeam.ffUid });
      setNewTeam({ name: '', tag: '', ffUid: '' });
      setNotice({ type: 'success', text: 'Team created. Share the invite code to build your roster.' });
      refresh();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  async function joinTeam(event) {
    event.preventDefault();
    setBusy('join');
    setNotice(null);
    try {
      await api.post('/teams/join', joinForm);
      updateUser({ ...user, ffUid: joinForm.ffUid });
      setJoinForm({ code: '', ffUid: '' });
      setNotice({
        type: 'success',
        text: `You joined the team. UID ${joinForm.ffUid} is now on your roster profile.`,
      });
      refresh();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={user.displayName} color={user.avatarColor} photo={user.avatarPhoto} size="lg" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ember-500">Player locker</p>
            <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-white sm:text-5xl">
              {user.displayName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge tone="ember">{user.role}</Badge>
              {user.ffUid && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  UID {user.ffUid}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/tournaments" className="btn btn-ghost">
            Browse tournaments
          </Link>
          <Link to="/tournaments?status=registration" className="btn btn-primary">
            Find a lobby
          </Link>
        </div>
      </div>

      {notice && (
        <Alert type={notice.type} className="mt-6" onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBox label="My teams" value={teams.length} hint="Rosters you belong to" />
        <StatBox label="Active entries" value={activeRegistrations.length} hint="Pending + approved" accent />
        <StatBox label="Upcoming matches" value={matches.length} hint="Bracket matches ahead" />
        <StatBox label="Rooms unlocked" value={unlockedRooms.length} hint="Credentials available" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">My teams</h2>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                {teams.length} roster{teams.length === 1 ? '' : 's'}
              </span>
            </div>

            {teams.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {teams.map((team) => (
                  <div key={team.id} className="panel panel-hover p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/teams/${team.id}`}
                          className="block truncate font-display text-xl font-bold uppercase tracking-wide text-white hover:text-ember-300"
                        >
                          {team.name}
                        </Link>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                          {team.tag || 'NO TAG'} · {team.memberCount ?? team.members?.length} players
                        </p>
                      </div>
                      {team.captainId === user.id && <Badge tone="ember">Captain</Badge>}
                    </div>

                    <div className="mt-3 flex items-center gap-1.5">
                      {(team.members || []).slice(0, 4).map((member) => (
                        <Avatar
                          key={member.id}
                          name={member.displayName}
                          color={member.avatarColor}
                          photo={member.avatarPhoto}
                          size="sm"
                        />
                      ))}
                      {(team.members?.length || 0) > 4 && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] text-zinc-400">
                          +{team.members.length - 4}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/6 pt-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">Invite</span>
                        <code className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[11px] font-bold tracking-[0.15em] text-ember-300">
                          {team.joinCode}
                        </code>
                        <CopyButton value={team.joinCode} label="Copy" />
                      </div>
                      <Link to={`/teams/${team.id}`} className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-ember-300">
                        Open →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="◇"
                title="No team yet"
                description="Create a squad or join one with an invite code. You need a team to register for tournaments."
              />
            )}
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">My registrations</h2>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                {registrations.length} entries
              </span>
            </div>

            {registrations.length ? (
              <div className="space-y-2.5">
                {registrations.map((registration) => (
                  <div key={registration.id} className="panel p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/tournaments/${registration.slug}`}
                          className="block truncate font-semibold text-white hover:text-ember-300"
                        >
                          {registration.title}
                        </Link>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                          {registration.teamName} · {formatLabel(registration.format)} · {modeLabel(registration.mode)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-zinc-500">{formatDate(registration.startsAt)}</span>
                        <Badge tone={registration.status}>{statusLabel(registration.status)}</Badge>
                      </div>
                    </div>

                    {registration.room?.revealed && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                          Room unlocked
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-zinc-300">
                          ID
                          <code className="font-mono font-bold text-white">{registration.room.roomId}</code>
                          <CopyButton value={registration.room.roomId} />
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-zinc-300">
                          Pass
                          <code className="font-mono font-bold text-white">{registration.room.roomPassword}</code>
                          <CopyButton value={registration.room.roomPassword} />
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="▤"
                title="No registrations yet"
                description="Find an open tournament and register your team."
                action={<Link to="/tournaments" className="btn btn-ghost btn-sm">Browse events</Link>}
              />
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel p-5">
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
              Build your roster
            </h2>
            <form onSubmit={createTeam} className="mt-4 space-y-3">
              <div>
                <label className="label" htmlFor="teamName">Team name</label>
                <input
                  id="teamName"
                  className="field"
                  required
                  minLength={3}
                  maxLength={40}
                  value={newTeam.name}
                  onChange={(event) => setNewTeam((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Phantom Squad"
                />
              </div>
              <div>
                <label className="label" htmlFor="teamTag">Tag <span className="text-zinc-600">(optional)</span></label>
                <input
                  id="teamTag"
                  className="field uppercase"
                  maxLength={5}
                  value={newTeam.tag}
                  onChange={(event) => setNewTeam((current) => ({ ...current, tag: event.target.value.toUpperCase() }))}
                  placeholder="PHTM"
                />
              </div>
              <div>
                <label className="label" htmlFor="createFfUid">Free Fire UID</label>
                <input
                  id="createFfUid"
                  className="field font-mono"
                  required
                  inputMode="numeric"
                  minLength={6}
                  maxLength={15}
                  value={newTeam.ffUid}
                  onChange={(event) =>
                    setNewTeam((current) => ({ ...current, ffUid: event.target.value.replace(/\D/g, '') }))
                  }
                  placeholder="6–15 digits"
                />
                <p className="mt-1 text-[10px] text-zinc-600">
                  Required. Found in-game under your profile.
                </p>
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={busy === 'create'}>
                {busy === 'create' ? <Spinner className="h-4 w-4" /> : 'Create team'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/8" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">or join</span>
              <span className="h-px flex-1 bg-white/8" />
            </div>

            <form onSubmit={joinTeam} className="space-y-3">
              <div>
                <label className="label" htmlFor="joinFfUid">Free Fire UID</label>
                <input
                  id="joinFfUid"
                  className="field font-mono"
                  required
                  inputMode="numeric"
                  minLength={6}
                  maxLength={15}
                  value={joinForm.ffUid}
                  onChange={(event) =>
                    setJoinForm((current) => ({ ...current, ffUid: event.target.value.replace(/\D/g, '') }))
                  }
                  placeholder="6–15 digits"
                />
                <p className="mt-1 text-[10px] text-zinc-600">
                  Required. Saved to your roster profile for check-in.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  className="field uppercase tracking-[0.15em]"
                  required
                  maxLength={12}
                  value={joinForm.code}
                  onChange={(event) =>
                    setJoinForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))
                  }
                  placeholder="INVITE CODE"
                  aria-label="Team invite code"
                />
                <button type="submit" className="btn btn-ghost shrink-0" disabled={busy === 'join'}>
                  {busy === 'join' ? <Spinner className="h-4 w-4" /> : 'Join'}
                </button>
              </div>
            </form>
          </section>

          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
                Upcoming matches
              </h2>
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                {matches.length}
              </span>
            </div>

            {matches.length ? (
              <div className="mt-4 space-y-2.5">
                {matches.map((match) => (
                  <Link
                    key={match.id}
                    to={`/tournaments/${match.slug}`}
                    className="block rounded-lg border border-white/8 bg-white/2 p-3 transition hover:border-ember-500/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                        {match.title}
                      </p>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-ember-400">
                        Round {match.round}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-zinc-200">
                      {match.teamAName || 'TBD'} <span className="text-zinc-600">vs</span>{' '}
                      {match.teamBName || 'TBD'}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">
                No bracket matches scheduled. Register for a single-elimination event to see your path here.
              </p>
            )}
          </section>

          {unlockedRooms.length > 0 && (
            <section className="panel border-emerald-500/20 p-5">
              <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
                Rooms ready
              </h2>
              <div className="mt-3 space-y-3">
                {unlockedRooms.map((registration) => (
                  <div key={registration.id} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      {registration.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-mono font-bold text-white">{registration.room.roomId}</span>
                      <CopyButton value={registration.room.roomId} label="Copy ID" />
                      <span className="font-mono font-bold text-white">{registration.room.roomPassword}</span>
                      <CopyButton value={registration.room.roomPassword} label="Copy pass" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="panel p-5">
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
              Quick links
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              <Link to="/tournaments" className="block rounded-md border border-white/8 bg-white/2 px-3 py-2.5 text-zinc-300 hover:border-ember-500/30 hover:text-white">
                Browse open tournaments →
              </Link>
              <Link to="/register" className="block rounded-md border border-white/8 bg-white/2 px-3 py-2.5 text-zinc-300 hover:border-ember-500/30 hover:text-white">
                Invite a teammate →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
