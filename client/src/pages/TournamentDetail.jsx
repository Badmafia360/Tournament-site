import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import Bracket from '../components/Bracket.jsx';
import StandingsTable from '../components/StandingsTable.jsx';
import { Countdown } from '../components/Countdown.jsx';
import {
  Alert,
  Badge,
  CopyButton,
  EmptyState,
  PageLoader,
  Spinner,
} from '../components/ui.jsx';
import {
  bannerFor,
  dayKey,
  entryLabel,
  formatDate,
  formatDay,
  formatMoney,
  formatLabel,
  formatTime,
  modeLabel,
  statusLabel,
} from '../lib/format.js';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'teams', label: 'Teams' },
  { key: 'bracket', label: 'Bracket' },
  { key: 'standings', label: 'Standings' },
  { key: 'announcements', label: 'Announcements' },
];

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-2.5 text-sm last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium text-zinc-200">{value}</span>
    </div>
  );
}

export default function TournamentDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data, loading, error, refresh } = useFetch(`/tournaments/${slug}`, {
    refreshMs: 12_000,
  });
  const { data: mineData, refresh: refreshMine } = useFetch(
    user ? '/teams/mine' : null,
    { deps: [user?.id] },
  );

  const tournament = data?.tournament;
  const dateKey = dayKey(tournament?.startsAt);
  const tzOffset = useMemo(() => new Date().getTimezoneOffset(), []);
  const { data: dayData } = useFetch(
    dateKey ? `/tournaments?date=${dateKey}&tz=${tzOffset}` : null,
    { deps: [dateKey, tzOffset] },
  );

  const [tab, setTab] = useState('overview');
  const [notice, setNotice] = useState(null);
  const [busyTeam, setBusyTeam] = useState(null);
  const [picking, setPicking] = useState(false);
  const [pickedTeam, setPickedTeam] = useState(null);

  useEffect(() => {
    setTab('overview');
    setNotice(null);
    setPicking(false);
    setPickedTeam(null);
  }, [slug]);

  const banner = bannerFor(tournament?.banner);
  const myTeams = mineData?.teams || [];

  const myRegistrationFor = useMemo(() => {
    const map = new Map();
    for (const registration of data?.myRegistrations || []) {
      map.set(registration.teamId, registration);
    }
    return map;
  }, [data]);

  const captainTeams = useMemo(
    () => myTeams.filter((team) => team.captainId === user?.id),
    [myTeams, user?.id],
  );

  const unjoinedCaptainTeams = useMemo(
    () => captainTeams.filter((team) => !myRegistrationFor.has(team.id)),
    [captainTeams, myRegistrationFor],
  );

  if (loading && !data) return <PageLoader label="Loading event…" />;
  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Alert type="error">{error}</Alert>
        <Link to="/tournaments" className="btn btn-ghost mt-4">
          Back to tournaments
        </Link>
      </div>
    );
  }
  if (!tournament) return null;

  const approved = tournament.approvedCount ?? data.approvedTeams?.length ?? 0;
  const fill = Math.min(100, Math.round((approved / tournament.slots) * 100));
  const isBR = tournament.format === 'battle_royale';
  const registrationClosed =
    tournament.status !== 'registration' ||
    (tournament.registrationCloses && new Date(tournament.registrationCloses) < new Date());

  const sameDayEvents = (dayData?.tournaments || [])
    .filter((item) => item.id !== tournament.id)
    .slice(0, 4);

  async function handleRegister(teamId) {
    setBusyTeam(teamId);
    setNotice(null);
    try {
      const response = await api.post(`/tournaments/${tournament.id}/register`, { teamId });
      const status = response.registration.status;
      setNotice({
        type: 'success',
        text:
          status === 'waitlist'
            ? 'All slots are full, so your team joined the waitlist. The organizer will promote teams if a slot opens.'
            : 'Registration submitted. The organizer will review and approve your team.',
      });
      setPicking(false);
      setPickedTeam(null);
      refresh();
      refreshMine();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusyTeam(null);
    }
  }

  const tabs =
    tournament.format === 'single_elim'
      ? TABS.filter((item) => item.key !== 'standings')
      : TABS.filter((item) => item.key !== 'bracket');

  const joinedRegistrations = data.myRegistrations || [];

  function joinBody() {
    if (data.canManage) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            You manage this event. Approve teams, seed the bracket, and publish
            results from the console.
          </p>
          <Link to={`/admin/tournaments/${tournament.id}`} className="btn btn-primary w-full">
            Open organizer console
          </Link>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            Sign in with your team to claim a slot and unlock room credentials.
          </p>
          <Link
            to="/login"
            state={{ from: `/tournaments/${slug}` }}
            className="btn btn-primary w-full"
          >
            Sign in to join
          </Link>
        </div>
      );
    }

    if (registrationClosed) {
      return (
        <div className="space-y-3">
          <div>
            <Badge tone={tournament.status}>{statusLabel(tournament.status)}</Badge>
          </div>
          <p className="text-sm text-zinc-400">
            {tournament.status === 'live'
              ? 'The event is underway. Room credentials are in the match room below for approved teams.'
              : tournament.status === 'completed'
                ? 'This event has wrapped. Check the bracket for final results.'
                : 'Registration is currently closed for this event.'}
          </p>
          {joinedRegistrations.length > 0 && (
            <div className="space-y-2">
              {joinedRegistrations.map((registration) => (
                <div
                  key={registration.id}
                  className="flex items-center justify-between rounded-md border border-white/8 bg-white/3 px-3 py-2 text-xs"
                >
                  <span className="text-zinc-300">{registration.teamName}</span>
                  <Badge tone={registration.status}>{statusLabel(registration.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Registration open: joined teams first, then one clear join action.
    return (
      <div className="space-y-3">
        {joinedRegistrations.length > 0 && (
          <div className="space-y-2">
            {joinedRegistrations.map((registration) => (
              <div
                key={registration.id}
                className="rounded-md border border-white/8 bg-white/3 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {registration.teamName}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                      Your entry
                    </p>
                  </div>
                  <Badge tone={registration.status}>{statusLabel(registration.status)}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {captainTeams.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-3 text-xs text-zinc-500">
            You are not a captain of any team yet.{' '}
            <Link to="/dashboard" className="text-ember-400 hover:text-ember-300">
              Create or join a team →
            </Link>
          </div>
        ) : unjoinedCaptainTeams.length === 0 ? (
          <p className="text-xs leading-relaxed text-zinc-500">
            Every team you captain is already in this event. The organizer will
            review your entries.
          </p>
        ) : !picking ? (
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => setPicking(true)}
          >
            Join event
          </button>
        ) : (
          <div className="rounded-lg border border-ember-500/30 bg-ember-500/5 p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-ember-400">
              Choose your team
            </p>
            <div className="mt-2 space-y-1.5">
              {unjoinedCaptainTeams.map((team) => (
                <label
                  key={team.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition ${
                    pickedTeam === team.id
                      ? 'border-ember-500/50 bg-ember-500/10 text-white'
                      : 'border-white/10 bg-white/2 text-zinc-300 hover:border-white/25'
                  }`}
                >
                  <input
                    type="radio"
                    name="join-team"
                    className="accent-ember-500"
                    checked={pickedTeam === team.id}
                    onChange={() => setPickedTeam(team.id)}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{team.name}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500">
                    {team.tag || 'NO TAG'}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn btn-primary flex-1"
                disabled={!pickedTeam || busyTeam === pickedTeam}
                onClick={() => handleRegister(pickedTeam)}
              >
                {busyTeam === pickedTeam ? <Spinner className="h-4 w-4" /> : 'Confirm & join'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setPicking(false);
                  setPickedTeam(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-zinc-600">
          Entry is {entryLabel(tournament.entryFee).toLowerCase()}. Only the team
          captain can submit the registration. Pending teams are reviewed by the
          organizer; full events move new entries to the waitlist.
        </p>
      </div>
    );
  }

  return (
    <div>
      <section className={`relative overflow-hidden border-b border-white/6 bg-gradient-to-br ${banner.className}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent" />
        <div className="absolute inset-0 grid-glow opacity-35" />
        <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pt-10">
          <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
            <Link to="/tournaments" className="hover:text-white">Tournaments</Link>
            <span>/</span>
            <span className="text-white/80">{tournament.title}</span>
          </nav>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge tone={tournament.status} dot>
              {statusLabel(tournament.status)}
            </Badge>
            <Badge tone="ember">{formatLabel(tournament.format)}</Badge>
            <Badge tone="neutral">{modeLabel(tournament.mode)}</Badge>
          </div>

          <h1 className="mt-3 max-w-4xl font-display text-5xl font-extrabold uppercase leading-[0.92] tracking-tight text-white sm:text-6xl">
            {tournament.title}
          </h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Hosted by {tournament.organizerName || 'Free Fire Arena'}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <span className="text-ember-400">◈</span> {formatMoney(tournament.prizePool)} prize pool
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-white">
              <span className="text-ember-400">◷</span> {formatDay(tournament.startsAt)} ·{' '}
              {formatTime(tournament.startsAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-ember-400">▤</span> {approved}/{tournament.slots} teams
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-ember-400">◉</span> {entryLabel(tournament.entryFee)}
            </span>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {tournament.status === 'registration' && !registrationClosed && (
              <a href="#register" className="btn btn-primary">
                Join event
              </a>
            )}
            {tournament.status === 'live' && (
              <span className="btn btn-ghost cursor-default">
                <span className="live-dot" /> Event live
              </span>
            )}
            {data.canManage && (
              <Link to={`/admin/tournaments/${tournament.id}`} className="btn btn-ghost">
                Manage event
              </Link>
            )}
            <span className="text-xs text-white/60">
              <Countdown
                target={tournament.startsAt}
                prefix={tournament.status === 'live' ? 'Lobby opened ' : 'Starts in '}
                compact
              />
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {notice && (
          <Alert type={notice.type} className="mb-5" onClose={() => setNotice(null)}>
            {notice.text}
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto border-b border-white/6 pb-2">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`shrink-0 rounded-md px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                    tab === item.key
                      ? 'bg-ember-500/10 text-ember-300'
                      : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                >
                  {item.key === 'bracket' ? (isBR ? 'Standings' : 'Bracket') : item.label}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="panel p-6">
                  <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                    About this event
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                    {tournament.description || 'The organizer has not added a description yet.'}
                  </p>

                  <div className="mt-5">
                    <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      <span>Slots filled</span>
                      <span>
                        {approved}/{tournament.slots} · {fill}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-ember-600 to-ember-300"
                        style={{ width: `${fill}%` }}
                      />
                    </div>
                  </div>

                  <details className="group mt-5 rounded-lg border border-white/8 bg-white/2">
                    <summary className="cursor-pointer list-none px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 transition hover:text-white">
                      Rules & format
                      <span className="float-right text-zinc-600 transition group-open:rotate-180">
                        ▾
                      </span>
                    </summary>
                    <p className="whitespace-pre-line px-4 pb-4 text-sm leading-relaxed text-zinc-400">
                      {tournament.rules || 'Standard Free Fire tournament rules apply.'}
                    </p>
                  </details>
                </div>

                {tournament.prizePool > 0 && (
                  <div className="panel p-6">
                    <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                      Prize distribution
                    </h2>
                    <div className="mt-4 space-y-2">
                      {[
                        ['1st place', 0.5],
                        ['2nd place', 0.3],
                        ['3rd place', 0.2],
                      ].map(([label, share]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between rounded-lg border border-white/8 bg-white/2 px-4 py-3"
                        >
                          <span className="text-sm text-zinc-300">{label}</span>
                          <span className="font-display text-lg font-extrabold text-ember-400">
                            {formatMoney(Math.round(tournament.prizePool * share))}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-zinc-600">
                      Distribution is indicative. The organizer confirms final payouts before the event.
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === 'teams' && (
              <div className="panel p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                    Registered teams
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    {approved} approved · {tournament.slots} slots
                  </p>
                </div>

                {data.approvedTeams?.length ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {data.approvedTeams.map((team) => (
                      <div key={team.id} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/2 p-3.5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ember-500/25 bg-ember-500/10 font-display text-lg font-extrabold text-ember-400">
                          {team.seed ?? '–'}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{team.name}</p>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                            {team.tag || 'NO TAG'} · C: {team.captainName} · {team.memberCount} players
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5">
                    <EmptyState
                      icon="◇"
                      title="No approved teams yet"
                      description="Approved squads will appear here once the organizer reviews registrations."
                    />
                  </div>
                )}
              </div>
            )}

            {(tab === 'bracket' || (tab === 'standings')) && (
              <div className="panel p-6">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                      {isBR ? 'Live standings' : 'Elimination bracket'}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {isBR
                        ? 'Placement points + one point per kill. Ties break by total kills.'
                        : 'Winners advance automatically as results are reported.'}
                    </p>
                  </div>
                  {tournament.status === 'live' && (
                    <Badge tone="live" dot>Updating live</Badge>
                  )}
                </div>

                {isBR ? (
                  <div className="space-y-8">
                    <StandingsTable standings={data.standings} />
                    {data.brResults?.length > 0 && (
                      <div>
                        <h3 className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-zinc-300">
                          Match results
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {data.brResults.map((match) => (
                            <div key={match.matchNumber} className="rounded-lg border border-white/8 bg-white/2 p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ember-400">
                                  Match {match.matchNumber}
                                </p>
                                <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                                  {match.results.length} teams
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {match.results.slice(0, 5).map((row) => (
                                  <div key={row.teamId} className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2 text-zinc-300">
                                      <span className="w-4 text-right text-zinc-600">{row.placement}</span>
                                      {row.name}
                                    </span>
                                    <span className="text-zinc-500">
                                      {row.kills} K · <span className="font-bold text-ember-400">{row.points} P</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Bracket matches={data.bracket} champion={data.champion} />
                )}
              </div>
            )}

            {tab === 'announcements' && (
              <div className="space-y-3">
                {data.announcements?.length ? (
                  data.announcements.map((announcement) => (
                    <div key={announcement.id} className="panel p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-display text-xl font-bold uppercase tracking-wide text-white">
                          {announcement.title}
                        </h3>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                          {formatDate(announcement.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                        {announcement.body}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon="✎"
                    title="No announcements yet"
                    description="Organizer updates, check-in reminders, and lobby notes will show up here."
                  />
                )}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            {/* One card: join states, then the match room you earn by joining. */}
            <div id="register" className="panel p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
                  Join event
                </h2>
                {!registrationClosed && tournament.status === 'registration' && (
                  <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                    Open
                  </span>
                )}
              </div>

              <div className="mt-3">{joinBody()}</div>

              {(user || data.canManage) && (
                <div className="mt-5 border-t border-white/6 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold uppercase tracking-wide text-white">
                      Match room
                    </h3>
                    <span
                      className={`h-2 w-2 rounded-full ${data.room.revealed ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                    />
                  </div>

                  {data.room.revealed ? (
                    <div className="mt-3 space-y-2.5">
                      <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-400/80">Room ID</p>
                            <p className="mt-0.5 font-mono text-lg font-bold tracking-wider text-white">{data.room.roomId}</p>
                          </div>
                          <CopyButton value={data.room.roomId} />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-emerald-500/15 pt-3">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-400/80">Password</p>
                            <p className="mt-0.5 font-mono text-lg font-bold tracking-wider text-white">{data.room.roomPassword}</p>
                          </div>
                          <CopyButton value={data.room.roomPassword} />
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Join the lobby at least 10 minutes before start. Do not share these credentials.
                      </p>
                    </div>
                  ) : data.room.eligible ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <span className="text-lg">🔒</span>
                        <p className="text-sm font-medium">Credentials locked</p>
                      </div>
                      <p className="text-sm text-zinc-500">
                        Unlocks {data.room.revealAt ? <Countdown target={data.room.revealAt} prefix="in " /> : 'soon'}.
                      </p>
                      <p className="text-[11px] text-zinc-600">
                        Reveal time: {formatDate(data.room.revealAt)}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm text-zinc-400">
                        Only members of approved teams can see the room ID and password.
                      </p>
                      <p className="text-[11px] text-zinc-600">
                        Credentials reveal shortly before the event starts.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="panel p-5">
              <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
                Event details
              </h2>
              <div className="mt-2">
                <InfoRow label="Format" value={formatLabel(tournament.format)} />
                <InfoRow label="Mode" value={modeLabel(tournament.mode)} />
                <InfoRow label="Slots" value={`${tournament.slots} teams`} />
                <InfoRow label="Prize pool" value={formatMoney(tournament.prizePool)} />
                <InfoRow label="Entry" value={entryLabel(tournament.entryFee)} />
                <InfoRow
                  label="Starts"
                  value={`${formatDay(tournament.startsAt)} · ${formatTime(tournament.startsAt)}`}
                />
                <InfoRow label="Registration closes" value={formatDate(tournament.registrationCloses)} />
                <InfoRow label="Room reveal" value={formatDate(data.room.revealAt)} />
                {isBR && <InfoRow label="Matches" value={`${tournament.brMatches} battle royale matches`} />}
              </div>
            </div>

            {sameDayEvents.length > 0 && (
              <div className="panel p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
                    Also this day
                  </h2>
                  <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">
                    {formatDay(tournament.startsAt)}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {sameDayEvents.map((item) => (
                    <Link
                      key={item.id}
                      to={`/tournaments/${item.slug}`}
                      className="flex items-center gap-3 rounded-md border border-white/8 bg-white/2 px-3 py-2.5 transition hover:border-ember-500/40"
                    >
                      <span className="shrink-0 font-display text-sm font-extrabold text-ember-400">
                        {formatTime(item.startsAt)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
                        {item.title}
                      </span>
                      <Badge tone={item.status}>{statusLabel(item.status)}</Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
