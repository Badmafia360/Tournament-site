import { Router } from 'express';
import { one, query } from '../db.js';
import { authRequired } from '../auth.js';
import { h } from '../helpers.js';
import { mapTeam } from '../serialize.js';

const router = Router();

const TEAM_SELECT = `
  SELECT t.*, u.display_name AS captain_name,
    (SELECT COUNT(*) FROM team_members tm2 WHERE tm2.team_id = t.id) AS member_count,
    (SELECT json_agg(json_build_object(
        'id', u2.id,
        'displayName', u2.display_name,
        'ffUid', u2.ff_uid,
        'role', tm2.role,
        'avatarColor', u2.avatar_color,
        'avatarPhoto', CASE WHEN u2.avatar_photo IS NOT NULL
                            THEN '/uploads/' || u2.avatar_photo END
      ) ORDER BY tm2.joined_at)
     FROM team_members tm2
     JOIN users u2 ON u2.id = tm2.user_id
     WHERE tm2.team_id = t.id) AS members
  FROM teams t
  JOIN users u ON u.id = t.captain_id
`;

function revealRoom(tournament) {
  const revealAt = tournament.starts_at
    ? new Date(
        new Date(tournament.starts_at).getTime() -
          Number(tournament.room_reveal_minutes || 0) * 60_000,
      )
    : null;
  if (!tournament.room_id) return { revealed: false, revealAt };
  if (!revealAt) return { revealed: false, revealAt: null };
  if (Date.now() < revealAt.getTime()) return { revealed: false, revealAt };
  return {
    revealed: true,
    revealAt,
    roomId: tournament.room_id,
    roomPassword: tournament.room_password,
  };
}

router.get(
  '/dashboard',
  authRequired,
  h(async (req, res) => {
    const teams = await query(
      `${TEAM_SELECT}
       WHERE t.id IN (SELECT team_id FROM team_members WHERE user_id = $1)
       ORDER BY t.created_at DESC`,
      [req.user.id],
    );

    const registrations = await query(
      `SELECT r.id, r.status, r.seed, r.created_at,
              tm.team_id, teams.name AS team_name, teams.tag AS team_tag,
              t.id AS tournament_id, t.slug, t.title, t.status AS tournament_status,
              t.starts_at, t.format, t.mode, t.banner, t.prize_pool, t.slots,
              t.room_id, t.room_password, t.room_reveal_minutes
       FROM registrations r
       JOIN tournaments t ON t.id = r.tournament_id
       JOIN teams ON teams.id = r.team_id
       JOIN team_members tm ON tm.team_id = r.team_id AND tm.user_id = $1
       ORDER BY t.starts_at ASC NULLS LAST`,
      [req.user.id],
    );

    const matches = await query(
      `SELECT m.id, m.round, m.position, m.status, m.scheduled_at,
              m.team_a_id, m.team_b_id, m.winner_id,
              ta.name AS team_a_name, tb.name AS team_b_name,
              t.id AS tournament_id, t.slug, t.title, t.banner
       FROM matches m
       JOIN tournaments t ON t.id = m.tournament_id
       LEFT JOIN teams ta ON ta.id = m.team_a_id
       LEFT JOIN teams tb ON tb.id = m.team_b_id
       WHERE m.status <> 'completed'
         AND (m.team_a_id IN (SELECT team_id FROM team_members WHERE user_id = $1)
           OR m.team_b_id IN (SELECT team_id FROM team_members WHERE user_id = $1))
       ORDER BY m.round ASC, m.position ASC`,
      [req.user.id],
    );

    const mappedRegistrations = registrations.map((row) => {
      const room =
        row.status === 'approved'
          ? revealRoom({
              starts_at: row.starts_at,
              room_reveal_minutes: row.room_reveal_minutes,
              room_id: row.room_id,
              room_password: row.room_password,
            })
          : { revealed: false, revealAt: null };
      return {
        id: row.id,
        status: row.status,
        seed: row.seed,
        registeredAt: row.created_at,
        teamId: row.team_id,
        teamName: row.team_name,
        teamTag: row.team_tag,
        tournamentId: row.tournament_id,
        slug: row.slug,
        title: row.title,
        tournamentStatus: row.tournament_status,
        startsAt: row.starts_at,
        format: row.format,
        mode: row.mode,
        banner: row.banner,
        prizePool: row.prize_pool,
        slots: row.slots,
        room,
      };
    });

    res.json({
      teams: teams.map(mapTeam),
      registrations: mappedRegistrations,
      matches: matches.map((m) => ({
        id: m.id,
        round: m.round,
        position: m.position,
        status: m.status,
        scheduledAt: m.scheduled_at,
        teamAId: m.team_a_id,
        teamBId: m.team_b_id,
        teamAName: m.team_a_name,
        teamBName: m.team_b_name,
        tournamentId: m.tournament_id,
        slug: m.slug,
        title: m.title,
        banner: m.banner,
      })),
    });
  }),
);

router.get(
  '/stats',
  h(async (_req, res) => {
    const stats = await one(
      `SELECT
        (SELECT COUNT(*)::int FROM users) AS players,
        (SELECT COUNT(*)::int FROM teams) AS teams,
        (SELECT COUNT(*)::int FROM tournaments) AS tournaments,
        (SELECT COALESCE(SUM(prize_pool), 0)::int FROM tournaments) AS prize_pool,
        (SELECT COUNT(*)::int FROM registrations WHERE status = 'approved') AS registrations`,
    );
    res.json({
      players: stats.players,
      teams: stats.teams,
      tournaments: stats.tournaments,
      prizePool: stats.prize_pool,
      registrations: stats.registrations,
    });
  }),
);

export default router;
