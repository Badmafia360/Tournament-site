import { Router } from 'express';
import { one, query } from '../db.js';
import { authRequired } from '../auth.js';
import { mapTeam } from '../serialize.js';
import { cleanString, h, randomCode } from '../helpers.js';

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

router.get(
  '/mine',
  authRequired,
  h(async (req, res) => {
    const rows = await query(
      `${TEAM_SELECT}
       WHERE t.id IN (SELECT team_id FROM team_members WHERE user_id = $1)
       ORDER BY t.created_at DESC`,
      [req.user.id],
    );
    res.json({ teams: rows.map(mapTeam) });
  }),
);

router.post(
  '/',
  authRequired,
  h(async (req, res) => {
    const name = cleanString(req.body.name, 40);
    const tag = cleanString(req.body.tag, 5).toUpperCase();
    const ffUid = cleanString(req.body.ffUid, 20);

    if (name.length < 3) {
      return res.status(400).json({ error: 'Team name must be at least 3 characters.' });
    }
    if (tag && !/^[A-Z0-9]{2,5}$/.test(tag)) {
      return res.status(400).json({ error: 'Tag must be 2–5 letters or numbers.' });
    }
    if (!ffUid) {
      return res.status(400).json({ error: 'Free Fire UID is required to create a team.' });
    }
    if (!/^\d{6,15}$/.test(ffUid)) {
      return res.status(400).json({ error: 'Free Fire UID must be 6–15 digits.' });
    }

    let joinCode = randomCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await one('SELECT id FROM teams WHERE join_code = $1', [joinCode]);
      if (!clash) break;
      joinCode = randomCode();
    }

    const team = await one(
      `INSERT INTO teams (name, tag, captain_id, join_code)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, tag || null, req.user.id, joinCode],
    );

    await query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'captain')`,
      [team.id, req.user.id],
    );
    await query('UPDATE users SET ff_uid = $1 WHERE id = $2', [ffUid, req.user.id]);

    const row = await one(`${TEAM_SELECT} WHERE t.id = $1`, [team.id]);
    res.status(201).json({ team: mapTeam(row) });
  }),
);

router.post(
  '/join',
  authRequired,
  h(async (req, res) => {
    const code = cleanString(req.body.code, 12).toUpperCase();
    const ffUid = cleanString(req.body.ffUid, 20);

    if (!code) return res.status(400).json({ error: 'Enter a team invite code.' });
    if (!ffUid) {
      return res.status(400).json({ error: 'Free Fire UID is required to join a team.' });
    }
    if (!/^\d{6,15}$/.test(ffUid)) {
      return res.status(400).json({ error: 'Free Fire UID must be 6–15 digits.' });
    }

    const team = await one('SELECT * FROM teams WHERE join_code = $1', [code]);
    if (!team) return res.status(404).json({ error: 'No team matches that invite code.' });

    const existing = await one(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [team.id, req.user.id],
    );
    if (existing) {
      return res.status(409).json({ error: 'You are already on this team.' });
    }

    await query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'member')`,
      [team.id, req.user.id],
    );
    await query('UPDATE users SET ff_uid = $1 WHERE id = $2', [ffUid, req.user.id]);

    const row = await one(`${TEAM_SELECT} WHERE t.id = $1`, [team.id]);
    res.status(201).json({ team: mapTeam(row) });
  }),
);

router.get(
  '/:id',
  authRequired,
  h(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const row = await one(`${TEAM_SELECT} WHERE t.id = $1`, [id]);
    if (!row) return res.status(404).json({ error: 'Team not found.' });

    const members = await query(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [id, req.user.id],
    );
    const isMember = members.length > 0;
    const team = mapTeam(row);
    if (!isMember) delete team.joinCode;

    const registrations = await query(
      `SELECT r.status, r.seed, r.created_at AS registered_at,
              t.id AS tournament_id, t.slug, t.title, t.status AS tournament_status,
              t.starts_at, t.banner, t.format, t.mode, t.prize_pool
       FROM registrations r
       JOIN tournaments t ON t.id = r.tournament_id
       WHERE r.team_id = $1
       ORDER BY t.starts_at DESC NULLS LAST`,
      [id],
    );

    res.json({
      team,
      isMember,
      registrations: registrations.map((r) => ({
        status: r.status,
        seed: r.seed,
        registeredAt: r.registered_at,
        tournamentId: r.tournament_id,
        slug: r.slug,
        title: r.title,
        tournamentStatus: r.tournament_status,
        startsAt: r.starts_at,
        banner: r.banner,
        format: r.format,
        mode: r.mode,
        prizePool: r.prize_pool,
      })),
    });
  }),
);

export default router;
