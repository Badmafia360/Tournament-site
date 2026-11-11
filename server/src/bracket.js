import { db, query, one } from './db.js';
import { fail } from './helpers.js';

export function seedOrder(size) {
  let order = [1, 2];
  while (order.length < size) {
    const nextSize = order.length * 2;
    const next = [];
    for (const seed of order) {
      next.push(seed, nextSize + 1 - seed);
    }
    order = next;
  }
  return order;
}

async function setNextSlot(tx, tournamentId, round, position, winnerId) {
  const nextRound = round + 1;
  const nextPosition = Math.floor(position / 2);
  const slot = position % 2 === 0 ? 'team_a_id' : 'team_b_id';
  const statusCheck = position % 2 === 0 ? 'team_b_id' : 'team_a_id';

  const updated = await tx.query(
    `UPDATE matches
     SET ${slot} = $1,
         status = CASE WHEN ${statusCheck} IS NOT NULL THEN 'ready' ELSE 'pending' END
     WHERE tournament_id = $2 AND round = $3 AND position = $4
     RETURNING id`,
    [winnerId, tournamentId, nextRound, nextPosition],
  );
  return updated.rows[0] || null;
}

export async function generateBracket(tournamentId) {
  const teams = await query(
    `SELECT team_id, seed, created_at
     FROM registrations
     WHERE tournament_id = $1 AND status = 'approved'
     ORDER BY seed NULLS LAST, created_at ASC`,
    [tournamentId],
  );

  if (teams.length < 2) {
    fail(400, 'Approve at least 2 teams before generating a bracket.');
  }

  const size = 2 ** Math.ceil(Math.log2(teams.length));
  const totalRounds = Math.log2(size);
  const order = seedOrder(size);
  const teamBySeed = new Map(teams.map((row, index) => [index + 1, row.team_id]));

  await db.transaction(async (tx) => {
    await tx.query('DELETE FROM matches WHERE tournament_id = $1', [tournamentId]);

    const firstRound = [];
    for (let round = 1; round <= totalRounds; round++) {
      const matchCount = size / 2 ** round;
      for (let position = 0; position < matchCount; position++) {
        let teamA = null;
        let teamB = null;
        if (round === 1) {
          teamA = teamBySeed.get(order[position * 2]) || null;
          teamB = teamBySeed.get(order[position * 2 + 1]) || null;
        }
        const status = teamA && teamB ? 'ready' : 'pending';
        const inserted = await tx.query(
          `INSERT INTO matches (tournament_id, round, position, team_a_id, team_b_id, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [tournamentId, round, position, teamA, teamB, status],
        );
        if (round === 1) {
          firstRound.push({
            id: inserted.rows[0].id,
            position,
            teamA,
            teamB,
          });
        }
      }
    }

    // Auto-advance first-round byes.
    for (const match of firstRound) {
      const winner = match.teamA || match.teamB;
      if (winner && (!match.teamA || !match.teamB)) {
        await tx.query(
          `UPDATE matches SET winner_id = $1, status = 'completed' WHERE id = $2`,
          [winner, match.id],
        );
        await setNextSlot(tx, tournamentId, 1, match.position, winner);
      }
    }
  });

  return totalRounds;
}

export async function reportMatchResult(matchId, { scoreA, scoreB, winnerId }) {
  const match = await one('SELECT * FROM matches WHERE id = $1', [matchId]);
  if (!match) fail(404, 'Match not found.');
  if (!match.team_a_id || !match.team_b_id) {
    fail(400, 'Both teams must be decided before reporting this match.');
  }

  const a = Number.parseInt(scoreA, 10);
  const b = Number.parseInt(scoreB, 10);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) {
    fail(400, 'Scores must be positive numbers.');
  }

  let winner = null;
  if (winnerId) {
    winner = Number(winnerId);
    if (winner !== match.team_a_id && winner !== match.team_b_id) {
      fail(400, 'Winner must be one of the two teams in the match.');
    }
  } else if (a > b) {
    winner = match.team_a_id;
  } else if (b > a) {
    winner = match.team_b_id;
  } else {
    fail(400, 'Scores are tied. Provide a winner.');
  }

  const nextMatch = await one(
    `SELECT * FROM matches
     WHERE tournament_id = $1 AND round = $2 AND position = $3`,
    [match.tournament_id, match.round + 1, Math.floor(match.position / 2)],
  );

  if (match.status === 'completed' && nextMatch?.status === 'completed') {
    fail(
      400,
      'This result feeds a completed match. Regenerate the bracket to change it.',
    );
  }

  await db.transaction(async (tx) => {
    await tx.query(
      `UPDATE matches
       SET score_a = $1, score_b = $2, winner_id = $3, status = 'completed'
       WHERE id = $4`,
      [a, b, winner, matchId],
    );

    if (nextMatch) {
      await setNextSlot(
        tx,
        match.tournament_id,
        match.round,
        match.position,
        winner,
      );
    } else {
      await tx.query(
        `UPDATE tournaments SET status = 'completed' WHERE id = $1`,
        [match.tournament_id],
      );
    }
  });

  return one('SELECT * FROM matches WHERE id = $1', [matchId]);
}
