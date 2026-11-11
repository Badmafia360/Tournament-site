import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useFetch } from '../hooks/useFetch.js';
import Bracket from '../components/Bracket.jsx';
import StandingsTable from '../components/StandingsTable.jsx';
import {
  Alert,
  Badge,
  EmptyState,
  PageLoader,
  Spinner,
  StatBox,
} from '../components/ui.jsx';
import {
  BANNERS,
  formatDate,
  formatLabel,
  formatMoney,
  modeLabel,
  statusLabel,
  toDateTimeInput,
} from '../lib/format.js';

const PLACEMENT_POINTS = [12, 9, 8, 7, 6, 5, 4, 3, 2, 1];

function registrationRowBusy(busy, id, action) {
  return busy === `reg-${id}-${action}`;
}

function RegistrationRow({ registration, onUpdate, busy }) {
  const [seed, setSeed] = useState(registration.seed ?? '');

  useEffect(() => {
    setSeed(registration.seed ?? '');
  }, [registration.seed]);

  const isApproved = registration.status === 'approved';
  const actionsBusy = [
    'approved',
    'waitlist',
    'rejected',
    'seed',
  ].some((action) => registrationRowBusy(busy, registration.id, action));

  return (
    <tr className="border-b border-white/5 align-top transition hover:bg-white/2">
      <td className="px-4 py-4">
        <p className="font-semibold text-white">{registration.teamName}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
          {registration.teamTag || 'NO TAG'} · {registration.memberCount} players
        </p>
        <p className="mt-0.5 text-[10px] text-zinc-600">
          C: {registration.captainName}
          {registration.captainUid ? ` · UID ${registration.captainUid}` : ''}
        </p>
      </td>
      <td className="px-4 py-4">
        <Badge tone={registration.status}>{statusLabel(registration.status)}</Badge>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            className="field w-20 px-2 py-1.5 text-center"
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            placeholder="—"
            aria-label={`Seed for ${registration.teamName}`}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={actionsBusy}
            onClick={() =>
              onUpdate(registration.id, {
                seed: seed === '' ? null : Number(seed),
              })
            }
          >
            {registrationRowBusy(busy, registration.id, 'seed') ? <Spinner className="h-3 w-3" /> : 'Save'}
          </button>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap justify-end gap-1.5">
          {!isApproved && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={actionsBusy}
              onClick={() => onUpdate(registration.id, { status: 'approved' })}
            >
              {registrationRowBusy(busy, registration.id, 'approved') ? <Spinner className="h-3 w-3" /> : 'Approve'}
            </button>
          )}
          {isApproved && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={actionsBusy}
              onClick={() => onUpdate(registration.id, { status: 'waitlist' })}
            >
              {registrationRowBusy(busy, registration.id, 'waitlist') ? <Spinner className="h-3 w-3" /> : 'Waitlist'}
            </button>
          )}
          {registration.status !== 'rejected' && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={actionsBusy}
              onClick={() => onUpdate(registration.id, { status: 'rejected' })}
            >
              {registrationRowBusy(busy, registration.id, 'rejected') ? <Spinner className="h-3 w-3" /> : 'Reject'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function MatchEditor({ match, onSave, busy }) {
  const [scoreA, setScoreA] = useState(match.scoreA ?? '');
  const [scoreB, setScoreB] = useState(match.scoreB ?? '');
  const bothTeams = match.teamA && match.teamB;

  useEffect(() => {
    setScoreA(match.scoreA ?? '');
    setScoreB(match.scoreB ?? '');
  }, [match.id, match.scoreA, match.scoreB, match.teamA?.id, match.teamB?.id]);

  const isBusy = busy === `match-${match.id}`;

  return (
    <div className="rounded-lg border border-white/8 bg-white/2 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">
          Match {match.position + 1} · Round {match.round}
        </span>
        <Badge tone={match.status === 'completed' ? 'completed' : match.status === 'ready' ? 'pending' : 'neutral'}>
          {match.status}
        </Badge>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className={`min-w-0 truncate text-sm ${match.winnerId === match.teamA?.id ? 'font-semibold text-ember-300' : 'text-zinc-300'}`}>
            {match.teamA?.name || 'TBD'}
          </span>
          <input
            type="number"
            min={0}
            className="field w-16 px-2 py-1.5 text-center"
            value={scoreA}
            onChange={(event) => setScoreA(event.target.value)}
            disabled={!bothTeams || isBusy}
            aria-label="Score team A"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={`min-w-0 truncate text-sm ${match.winnerId === match.teamB?.id ? 'font-semibold text-ember-300' : 'text-zinc-300'}`}>
            {match.teamB?.name || 'TBD'}
          </span>
          <input
            type="number"
            min={0}
            className="field w-16 px-2 py-1.5 text-center"
            value={scoreB}
            onChange={(event) => setScoreB(event.target.value)}
            disabled={!bothTeams || isBusy}
            aria-label="Score team B"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[10px] text-zinc-600">
          {match.winnerName ? `Winner: ${match.winnerName}` : bothTeams ? 'Enter scores to advance a winner' : 'Awaiting teams'}
        </span>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!bothTeams || isBusy}
          onClick={() => onSave(match.id, { scoreA: Number(scoreA), scoreB: Number(scoreB) })}
        >
          {isBusy ? <Spinner className="h-3 w-3" /> : match.status === 'completed' ? 'Update' : 'Save result'}
        </button>
      </div>
    </div>
  );
}

function BrResultsEditor({ data, onSave, busy }) {
  const [matchNumber, setMatchNumber] = useState(1);
  const [rows, setRows] = useState([]);
  const approved = data.approvedTeams || [];
  const matchNumbers = Array.from(
    { length: data.tournament.brMatches },
    (_, index) => index + 1,
  );

  useEffect(() => {
    const existing = data.brResults?.find((match) => match.matchNumber === matchNumber);
    setRows(
      approved.map((team, index) => {
        const result = existing?.results.find((row) => row.teamId === team.id);
        return {
          teamId: team.id,
          name: team.name,
          tag: team.tag,
          placement: result?.placement ?? index + 1,
          kills: result?.kills ?? 0,
        };
      }),
    );
  }, [matchNumber, data.brResults, data.approvedTeams]);

  function updateRow(teamId, field, value) {
    setRows((current) =>
      current.map((row) => (row.teamId === teamId ? { ...row, [field]: value } : row)),
    );
  }

  const isBusy = busy === 'br-results';
  const existingForMatch = data.brResults?.find((match) => match.matchNumber === matchNumber);

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
              Match results
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Enter placement and kills. Points calculate automatically: placement points + kills.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matchNumbers.map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setMatchNumber(number)}
                className={`h-9 w-9 rounded-md border text-xs font-bold transition ${
                  matchNumber === number
                    ? 'border-ember-500/50 bg-ember-500/15 text-ember-300'
                    : 'border-white/10 bg-white/3 text-zinc-400 hover:border-white/25'
                }`}
              >
                {number}
              </button>
            ))}
          </div>
        </div>

        {approved.length ? (
          <>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-left text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    <th className="px-3 py-2.5">Team</th>
                    <th className="px-3 py-2.5">Placement</th>
                    <th className="px-3 py-2.5">Kills</th>
                    <th className="px-3 py-2.5 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const placementPoints = PLACEMENT_POINTS[row.placement - 1] || 0;
                    const points = placementPoints + (Number(row.kills) || 0);
                    return (
                      <tr key={row.teamId} className="border-b border-white/5">
                        <td className="px-3 py-2.5">
                          <span className="font-medium text-white">{row.name}</span>
                          <span className="ml-2 text-[9px] uppercase tracking-wider text-zinc-600">{row.tag}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            className="field w-24 px-2 py-1.5"
                            value={row.placement}
                            onChange={(event) => updateRow(row.teamId, 'placement', Number(event.target.value))}
                            aria-label={`Placement for ${row.name}`}
                          >
                            {approved.map((_, index) => (
                              <option key={index + 1} value={index + 1}>#{index + 1}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min={0}
                            max={99}
                            className="field w-20 px-2 py-1.5 text-center"
                            value={row.kills}
                            onChange={(event) => updateRow(row.teamId, 'kills', Number(event.target.value))}
                            aria-label={`Kills for ${row.name}`}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right font-display text-lg font-bold text-ember-400">
                          {points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {existingForMatch && (
              <p className="mt-3 text-[10px] text-zinc-600">
                Match {matchNumber} results already published. Saving overwrites them.
              </p>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="btn btn-primary"
                disabled={isBusy}
                onClick={() =>
                  onSave(matchNumber, rows.map((row) => ({
                    teamId: row.teamId,
                    placement: Number(row.placement),
                    kills: Number(row.kills),
                  })))
                }
              >
                {isBusy ? <Spinner className="h-4 w-4" /> : `Publish match ${matchNumber} results`}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-5">
            <EmptyState
              icon="◇"
              title="No approved teams"
              description="Approve teams in the registrations tab before entering results."
            />
          </div>
        )}
      </div>

      <div className="panel p-6">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
          Live standings
        </h2>
        <div className="mt-4">
          <StandingsTable standings={data.standings} />
        </div>
      </div>
    </div>
  );
}

export default function AdminTournament() {
  const { id } = useParams();
  const { data, loading, error, refresh } = useFetch(`/tournaments/${id}`);
  const [tab, setTab] = useState('settings');
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState('');
  const [announcement, setAnnouncement] = useState({ title: '', body: '' });

  useEffect(() => {
    if (data?.tournament && (!form || String(form.id) !== String(data.tournament.id))) {
      setForm({
        ...data.tournament,
        startsAt: toDateTimeInput(data.tournament.startsAt),
        registrationCloses: toDateTimeInput(data.tournament.registrationCloses),
        slots: String(data.tournament.slots),
        entryFee: String(data.tournament.entryFee),
        prizePool: String(data.tournament.prizePool),
        roomRevealMinutes: String(data.tournament.roomRevealMinutes),
        brMatches: String(data.tournament.brMatches),
      });
    }
  }, [data, form]);

  useEffect(() => {
    setNotice(null);
    setTab('settings');
  }, [id]);

  if (loading) return <PageLoader label="Loading console…" />;
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Alert type="error">{error}</Alert>
        <Link to="/admin" className="btn btn-ghost mt-4">Back to console</Link>
      </div>
    );
  }
  if (!data?.canManage) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Alert type="error">You do not have permission to manage this tournament.</Alert>
        <Link to="/admin" className="btn btn-ghost mt-4">Back to console</Link>
      </div>
    );
  }

  const tournament = data.tournament;
  const approved = data.approvedTeams?.length || 0;
  const pending = (data.registrations || []).filter((row) => row.status === 'pending').length;
  const isBR = tournament.format === 'battle_royale';

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    setBusy('settings');
    setNotice(null);
    try {
      await api.patch(`/tournaments/${tournament.id}`, {
        title: form.title,
        description: form.description,
        format: form.format,
        mode: form.mode,
        status: form.status,
        slots: Number(form.slots),
        entryFee: Number(form.entryFee),
        prizePool: Number(form.prizePool),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        registrationCloses: form.registrationCloses
          ? new Date(form.registrationCloses).toISOString()
          : null,
        roomId: form.roomId,
        roomPassword: form.roomPassword,
        roomRevealMinutes: Number(form.roomRevealMinutes),
        brMatches: Number(form.brMatches),
        banner: form.banner,
        rules: form.rules,
      });
      setNotice({ type: 'success', text: 'Tournament settings saved.' });
      refresh();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  async function quickStatus(status) {
    setBusy(`status-${status}`);
    setNotice(null);
    try {
      await api.patch(`/tournaments/${tournament.id}`, { status });
      setNotice({ type: 'success', text: `Tournament marked as ${statusLabel(status)}.` });
      refresh();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  async function updateRegistration(registrationId, patch) {
    setBusy(`reg-${registrationId}-${patch.status || 'seed'}`);
    setNotice(null);
    try {
      await api.patch(`/registrations/${registrationId}`, patch);
      setNotice({ type: 'success', text: 'Registration updated.' });
      refresh();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  async function generateBracket() {
    const confirmed = window.confirm(
      data.bracket?.length
        ? 'Regenerate the bracket? All existing match results will be deleted.'
        : 'Generate the bracket from approved teams and their seeds?',
    );
    if (!confirmed) return;

    setBusy('bracket');
    setNotice(null);
    try {
      await api.post(`/tournaments/${tournament.id}/bracket`);
      setNotice({ type: 'success', text: 'Bracket generated. Seed order was applied.' });
      refresh();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  async function saveMatch(matchId, scores) {
    setBusy(`match-${matchId}`);
    setNotice(null);
    try {
      await api.patch(`/matches/${matchId}`, scores);
      setNotice({ type: 'success', text: 'Match result saved and winner advanced.' });
      refresh();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  async function saveBrResults(matchNumber, results) {
    setBusy('br-results');
    setNotice(null);
    try {
      await api.post(`/tournaments/${tournament.id}/br-results`, {
        matchNumber,
        results,
      });
      setNotice({ type: 'success', text: `Match ${matchNumber} results published.` });
      refresh();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  async function addAnnouncement(event) {
    event.preventDefault();
    setBusy('announcement');
    setNotice(null);
    try {
      await api.post(`/tournaments/${tournament.id}/announcements`, announcement);
      setAnnouncement({ title: '', body: '' });
      setNotice({ type: 'success', text: 'Announcement published.' });
      refresh();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  async function deleteAnnouncement(announcementId) {
    if (!window.confirm('Delete this announcement?')) return;
    setBusy(`announcement-${announcementId}`);
    setNotice(null);
    try {
      await api.delete(`/tournaments/${tournament.id}/announcements/${announcementId}`);
      setNotice({ type: 'success', text: 'Announcement deleted.' });
      refresh();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  const tabs = [
    { key: 'settings', label: 'Settings' },
    { key: 'registrations', label: `Registrations${pending ? ` (${pending})` : ''}` },
    { key: 'competition', label: isBR ? 'Results & standings' : 'Bracket & results' },
    { key: 'announcements', label: 'Announcements' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link to="/admin" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-ember-300">
        ← Back to console
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tournament.status} dot>{statusLabel(tournament.status)}</Badge>
            <Badge tone="ember">{formatLabel(tournament.format)}</Badge>
            <Badge tone="neutral">{modeLabel(tournament.mode)}</Badge>
          </div>
          <h1 className="mt-2 font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-white sm:text-5xl">
            {tournament.title}
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
            {formatDate(tournament.startsAt)} · {approved}/{tournament.slots} teams · {formatMoney(tournament.prizePool)} prize
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/tournaments/${tournament.slug}`} className="btn btn-ghost">
            View public page
          </Link>
          <div className="flex gap-1 rounded-lg border border-white/8 bg-white/3 p-1">
            {[
              ['registration', 'Open'],
              ['live', 'Live'],
              ['completed', 'Complete'],
            ].map(([status, label]) => (
              <button
                key={status}
                type="button"
                disabled={tournament.status === status || busy === `status-${status}`}
                onClick={() => quickStatus(status)}
                className="rounded-md px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400 transition hover:bg-white/7 hover:text-white disabled:opacity-40"
              >
                {busy === `status-${status}` ? <Spinner className="h-3 w-3" /> : label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {notice && (
        <Alert type={notice.type} className="mt-5" onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBox label="Approved" value={`${approved}/${tournament.slots}`} hint="Teams locked in" />
        <StatBox label="Pending" value={pending} hint="Awaiting review" accent={pending > 0} />
        <StatBox label="Prize pool" value={formatMoney(tournament.prizePool)} hint={`Entry ${formatMoney(tournament.entryFee)}`} />
        <StatBox label="Room reveal" value={`${tournament.roomRevealMinutes}m`} hint="Before lobby start" />
      </div>

      <div className="no-scrollbar mt-7 flex gap-1 overflow-x-auto border-b border-white/6 pb-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`shrink-0 rounded-md px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
              tab === item.key
                ? 'bg-ember-500/10 text-ember-300'
                : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'settings' && form && (
          <form onSubmit={saveSettings} className="panel p-6">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
              Event settings
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Changes go live immediately. Format cannot change after results exist.
            </p>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="label" htmlFor="title">Title</label>
                <input
                  id="title"
                  className="field"
                  required
                  value={form.title || ''}
                  onChange={(event) => update('title', event.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="description">Description</label>
                <textarea
                  id="description"
                  className="field min-h-[80px] resize-y"
                  value={form.description || ''}
                  onChange={(event) => update('description', event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="format">Format</label>
                  <select id="format" className="field" value={form.format} onChange={(event) => update('format', event.target.value)}>
                    <option value="single_elim">Single elimination</option>
                    <option value="battle_royale">Battle royale</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="mode">Mode</label>
                  <select id="mode" className="field" value={form.mode} onChange={(event) => update('mode', event.target.value)}>
                    <option value="squad">Squad</option>
                    <option value="duo">Duo</option>
                    <option value="solo">Solo</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="status">Status</label>
                  <select id="status" className="field" value={form.status} onChange={(event) => update('status', event.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="registration">Registration open</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="slots">Slots</label>
                  <input id="slots" type="number" min={2} max={128} className="field" value={form.slots} onChange={(event) => update('slots', event.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="prizePool">Prize pool (₹)</label>
                  <input id="prizePool" type="number" min={0} className="field" value={form.prizePool} onChange={(event) => update('prizePool', event.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="entryFee">Entry fee (₹)</label>
                  <input id="entryFee" type="number" min={0} className="field" value={form.entryFee} onChange={(event) => update('entryFee', event.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="startsAt">Lobby starts</label>
                  <input id="startsAt" type="datetime-local" className="field" value={form.startsAt} onChange={(event) => update('startsAt', event.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="registrationCloses">Registration closes</label>
                  <input id="registrationCloses" type="datetime-local" className="field" value={form.registrationCloses} onChange={(event) => update('registrationCloses', event.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="roomId">Room ID</label>
                  <input id="roomId" className="field font-mono" value={form.roomId || ''} onChange={(event) => update('roomId', event.target.value)} placeholder="Set when ready" />
                </div>
                <div>
                  <label className="label" htmlFor="roomPassword">Room password</label>
                  <input id="roomPassword" className="field font-mono" value={form.roomPassword || ''} onChange={(event) => update('roomPassword', event.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="roomRevealMinutes">Reveal (minutes before)</label>
                  <input id="roomRevealMinutes" type="number" min={0} max={1440} className="field" value={form.roomRevealMinutes} onChange={(event) => update('roomRevealMinutes', event.target.value)} />
                </div>
                {form.format === 'battle_royale' && (
                  <div>
                    <label className="label" htmlFor="brMatches">BR matches</label>
                    <input id="brMatches" type="number" min={1} max={12} className="field" value={form.brMatches} onChange={(event) => update('brMatches', event.target.value)} />
                  </div>
                )}
                <div>
                  <label className="label" htmlFor="banner">Banner</label>
                  <select id="banner" className="field" value={form.banner} onChange={(event) => update('banner', event.target.value)}>
                    {Object.entries(BANNERS).map(([key, banner]) => (
                      <option key={key} value={key}>{banner.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="rules">Rules</label>
                <textarea id="rules" className="field min-h-[140px] resize-y" value={form.rules || ''} onChange={(event) => update('rules', event.target.value)} />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button type="submit" className="btn btn-primary" disabled={busy === 'settings'}>
                {busy === 'settings' ? <Spinner className="h-4 w-4" /> : 'Save settings'}
              </button>
            </div>
          </form>
        )}

        {tab === 'registrations' && (
          <div className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-5 py-4">
              <div>
                <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                  Registrations
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Approve teams, set seeds, and manage the waitlist. Seed lower numbers first.
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                {data.registrations?.length || 0} entries
              </span>
            </div>

            {data.registrations?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-left text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                      <th className="px-4 py-3">Team</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Seed</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.registrations.map((registration) => (
                      <RegistrationRow
                        key={registration.id}
                        registration={registration}
                        onUpdate={updateRegistration}
                        busy={busy}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5">
                <EmptyState
                  icon="◇"
                  title="No registrations yet"
                  description="Share the public tournament page with your community to start filling slots."
                />
              </div>
            )}
          </div>
        )}

        {tab === 'competition' && (
          <div className="space-y-6">
            {isBR ? (
              <BrResultsEditor data={data} onSave={saveBrResults} busy={busy} />
            ) : (
              <>
                <div className="panel p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                        Bracket
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        {approved} approved teams. Generate or regenerate the seeded bracket from registrations.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={generateBracket}
                      disabled={busy === 'bracket'}
                    >
                      {busy === 'bracket' ? <Spinner className="h-4 w-4" /> : data.bracket?.length ? 'Regenerate bracket' : 'Generate bracket'}
                    </button>
                  </div>
                  <div className="mt-5">
                    <Bracket matches={data.bracket} champion={data.champion} />
                  </div>
                </div>

                <div className="panel p-6">
                  <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                    Report results
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Enter the series score. The higher score wins and advances automatically.
                  </p>

                  {data.bracket?.length ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {data.bracket.map((match) => (
                        <MatchEditor key={match.id} match={match} onSave={saveMatch} busy={busy} />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <EmptyState
                        icon="⌁"
                        title="No bracket yet"
                        description="Generate the bracket above before reporting results."
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'announcements' && (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <form onSubmit={addAnnouncement} className="panel h-fit p-6">
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                New announcement
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="label" htmlFor="announcementTitle">Title</label>
                  <input
                    id="announcementTitle"
                    className="field"
                    required
                    value={announcement.title}
                    onChange={(event) => setAnnouncement((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Check-in is now open"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="announcementBody">Message</label>
                  <textarea
                    id="announcementBody"
                    className="field min-h-[120px] resize-y"
                    required
                    value={announcement.body}
                    onChange={(event) => setAnnouncement((current) => ({ ...current, body: event.target.value }))}
                    placeholder="Captains must check in before 7:30 PM IST."
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={busy === 'announcement'}>
                  {busy === 'announcement' ? <Spinner className="h-4 w-4" /> : 'Publish announcement'}
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {data.announcements?.length ? (
                data.announcements.map((item) => (
                  <div key={item.id} className="panel p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-xl font-bold uppercase tracking-wide text-white">
                          {item.title}
                        </h3>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={busy === `announcement-${item.id}`}
                        onClick={() => deleteAnnouncement(item.id)}
                      >
                        {busy === `announcement-${item.id}` ? <Spinner className="h-3 w-3" /> : 'Delete'}
                      </button>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                      {item.body}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon="✎"
                  title="No announcements"
                  description="Publish check-in reminders, room updates, or dispute notes for your teams."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
