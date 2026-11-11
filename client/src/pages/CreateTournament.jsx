import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Alert, Badge, Spinner } from '../components/ui.jsx';
import {
  BANNERS,
  dayKey,
  defaultStartInput,
  entryLabel,
  formatDayShort,
  formatMoney,
  formatLabel,
  formatTime,
  modeLabel,
} from '../lib/format.js';

const INITIAL = {
  title: '',
  description: '',
  format: 'single_elim',
  mode: 'squad',
  slots: 16,
  entryFee: 0,
  prizePool: 10000,
  startsAt: defaultStartInput(),
  registrationCloses: '',
  rules: '',
  banner: 'ember',
  brMatches: 4,
  roomId: '',
  roomPassword: '',
  roomRevealMinutes: 15,
  status: 'registration',
};

const STEPS = [
  { key: 'basics', label: 'Basics', hint: 'Title, format, mode' },
  { key: 'schedule', label: 'Schedule & money', hint: 'Date, slots, prize' },
  { key: 'room', label: 'Room & branding', hint: 'Credentials, banner, rules' },
  { key: 'review', label: 'Review', hint: 'Check and create' },
];

export default function CreateTournament() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const startsKey = dayKey(form.startsAt ? new Date(form.startsAt).toISOString() : null);
  const tzOffset = useMemo(() => new Date().getTimezoneOffset(), []);
  const { data: dayData } = useFetch(
    startsKey ? `/tournaments?date=${startsKey}&tz=${tzOffset}` : null,
    { deps: [startsKey, tzOffset] },
  );
  const sameDayCount = (dayData?.tournaments || []).length;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validateStep(index) {
    if (index === 0) {
      if (form.title.trim().length < 3) return 'Tournament title must be at least 3 characters.';
    }
    if (index === 1) {
      const slots = Number(form.slots);
      if (!Number.isFinite(slots) || slots < 2 || slots > 128) {
        return 'Slots must be between 2 and 128.';
      }
      if (form.startsAt && form.registrationCloses) {
        if (new Date(form.registrationCloses) >= new Date(form.startsAt)) {
          return 'Registration must close before the lobby starts.';
        }
      }
      if (form.startsAt && new Date(form.startsAt).getTime() < Date.now() - 86_400_000) {
        return 'Lobby start cannot be more than a day in the past.';
      }
    }
    return '';
  }

  function goNext() {
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  }

  function goBack() {
    setError('');
    setStep((current) => Math.max(0, current - 1));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    for (let index = 0; index < STEPS.length - 1; index += 1) {
      const problem = validateStep(index);
      if (problem) {
        setError(problem);
        setStep(index);
        return;
      }
    }
    setError('');
    setBusy(true);
    try {
      const payload = {
        ...form,
        slots: Number(form.slots),
        entryFee: Number(form.entryFee),
        prizePool: Number(form.prizePool),
        brMatches: Number(form.brMatches),
        roomRevealMinutes: Number(form.roomRevealMinutes),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        registrationCloses: form.registrationCloses
          ? new Date(form.registrationCloses).toISOString()
          : null,
      };
      const response = await api.post('/tournaments', payload);
      navigate(`/admin/tournaments/${response.tournament.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const summaryRows = [
    ['Format', formatLabel(form.format)],
    ['Mode', modeLabel(form.mode)],
    ['Slots', `${form.slots} teams`],
    ['Prize pool', formatMoney(form.prizePool)],
    ['Entry', entryLabel(form.entryFee)],
    [
      'Lobby starts',
      form.startsAt
        ? `${formatDayShort(startsKey)} · ${formatTime(new Date(form.startsAt).toISOString())}`
        : 'TBA',
    ],
    [
      'Registration closes',
      form.registrationCloses
        ? formatDayShort(dayKey(new Date(form.registrationCloses).toISOString()))
        : 'No deadline',
    ],
    ...(form.format === 'battle_royale'
      ? [['Matches', `${form.brMatches} BR matches`]]
      : []),
    ['Visibility', form.status === 'draft' ? 'Draft (hidden)' : 'Open registration'],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link to="/admin" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-ember-300">
        ← Back to console
      </Link>

      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ember-500">
          {user.role === 'admin' ? 'Admin' : 'Organizer'} · New event
        </p>
        <h1 className="mt-1 font-display text-5xl font-extrabold uppercase tracking-tight text-white">
          Create tournament
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Four short steps. You can edit everything later from the organizer console.
        </p>
      </div>

      {/* Step indicator */}
      <ol className="mt-8 flex flex-wrap gap-2">
        {STEPS.map((item, index) => {
          const state = index < step ? 'done' : index === step ? 'active' : 'todo';
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => {
                  if (index < step) {
                    setError('');
                    setStep(index);
                  }
                }}
                disabled={index > step}
                className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-left transition ${
                  state === 'active'
                    ? 'border-ember-500/50 bg-ember-500/10'
                    : state === 'done'
                      ? 'border-white/12 bg-white/3 hover:border-white/25'
                      : 'border-white/8 bg-white/2 opacity-60'
                } ${index < step ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    state === 'active'
                      ? 'bg-ember-500 text-black'
                      : state === 'done'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-white/10 text-zinc-500'
                  }`}
                >
                  {state === 'done' ? '✓' : index + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-[10px] font-bold uppercase tracking-[0.14em] ${
                      state === 'active' ? 'text-ember-300' : 'text-zinc-300'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="block text-[9px] uppercase tracking-wider text-zinc-600">
                    {item.hint}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          {step === 0 && (
            <section className="panel p-6">
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                The basics
              </h2>

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="label" htmlFor="title">Tournament title</label>
                  <input
                    id="title"
                    className="field"
                    required
                    minLength={3}
                    maxLength={80}
                    value={form.title}
                    onChange={(event) => update('title', event.target.value)}
                    placeholder="Ember Cup Season 5"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    className="field min-h-[90px] resize-y"
                    value={form.description}
                    onChange={(event) => update('description', event.target.value)}
                    placeholder="What makes this event worth entering?"
                  />
                </div>

                <div>
                  <span className="label">Format</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        value: 'single_elim',
                        title: 'Single elimination',
                        body: 'Seeded bracket. Winners advance automatically until a champion is crowned.',
                      },
                      {
                        value: 'battle_royale',
                        title: 'Battle royale',
                        body: 'Points across multiple matches. Placement + kills decide the standings.',
                      },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => update('format', option.value)}
                        className={`rounded-xl border p-4 text-left transition ${
                          form.format === option.value
                            ? 'border-ember-500/50 bg-ember-500/10'
                            : 'border-white/10 bg-white/2 hover:border-white/20'
                        }`}
                      >
                        <p className={`font-display text-lg font-bold uppercase tracking-wide ${form.format === option.value ? 'text-ember-300' : 'text-white'}`}>
                          {formatLabel(option.value)}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{option.body}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="label" htmlFor="mode">Mode</label>
                    <select id="mode" className="field" value={form.mode} onChange={(event) => update('mode', event.target.value)}>
                      {['squad', 'duo', 'solo'].map((mode) => (
                        <option key={mode} value={mode}>{modeLabel(mode)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="status">Visibility</label>
                    <select id="status" className="field" value={form.status} onChange={(event) => update('status', event.target.value)}>
                      <option value="registration">Open registration</option>
                      <option value="draft">Draft (hidden)</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="panel p-6">
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                Schedule & money
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="prizePool">Prize pool (₹)</label>
                  <input
                    id="prizePool"
                    type="number"
                    min={0}
                    className="field"
                    value={form.prizePool}
                    onChange={(event) => update('prizePool', event.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="entryFee">Entry fee (₹)</label>
                  <input
                    id="entryFee"
                    type="number"
                    min={0}
                    className="field"
                    value={form.entryFee}
                    onChange={(event) => update('entryFee', event.target.value)}
                  />
                  <p className="mt-1 text-[10px] text-zinc-600">Set 0 for a free event.</p>
                </div>

                <div>
                  <label className="label" htmlFor="slots">Slots (teams)</label>
                  <input
                    id="slots"
                    type="number"
                    min={2}
                    max={128}
                    className="field"
                    value={form.slots}
                    onChange={(event) => update('slots', event.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="roomRevealMinutes">Room reveal (minutes before start)</label>
                  <input
                    id="roomRevealMinutes"
                    type="number"
                    min={0}
                    max={1440}
                    className="field"
                    value={form.roomRevealMinutes}
                    onChange={(event) => update('roomRevealMinutes', event.target.value)}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="startsAt">Lobby starts</label>
                  <input
                    id="startsAt"
                    type="datetime-local"
                    className="field"
                    value={form.startsAt}
                    onChange={(event) => update('startsAt', event.target.value)}
                  />
                  {startsKey && (
                    <p className="mt-1.5 text-[10px] uppercase tracking-wider text-zinc-600">
                      {sameDayCount > 0 ? (
                        <span className="text-ember-400">
                          ★ {sameDayCount} {sameDayCount === 1 ? 'event' : 'events'} already on{' '}
                          {formatDayShort(startsKey)} — they will share the day schedule
                        </span>
                      ) : (
                        <>No other events on {formatDayShort(startsKey)} yet</>
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="registrationCloses">Registration closes</label>
                  <input
                    id="registrationCloses"
                    type="datetime-local"
                    className="field"
                    value={form.registrationCloses}
                    onChange={(event) => update('registrationCloses', event.target.value)}
                  />
                </div>

                {form.format === 'battle_royale' && (
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="brMatches">Number of matches</label>
                    <input
                      id="brMatches"
                      type="number"
                      min={1}
                      max={12}
                      className="field sm:max-w-[200px]"
                      value={form.brMatches}
                      onChange={(event) => update('brMatches', event.target.value)}
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="panel p-6">
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                Room & branding
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="roomId">Room ID <span className="text-zinc-600">(optional)</span></label>
                  <input
                    id="roomId"
                    className="field font-mono"
                    value={form.roomId}
                    onChange={(event) => update('roomId', event.target.value)}
                    placeholder="EMBR2048"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="roomPassword">Room password</label>
                  <input
                    id="roomPassword"
                    className="field font-mono"
                    value={form.roomPassword}
                    onChange={(event) => update('roomPassword', event.target.value)}
                    placeholder="EMBER4"
                  />
                </div>
                <div className="sm:col-span-2">
                  <span className="label">Event banner</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Object.entries(BANNERS).map(([key, banner]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => update('banner', key)}
                        className={`relative h-16 overflow-hidden rounded-lg border bg-gradient-to-br ${banner.className} ${
                          form.banner === key ? 'border-white/70 ring-2 ring-ember-500/40' : 'border-white/10'
                        }`}
                      >
                        <span className="absolute inset-0 grid-glow opacity-50" />
                        <span className="relative text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                          {banner.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="rules">Rules & format notes</label>
                  <textarea
                    id="rules"
                    className="field min-h-[130px] resize-y"
                    value={form.rules}
                    onChange={(event) => update('rules', event.target.value)}
                    placeholder={'1. Squad mode, mobile devices only.\n2. Check in 30 minutes before start.\n3. ...'}
                  />
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="panel p-6">
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                Review & create
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Check the summary. Everything can be edited later from the console.
              </p>

              <div className="mt-5 rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
                  {form.title || 'Untitled event'}
                </p>
                {form.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{form.description}</p>
                )}
                <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {summaryRows.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-3 border-b border-white/5 py-1.5 text-sm"
                    >
                      <span className="text-zinc-500">{label}</span>
                      <span className="text-right font-medium text-zinc-200">{value}</span>
                    </div>
                  ))}
                </div>
                {form.rules && (
                  <div className="mt-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">Rules</p>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                      {form.rules}
                    </p>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="ember">{formatLabel(form.format)}</Badge>
                  <Badge tone="neutral">{modeLabel(form.mode)}</Badge>
                  <Badge tone={form.status === 'draft' ? 'draft' : 'registration'}>
                    {form.status === 'draft' ? 'Draft' : 'Open registration'}
                  </Badge>
                </div>
              </div>
            </section>
          )}

          {error && <Alert type="error">{error}</Alert>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {step > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={goBack}>
                ← Back
              </button>
            ) : (
              <Link to="/admin" className="btn btn-ghost">Cancel</Link>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn btn-primary px-8 py-3" onClick={goNext}>
                Next →
              </button>
            ) : (
              <button type="submit" className="btn btn-primary px-8 py-3" disabled={busy}>
                {busy ? <Spinner className="h-4 w-4" /> : 'Create tournament'}
              </button>
            )}
          </div>
        </div>

        {/* Live summary rail */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="panel p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ember-500">
              Live summary
            </p>
            <p className="mt-2 font-display text-lg font-extrabold uppercase leading-tight tracking-wide text-white">
              {form.title || 'Untitled event'}
            </p>
            <div className="mt-3 space-y-1.5">
              {summaryRows.slice(0, 6).map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-zinc-500">{label}</span>
                  <span className="text-right font-medium text-zinc-300">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/6 pt-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
                Step {step + 1} of {STEPS.length}: {STEPS[step].label}
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
