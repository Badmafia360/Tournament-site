import { Router } from 'express';
import { one, query } from '../db.js';
import { h } from '../helpers.js';

const router = Router();

/**
 * GET /api/users/:id — public player profile.
 * Deliberately excludes email and password material.
 */
router.get(
  '/:id',
  h(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).json({ error: 'Player not found.' });
    }

    const user = await one(
      `SELECT id, display_name, ff_uid, role, avatar_color, avatar_photo, created_at
       FROM users WHERE id = $1`,
      [id],
    );
    if (!user) return res.status(404).json({ error: 'Player not found.' });

    const teams = await query(
      `SELECT t.id, t.name, t.tag, t.captain_id, tm.role AS member_role,
              (SELECT COUNT(*) FROM team_members tm2 WHERE tm2.team_id = t.id) AS member_count
       FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [id],
    );

    const history = await query(
      `SELECT r.status AS registration_status, r.seed,
              t.id AS tournament_id, t.slug, t.title, t.status AS tournament_status,
              t.starts_at, t.format, t.mode, t.banner, t.prize_pool,
              teams.name AS team_name, teams.tag AS team_tag
       FROM registrations r
       JOIN tournaments t ON t.id = r.tournament_id
       JOIN teams ON teams.id = r.team_id
       JOIN team_members tm ON tm.team_id = r.team_id AND tm.user_id = $1
       ORDER BY t.starts_at DESC NULLS LAST`,
      [id],
    );

    const stats = await one(
      `SELECT
        (SELECT COUNT(*)::int FROM team_members WHERE user_id = $1) AS teams,
        (SELECT COUNT(*)::int FROM registrations r
           JOIN team_members tm ON tm.team_id = r.team_id AND tm.user_id = $1) AS events,
        (SELECT COUNT(*)::int FROM matches m
           WHERE m.status = 'completed' AND m.winner_id IN (
             SELECT team_id FROM team_members WHERE user_id = $1)
             AND m.round = (SELECT MAX(m2.round) FROM matches m2
                             WHERE m2.tournament_id = m.tournament_id)
             AND EXISTS (SELECT 1 FROM tournaments t
                          WHERE t.id = m.tournament_id AND t.status = 'completed')) AS titles`,
      [id],
    );

    res.json({
      player: {
        id: user.id,
        displayName: user.display_name,
        ffUid: user.ff_uid,
        role: user.role,
        avatarColor: user.avatar_color,
        avatarPhoto: user.avatar_photo ? `/uploads/${user.avatar_photo}` : null,
        createdAt: user.created_at,
      },
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        tag: team.tag,
        captainId: team.captain_id,
        memberRole: team.member_role,
        memberCount: Number(team.member_count),
      })),
      history: history.map((row) => ({
        registrationStatus: row.registration_status,
        seed: row.seed,
        tournamentId: row.tournament_id,
        slug: row.slug,
        title: row.title,
        tournamentStatus: row.tournament_status,
        startsAt: row.starts_at,
        format: row.format,
        mode: row.mode,
        banner: row.banner,
        prizePool: row.prize_pool,
        teamName: row.team_name,
        teamTag: row.team_tag,
      })),
      stats: {
        teams: Number(stats.teams),
        events: Number(stats.events),
        titles: Number(stats.titles),
      },
    });
  }),
);

export default router;
