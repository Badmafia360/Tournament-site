import { roundLabel } from '../lib/format.js';
import { EmptyState } from './ui.jsx';

function TeamRow({ team, score, winner, placeholder = 'TBD' }) {
  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 text-sm ${
        winner ? 'text-ember-300' : team ? 'text-zinc-200' : 'text-zinc-600'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            winner ? 'bg-ember-400' : team ? 'bg-zinc-600' : 'bg-zinc-800'
          }`}
        />
        <span className="truncate font-medium">{team ? team.name : placeholder}</span>
        {team?.tag && (
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
            {team.tag}
          </span>
        )}
      </div>
      <span className={`font-display text-lg font-bold ${winner ? 'text-ember-300' : 'text-zinc-400'}`}>
        {score ?? '–'}
      </span>
    </div>
  );
}

export default function Bracket({ matches, champion }) {
  if (!matches?.length) {
    return (
      <EmptyState
        icon="⌁"
        title="Bracket not seeded"
        description="The organizer has not published the bracket yet. Check back after registrations close."
      />
    );
  }

  const rounds = [...new Set(matches.map((match) => match.round))].sort((a, b) => a - b);
  const totalRounds = rounds.length;

  return (
    <div className="space-y-5">
      {champion && (
        <div className="relative overflow-hidden rounded-xl border border-ember-500/30 bg-gradient-to-r from-ember-500/15 via-ember-500/5 to-transparent px-5 py-4">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 font-display text-5xl italic text-ember-500/10">
            🏆
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ember-500">Champion</p>
          <p className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
            {champion.name}
          </p>
        </div>
      )}

      <div className="overflow-x-auto pb-2 no-scrollbar">
        <div className="flex min-w-max items-start gap-4">
          {rounds.map((round) => {
            const roundMatches = matches
              .filter((match) => match.round === round)
              .sort((a, b) => a.position - b.position);
            return (
              <div key={round} className="w-[250px] shrink-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                    {roundLabel(round, totalRounds)}
                  </span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>
                <div className="space-y-3">
                  {roundMatches.map((match) => (
                    <div
                      key={match.id}
                      className={`overflow-hidden rounded-lg border bg-ink-850/90 ${
                        match.status === 'ready'
                          ? 'border-ember-500/25'
                          : match.status === 'completed'
                            ? 'border-white/10'
                            : 'border-white/5'
                      }`}
                    >
                      <TeamRow
                        team={match.teamA}
                        score={match.scoreA}
                        winner={match.winnerId && match.winnerId === match.teamA?.id}
                        placeholder={match.status === 'pending' ? 'TBD' : 'BYE'}
                      />
                      <div className="h-px bg-white/5" />
                      <TeamRow
                        team={match.teamB}
                        score={match.scoreB}
                        winner={match.winnerId && match.winnerId === match.teamB?.id}
                        placeholder={match.status === 'pending' ? 'TBD' : 'BYE'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
