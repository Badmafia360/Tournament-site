import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../AuthContext.jsx';
import TournamentCard from '../components/TournamentCard.jsx';
import { Countdown } from '../components/Countdown.jsx';
import {
  Alert,
  Badge,
  SectionHeading,
  SkeletonCards,
  StatBox,
} from '../components/ui.jsx';
import {
  bannerFor,
  formatCountdown,
  formatDate,
  formatMoney,
  modeLabel,
} from '../lib/format.js';
import { countdownParts } from '../lib/format.js';

export default function Home() {
  const { user } = useAuth();
  const { data: statsData, error: statsError } = useFetch('/stats');
  const { data, loading, error } = useFetch('/tournaments');

  const tournaments = data?.tournaments || [];
  const live = tournaments.filter((t) => t.status === 'live');
  const open = tournaments.filter((t) => t.status === 'registration');
  const featured = [...live, ...open].slice(0, 3);
  const spotlight = live[0] || open[0];
  const spotlightBanner = bannerFor(spotlight?.banner);
  const stats = statsData || {};

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/6">
        <div className="absolute inset-0 grid-glow opacity-40" />
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-ember-500/15 blur-[110px]" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-neon-400/10 blur-[100px]" />
        <div className="absolute right-[12%] top-16 hidden h-64 w-64 rounded-full border border-white/5 lg:block" />
        <div className="absolute right-[14%] top-20 hidden h-56 w-56 rounded-full border border-ember-500/10 lg:block" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div className="animate-rise">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="registration" dot>
                Season 4 registration open
              </Badge>
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                Squad · Duo · Solo
              </span>
            </div>

            <h1 className="mt-5 font-display text-6xl font-extrabold uppercase leading-[0.88] tracking-tight text-white sm:text-7xl lg:text-8xl">
              Enter
              <br />
              the <span className="italic text-ember-500 text-glow">arena</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400">
              Register your squad, lock your slot, and fight through live brackets for
              real prize pools. One platform for players, captains, and organizers.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/tournaments" className="btn btn-primary px-6 py-3">
                Browse tournaments
              </Link>
              <Link
                to={user ? '/dashboard' : '/register'}
                className="btn btn-ghost px-6 py-3"
              >
                {user ? 'Go to dashboard' : 'Create your team'}
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Players', stats.players],
                ['Teams', stats.teams],
                ['Events', stats.tournaments],
                ['Prize pool', stats.prizePool != null ? formatMoney(stats.prizePool) : null],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="font-display text-2xl font-extrabold text-white">
                    {value ?? '—'}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-rise lg:pl-4" style={{ animationDelay: '120ms' }}>
            {spotlight ? (
              <div className="panel relative overflow-hidden p-1">
                <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${spotlightBanner.className} p-6`}>
                  <div className="absolute inset-0 grid-glow opacity-50" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <Badge tone={spotlight.status} dot>
                        {spotlight.status === 'live' ? 'Live now' : 'Open for registration'}
                      </Badge>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                        {modeLabel(spotlight.mode)}
                      </span>
                    </div>
                    <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.26em] text-white/60">
                      {spotlight.status === 'live' ? 'On the main stage' : 'Next up'}
                    </p>
                    <h2 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-wide text-white">
                      {spotlight.title}
                    </h2>
                    <div className="mt-5 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">
                          Prize pool
                        </p>
                        <p className="font-display text-2xl font-extrabold text-white">
                          {formatMoney(spotlight.prizePool)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">
                          Starts
                        </p>
                        <p className="text-sm font-semibold text-white">
                          {formatDate(spotlight.startsAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="live-dot" />
                    <Countdown
                      target={spotlight.startsAt}
                      prefix={spotlight.status === 'live' ? 'Lobby in ' : 'Starts in '}
                      compact
                    />
                  </div>
                  <Link
                    to={`/tournaments/${spotlight.slug}`}
                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-ember-400 hover:text-ember-300"
                  >
                    View event →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="panel p-8 text-center text-sm text-zinc-500">
                The next event is being prepared.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          kicker="Live & open"
          title="Tournaments on the board"
          description="Lock in with your squad or watch the bracket unfold. Every event has published rules, seeded teams, and transparent standings."
          action={
            <Link to="/tournaments" className="btn btn-ghost btn-sm">
              All tournaments →
            </Link>
          }
        />

        {error && <Alert type="error" className="mt-6">{error}</Alert>}
        {statsError && <Alert type="error" className="mt-6">{statsError}</Alert>}

        <div className="mt-8">
          {loading ? (
            <SkeletonCards />
          ) : featured.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featured.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <div className="panel p-10 text-center text-sm text-zinc-500">
              No tournaments are open right now. Follow the arena for the next drop.
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-white/6 bg-ink-900/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeading
            kicker="How it works"
            title="From squad to stage in three steps"
            description="No spreadsheets, no DM screenshots for brackets, no guessing who advanced."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Build your squad',
                body: 'Create a team, share the invite code, and get your roster together. Your Free Fire UID stays linked to your profile.',
              },
              {
                step: '02',
                title: 'Lock your slot',
                body: 'Pick a tournament, register your team, and wait for organizer approval. Seeding is published before the bracket goes live.',
              },
              {
                step: '03',
                title: 'Fight for the crown',
                body: 'Room ID and password unlock shortly before start. Follow live brackets, standings, and announcements in one place.',
              },
            ].map((item) => (
              <div key={item.step} className="panel panel-hover relative overflow-hidden p-6">
                <span className="absolute right-4 top-2 font-display text-6xl font-extrabold italic text-white/4">
                  {item.step}
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-ember-500/30 bg-ember-500/10 font-display text-sm font-bold text-ember-400">
                  {item.step}
                </span>
                <h3 className="mt-5 font-display text-2xl font-bold uppercase tracking-wide text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <SectionHeading
              kicker="Battle royale scoring"
              title="Every kill matters"
              description="Placement points plus one point per kill. Ties break by total kills, then best placement. The same ruleset organizers use in the console."
            />
            <div className="mt-8 flex flex-wrap gap-2">
              {[12, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((points, index) => (
                <div
                  key={index}
                  className="w-[72px] rounded-lg border border-white/8 bg-ink-900 px-3 py-3 text-center"
                >
                  <p className="font-display text-2xl font-extrabold text-ember-400">{points}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    #{index + 1}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              Kill = <span className="font-semibold text-zinc-300">1 point</span>. Placement
              points shown for positions 1–10.
            </p>
          </div>

          <div className="panel relative overflow-hidden p-8">
            <div className="absolute inset-0 grid-glow opacity-30" />
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ember-500/10 blur-3xl" />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ember-500">
                For organizers
              </p>
              <h3 className="mt-2 font-display text-4xl font-extrabold uppercase leading-none tracking-wide text-white">
                Run the whole event
                <br />
                from one console
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-zinc-400">
                {[
                  'Create brackets and battle royale events in minutes',
                  'Approve registrations and publish seeds',
                  'Auto-calculated standings from placement + kills',
                  'Room credentials revealed only to approved squads',
                  'Announcements, disputes, and recovery built in',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 text-ember-500">▸</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={user ? '/admin' : '/register'} className="btn btn-primary">
                  {user && ['organizer', 'admin'].includes(user.role)
                    ? 'Open organizer console'
                    : 'Become an organizer'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-ember-500/25 bg-gradient-to-br from-ember-600/20 via-ink-900 to-ink-950 px-6 py-12 text-center sm:px-12">
          <div className="absolute inset-0 grid-glow opacity-30" />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ember-400">
              The lobby is filling
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold uppercase tracking-wide text-white sm:text-5xl">
              Your squad's next run starts here
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
              {user
                ? 'Your dashboard has your teams, registrations, and upcoming lobbies ready.'
                : 'Create a free account, build your squad, and claim a slot in the next event.'}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to={user ? '/dashboard' : '/register'} className="btn btn-primary px-6 py-3">
                {user ? 'Open dashboard' : 'Join for free'}
              </Link>
              <Link to="/tournaments" className="btn btn-ghost px-6 py-3">
                See what's live
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
