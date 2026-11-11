import { query } from './db.js';
import { placementPoints } from './points.js';

export async function getStandings(tournamentId) {
  const rows = await query(
    `SELECT b.team_id, t.name, t.tag,
            SUM(b.points)::int AS points,
            SUM(b.kills)::int AS kills,
            COUNT(*)::int AS matches_played,
            COUNT(*) FILTER (WHERE b.placement = 1)::int AS wins,
            MIN(b.placement)::int AS best_placement
     FROM br_results b
     JOIN teams t ON t.id = b.team_id
     WHERE b.tournament_id = $1
     GROUP BY b.team_id, t.name, t.tag
     ORDER BY points DESC, kills DESC, best_placement ASC, t.name ASC`,
    [tournamentId],
  );

  return rows.map((row, index) => ({
    rank: index + 1,
    teamId: row.team_id,
    name: row.name,
    tag: row.tag,
    points: row.points,
    kills: row.kills,
    matchesPlayed: row.matches_played,
    wins: row.wins,
    bestPlacement: row.best_placement,
  }));
}

export async function getBrResults(tournamentId) {
  const rows = await query(
    `SELECT b.match_number, b.placement, b.kills, b.points,
            b.team_id, t.name, t.tag
     FROM br_results b
     JOIN teams t ON t.id = b.team_id
     WHERE b.tournament_id = $1
     ORDER BY b.match_number ASC, b.placement ASC`,
    [tournamentId],
  );

  const byMatch = new Map();
  for (const row of rows) {
    if (!byMatch.has(row.match_number)) {
      byMatch.set(row.match_number, []);
    }
    byMatch.get(row.match_number).push({
      teamId: row.team_id,
      name: row.name,
      tag: row.tag,
      placement: row.placement,
      kills: row.kills,
      points: row.points,
    });
  }

  return [...byMatch.entries()].map(([matchNumber, results]) => ({
    matchNumber,
    results,
  }));
}

export function pointsTable() {
  return Array.from({ length: 10 }, (_, index) => ({
    placement: index + 1,
    points: placementPoints(index + 1),
  }));
}
