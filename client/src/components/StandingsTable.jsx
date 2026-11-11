import { EmptyState } from './ui.jsx';

export default function StandingsTable({ standings, compact = false }) {
  if (!standings?.length) {
    return (
      <EmptyState
        icon="▤"
        title="No results yet"
        description="Standings will appear as soon as the organizer publishes match results."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[540px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/8 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            <th className="px-3 py-2.5">Rank</th>
            <th className="px-3 py-2.5">Team</th>
            {!compact && <th className="px-3 py-2.5 text-center">MP</th>}
            {!compact && <th className="px-3 py-2.5 text-center">Wins</th>}
            <th className="px-3 py-2.5 text-center">Kills</th>
            <th className="px-3 py-2.5 text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr
              key={row.teamId}
              className={`border-b border-white/5 transition hover:bg-white/3 ${
                row.rank <= 3 ? 'bg-white/2' : ''
              }`}
            >
              <td className="px-3 py-3">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded font-display text-sm font-bold ${
                    row.rank === 1
                      ? 'bg-ember-500 text-black'
                      : row.rank === 2
                        ? 'bg-zinc-300 text-black'
                        : row.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'text-zinc-500'
                  }`}
                >
                  {row.rank}
                </span>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{row.name}</span>
                  {row.tag && (
                    <span className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                      {row.tag}
                    </span>
                  )}
                </div>
              </td>
              {!compact && <td className="px-3 py-3 text-center text-zinc-400">{row.matchesPlayed}</td>}
              {!compact && <td className="px-3 py-3 text-center text-zinc-400">{row.wins}</td>}
              <td className="px-3 py-3 text-center font-semibold text-zinc-300">{row.kills}</td>
              <td className="px-3 py-3 text-right font-display text-lg font-extrabold text-ember-400">
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
