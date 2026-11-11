import { Router } from 'express';
import { db, one, query } from '../db.js';
import {
  authRequired,
  canManageTournament,
  optionalAuth,
} from '../auth.js';
import {
  cleanString,
  fail,
  h,
  parseDate,
  slugify,
  toInt,
} from '../helpers.js';
import {
  mapMatch,
  mapRegistration,
  tournamentDetail,
  tournamentSummary,
} from '../serialize.js';
import { getBrResults, getStandings, pointsTable } from '../standings.js';
import { generateBracket } from '../bracket.js';
import { resultPoints } from '../points.js';

const router = Router();
router.use(optionalAuth);

const SUMMARY_SELECT = `
  SELECT t.*, u.display_name AS organizer_name,
    (SELECT COUNT(*) FROM registrations r
      WHERE r.tournament_id = t.id AND r.status = 'approved') AS approved_count,
    (SELECT COUNT(*) FROM registrations r
      WHERE r.tournament_id = t.id AND r.status = 'pending') AS pending_count
  FROM tournaments t
  LEFT JOIN users u ON u.id = t.organizer_id
`;

async function findTournament(idOrSlug) {
  if (!idOrSlug) return null;
  return one(`${SUMMARY_SELECT} WHERE t.slug = $1 OR t.id::text = $1 LIMIT 1`, [
    String(idOrSlug),
  ]);
}

async function loadMatches(tournamentId) {
  const rows = await query(
    `SELECT m.*, ta.name AS team_a_name, ta.tag AS team_a_tag,
            tb.name AS team_b_name, tb.tag AS team_b_tag,
            tw.name AS winner_name
     FROM matches m
     LEFT JOIN teams ta ON ta.id = m.team_a_id
     LEFT JOIN teams tb ON tb.id = m.team_b_id
     LEFT JOIN teams tw ON tw.id = m.winner_id
     WHERE m.tournament_id = $1
     ORDER BY m.round ASC, m.position ASC`,
    [tournamentId],
  );
  return rows.map(mapMatch);
}

function computeRoom(tournament, user, myRegistrations) {
  const revealAt = tournament.starts_at
    ? new Date(
        new Date(tournament.starts_at).getTime() -
          Number(tournament.room_reveal_minutes || 0) * 60_000,
      )
    : null;
  const isManager = canManageTournament(tournament, user);
  const hasApprovedTeam = myRegistrations.some((r) => r.status === 'approved');
  const eligible = isManager || hasApprovedTeam;
  const timeReached = revealAt ? Date.now() >= revealAt.getTime() : false;
  const revealed = Boolean(tournament.room_id) && eligible && (isManager || timeReached);

  return {
    eligible,
    revealed,
    revealAt,
    startsAt: tournament.starts_at,
    roomId: revealed ? tournament.room_id : null,
    roomPassword: revealed ? tournament.room_password : null,
  };
}

async function buildDetail(tournament, user) {
  const id = tournament.id;
  const canManage = canManageTournament(tournament, user);

  const approvedTeams = await query(
    `SELECT t.id, t.name, t.tag, r.seed, r.created_at, u.display_name AS captain_name,
       (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
     FROM registrations r
     JOIN teams t ON t.id = r.team_id
     JOIN users u ON u.id = t.captain_id
     WHERE r.tournament_id = $1 AND r.status = 'approved'
     ORDER BY r.seed NULLS LAST, r.created_at ASC`,
    [id],
  );

  let myRegistrations = [];
  if (user) {
    myRegistrations = await query(
      `SELECT r.id, r.status, r.seed, r.team_id, t.name AS team_name, t.tag AS team_tag
       FROM registrations r
       JOIN teams t ON t.id = r.team_id
       JOIN team_members tm ON tm.team_id = t.id
       WHERE r.tournament_id = $1 AND tm.user_id = $2`,
      [id, user.id],
    );
  }

  const announcements = await query(
    `SELECT id, title, body, created_at FROM announcements
     WHERE tournament_id = $1 ORDER BY created_at DESC`,
    [id],
  );

  let registrations;
  if (canManage) {
    const rows = await query(
      `SELECT r.id, r.status, r.seed, r.created_at,
              t.id AS team_id, t.name AS team_name, t.tag AS team_tag,
              u.display_name AS captain_name, u.ff_uid AS captain_uid,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
       FROM registrations r
       JOIN teams t ON t.id = r.team_id
       JOIN users u ON u.id = t.captain_id
       WHERE r.tournament_id = $1
       ORDER BY r.seed NULLS LAST, r.created_at ASC`,
      [id],
    );
    registrations = rows.map(mapRegistration);
  }

  let bracket = [];
  let champion = null;
  if (tournament.format === 'single_elim') {
    bracket = await loadMatches(id);
    if (bracket.length) {
      const finalRound = Math.max(...bracket.map((m) => m.round));
      const finalMatch = bracket.find(
        (m) => m.round === finalRound && m.status === 'completed' && m.winnerId,
      );
      if (finalMatch) {
        champion = {
          teamId: finalMatch.winnerId,
          name: finalMatch.winnerName,
        };
      }
    }
  }

  let standings = [];
  let brResults = [];
  if (tournament.format === 'battle_royale') {
    standings = await getStandings(id);
    brResults = await getBrResults(id);
  }

  return {
    tournament: tournamentDetail(tournament),
    approvedTeams: approvedTeams.map((team) => ({
      id: team.id,
      name: team.name,
      tag: team.tag,
      seed: team.seed,
      captainName: team.captain_name,
      memberCount: Number(team.member_count),
    })),
    myRegistrations: myRegistrations.map((r) => ({
      id: r.id,
      status: r.status,
      seed: r.seed,
      teamId: r.team_id,
      teamName: r.team_name,
      teamTag: r.team_tag,
    })),
    registrations,
    bracket,
    champion,
    standings,
    brResults,
    pointsTable: tournament.format === 'battle_royale' ? pointsTable() : [],
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      createdAt: a.created_at,
    })),
    room: computeRoom(tournament, user, myRegistrations),
    canManage,
  };
}

router.get(
  '/',
  h(async (req, res) => {
    const params = [];
    const where = [];
    const status = cleanString(req.query.status, 20);
    if (['draft', 'registration', 'live', 'completed'].includes(status)) {
      params.push(status);
      where.push(`t.status = $${params.length}`);
    }
    if (req.query.mine === '1') {
      if (!req.user) return res.status(401).json({ error: 'Sign in required.' });
      params.push(req.user.id);
      where.push(`t.organizer_id = $${params.length}`);
    } else if (!(req.query.scope === 'all' && req.user?.role === 'admin')) {
      // Drafts stay private to their organizer.
      where.push(`t.status <> 'draft'`);
    }

    // ?date=YYYY-MM-DD — events starting on that calendar day, in the caller's
    // timezone. `tz` uses the JS convention (UTC − local, in minutes, e.g. -330
    // for IST), so the day bounds match the local day the client grouped by.
    const dateFilter = cleanString(req.query.date, 20);
    if (dateFilter) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
        return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
      }
      const tzRaw = toInt(req.query.tz, 0);
      const tzOffset = Math.abs(tzRaw) <= 840 ? tzRaw : 0;
      const [year, month, day] = dateFilter.split('-').map(Number);
      const dayStartMs = Date.UTC(year, month - 1, day) + tzOffset * 60_000;
      const dayEndMs = dayStartMs + 86_400_000;
      if (Number.isNaN(dayStartMs)) {
        return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
      }
      params.push(new Date(dayStartMs).toISOString(), new Date(dayEndMs).toISOString());
      where.push(
        `t.starts_at >= $${params.length - 1} AND t.starts_at < $${params.length}`,
      );
    }

    const rows = await query(
      `${SUMMARY_SELECT}
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY CASE t.status
         WHEN 'live' THEN 0 WHEN 'registration' THEN 1
         WHEN 'draft' THEN 2 ELSE 3 END,
         t.starts_at ASC NULLS LAST, t.created_at DESC`,
      params,
    );

    res.json({ tournaments: rows.map(tournamentSummary) });
  }),
);

router.get(
  '/:idOrSlug',
  h(async (req, res) => {
    const tournament = await findTournament(req.params.idOrSlug);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found.' });
    if (tournament.status === 'draft' && !canManageTournament(tournament, req.user)) {
      return res.status(404).json({ error: 'Tournament not found.' });
    }
    res.json(await buildDetail(tournament, req.user));
  }),
);

router.post(
  '/',
  authRequired,
  h(async (req, res) => {
    if (!['organizer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only organizers can create tournaments.' });
    }

    const title = cleanString(req.body.title, 80);
    if (title.length < 3) {
      return res.status(400).json({ error: 'Tournament title is required.' });
    }

    const format = cleanString(req.body.format, 20);
    if (!['single_elim', 'battle_royale'].includes(format)) {
      return res.status(400).json({ error: 'Choose a valid tournament format.' });
    }

    const mode = ['solo', 'duo', 'squad'].includes(req.body.mode)
      ? req.body.mode
      : 'squad';
    const slots = Math.min(128, Math.max(2, toInt(req.body.slots, 16)));
    const status = ['draft', 'registration', 'live', 'completed'].includes(
      req.body.status,
    )
      ? req.body.status
      : 'registration';

    let slug = slugify(title);
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
      const clash = await one('SELECT id FROM tournaments WHERE slug = $1', [candidate]);
      if (!clash) {
        slug = candidate;
        break;
      }
    }

    const tournament = await one(
      `INSERT INTO tournaments
       (slug, title, description, format, mode, status, slots, entry_fee, prize_pool,
        rules, starts_at, registration_closes, room_id, room_password,
        room_reveal_minutes, br_matches, banner, organizer_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        slug,
        title,
        cleanString(req.body.description, 2000) || null,
        format,
        mode,
        status,
        slots,
        Math.max(0, toInt(req.body.entryFee, 0)),
        Math.max(0, toInt(req.body.prizePool, 0)),
        cleanString(req.body.rules, 8000) || null,
        parseDate(req.body.startsAt),
        parseDate(req.body.registrationCloses),
        cleanString(req.body.roomId, 60) || null,
        cleanString(req.body.roomPassword, 60) || null,
        Math.max(0, toInt(req.body.roomRevealMinutes, 15)),
        Math.min(12, Math.max(1, toInt(req.body.brMatches, 4))),
        cleanString(req.body.banner, 20) || 'ember',
        req.user.id,
      ],
    );

    const full = await findTournament(String(tournament.id));
    res.status(201).json({ tournament: tournamentSummary(full) });
  }),
);

const FIELD_MAP = {
  title: 'title',
  description: 'description',
  format: 'format',
  mode: 'mode',
  status: 'status',
  slots: 'slots',
  entryFee: 'entry_fee',
  prizePool: 'prize_pool',
  rules: 'rules',
  startsAt: 'starts_at',
  registrationCloses: 'registration_closes',
  roomId: 'room_id',
  roomPassword: 'room_password',
  roomRevealMinutes: 'room_reveal_minutes',
  brMatches: 'br_matches',
  banner: 'banner',
};

router.patch(
  '/:idOrSlug',
  authRequired,
  h(async (req, res) => {
    const tournament = await findTournament(req.params.idOrSlug);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found.' });
    if (!canManageTournament(tournament, req.user)) {
      return res.status(403).json({ error: 'You cannot manage this tournament.' });
    }

    const updates = [];
    const params = [];

    for (const [field, column] of Object.entries(FIELD_MAP)) {
      if (!(field in req.body)) continue;
      let value = req.body[field];

      if (['title', 'description', 'rules', 'roomId', 'roomPassword', 'banner'].includes(field)) {
        value = cleanString(value, field === 'rules' ? 8000 : field === 'description' ? 2000 : 80) || null;
        if (field === 'title' && (!value || value.length < 3)) {
          return res.status(400).json({ error: 'Title must be at least 3 characters.' });
        }
      } else if (['startsAt', 'registrationCloses'].includes(field)) {
        value = parseDate(value);
      } else if (field === 'status') {
        if (!['draft', 'registration', 'live', 'completed'].includes(value)) {
          return res.status(400).json({ error: 'Invalid tournament status.' });
        }
      } else if (field === 'format') {
        if (!['single_elim', 'battle_royale'].includes(value)) {
          return res.status(400).json({ error: 'Invalid tournament format.' });
        }
        if (value !== tournament.format) {
          const [{ count: matchCount }] = await query(
            'SELECT COUNT(*)::int AS count FROM matches WHERE tournament_id = $1',
            [tournament.id],
          );
          const [{ count: resultCount }] = await query(
            'SELECT COUNT(*)::int AS count FROM br_results WHERE tournament_id = $1',
            [tournament.id],
          );
          if (matchCount > 0 || resultCount > 0) {
            return res.status(400).json({
              error: 'Format cannot change after results exist. Clear the bracket/results first.',
            });
          }
        }
      } else if (field === 'mode') {
        if (!['solo', 'duo', 'squad'].includes(value)) {
          return res.status(400).json({ error: 'Invalid game mode.' });
        }
      } else {
        value = toInt(value, null);
        if (value === null) continue;
        const min = field === 'slots' ? 2 : field === 'brMatches' ? 1 : 0;
        const max = field === 'slots' ? 128 : field === 'brMatches' ? 12 : 10_000_000;
        value = Math.min(max, Math.max(min, value));
      }

      params.push(value);
      updates.push(`${column} = $${params.length}`);
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    params.push(tournament.id);
    await query(
      `UPDATE tournaments SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params,
    );

    const updated = await findTournament(String(tournament.id));
    res.json({ tournament: tournamentSummary(updated) });
  }),
);

router.post(
  '/:idOrSlug/register',
  authRequired,
  h(async (req, res) => {
    const tournament = await findTournament(req.params.idOrSlug);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found.' });
    if (tournament.status !== 'registration') {
      return res.status(400).json({ error: 'Registration is not open for this tournament.' });
    }
    if (tournament.registration_closes && new Date(tournament.registration_closes) < new Date()) {
      return res.status(400).json({ error: 'Registration has closed.' });
    }

    const teamId = toInt(req.body.teamId, null);
    if (!teamId) return res.status(400).json({ error: 'Choose a team to register.' });

    const team = await one('SELECT * FROM teams WHERE id = $1', [teamId]);
    if (!team) return res.status(404).json({ error: 'Team not found.' });
    if (team.captain_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the team captain can register the team.' });
    }

    const existing = await one(
      'SELECT id FROM registrations WHERE tournament_id = $1 AND team_id = $2',
      [tournament.id, teamId],
    );
    if (existing) {
      return res.status(409).json({ error: 'This team is already registered.' });
    }

    const approvedCount = Number(tournament.approved_count);
    const status = approvedCount >= tournament.slots ? 'waitlist' : 'pending';

    const registration = await one(
      `INSERT INTO registrations (tournament_id, team_id, status)
       VALUES ($1, $2, $3) RETURNING *`,
      [tournament.id, teamId, status],
    );

    res.status(201).json({
      registration: {
        id: registration.id,
        status: registration.status,
        teamId,
        teamName: team.name,
      },
    });
  }),
);

router.get(
  '/:idOrSlug/registrations',
  authRequired,
  h(async (req, res) => {
    const tournament = await findTournament(req.params.idOrSlug);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found.' });
    if (!canManageTournament(tournament, req.user)) {
      return res.status(403).json({ error: 'You cannot manage this tournament.' });
    }

    const rows = await query(
      `SELECT r.id, r.status, r.seed, r.created_at,
              t.id AS team_id, t.name AS team_name, t.tag AS team_tag,
              u.display_name AS captain_name, u.ff_uid AS captain_uid,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
       FROM registrations r
       JOIN teams t ON t.id = r.team_id
       JOIN users u ON u.id = t.captain_id
       WHERE r.tournament_id = $1
       ORDER BY r.seed NULLS LAST, r.created_at ASC`,
      [tournament.id],
    );
    res.json({ registrations: rows.map(mapRegistration) });
  }),
);

router.post(
  '/:idOrSlug/bracket',
  authRequired,
  h(async (req, res) => {
    const tournament = await findTournament(req.params.idOrSlug);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found.' });
    if (!canManageTournament(tournament, req.user)) {
      return res.status(403).json({ error: 'You cannot manage this tournament.' });
    }
    if (tournament.format !== 'single_elim') {
      return res.status(400).json({ error: 'Brackets are only for single-elimination tournaments.' });
    }

    await generateBracket(tournament.id);
    res.status(201).json({ bracket: await loadMatches(tournament.id) });
  }),
);

router.post(
  '/:idOrSlug/br-results',
  authRequired,
  h(async (req, res) => {
    const tournament = await findTournament(req.params.idOrSlug);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found.' });
    if (!canManageTournament(tournament, req.user)) {
      return res.status(403).json({ error: 'You cannot manage this tournament.' });
    }
    if (tournament.format !== 'battle_royale') {
      return res.status(400).json({ error: 'This tournament is not a battle royale.' });
    }

    const matchNumber = toInt(req.body.matchNumber, null);
    if (!matchNumber || matchNumber < 1 || matchNumber > tournament.br_matches) {
      return res.status(400).json({ error: 'Choose a valid match number.' });
    }

    const results = Array.isArray(req.body.results) ? req.body.results : [];
    if (!results.length) {
      return res.status(400).json({ error: 'Enter at least one team result.' });
    }

    const approved = await query(
      `SELECT team_id FROM registrations
       WHERE tournament_id = $1 AND status = 'approved'`,
      [tournament.id],
    );
    const approvedIds = new Set(approved.map((row) => row.team_id));
    const placements = new Set();

    const clean = results.map((row) => {
      const teamId = toInt(row.teamId, null);
      const placement = toInt(row.placement, null);
      const kills = Math.min(99, Math.max(0, toInt(row.kills, 0)));
      if (!teamId || !approvedIds.has(teamId)) {
        fail(400, 'Every result must belong to an approved team.');
      }
      if (!placement || placement < 1 || placement > approvedIds.size) {
        fail(400, 'Placements must be between 1 and the number of approved teams.');
      }
      if (placements.has(placement)) {
        fail(400, `Placement ${placement} is used more than once in match ${matchNumber}.`);
      }
      placements.add(placement);
      return { teamId, placement, kills, points: resultPoints(placement, kills) };
    });

    await db.transaction(async (tx) => {
      for (const row of clean) {
        await tx.query(
          `INSERT INTO br_results
             (tournament_id, team_id, match_number, placement, kills, points)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (tournament_id, team_id, match_number)
           DO UPDATE SET placement = EXCLUDED.placement,
                         kills = EXCLUDED.kills,
                         points = EXCLUDED.points`,
          [
            tournament.id,
            row.teamId,
            matchNumber,
            row.placement,
            row.kills,
            row.points,
          ],
        );
      }
    });

    res.status(201).json({
      standings: await getStandings(tournament.id),
      brResults: await getBrResults(tournament.id),
    });
  }),
);

router.post(
  '/:idOrSlug/announcements',
  authRequired,
  h(async (req, res) => {
    const tournament = await findTournament(req.params.idOrSlug);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found.' });
    if (!canManageTournament(tournament, req.user)) {
      return res.status(403).json({ error: 'You cannot manage this tournament.' });
    }

    const title = cleanString(req.body.title, 100);
    const body = cleanString(req.body.body, 3000);
    if (!title || !body) {
      return res.status(400).json({ error: 'Announcement title and message are required.' });
    }

    const announcement = await one(
      `INSERT INTO announcements (tournament_id, title, body)
       VALUES ($1, $2, $3) RETURNING *`,
      [tournament.id, title, body],
    );

    res.status(201).json({
      announcement: {
        id: announcement.id,
        title: announcement.title,
        body: announcement.body,
        createdAt: announcement.created_at,
      },
    });
  }),
);

router.delete(
  '/:idOrSlug/announcements/:announcementId',
  authRequired,
  h(async (req, res) => {
    const tournament = await findTournament(req.params.idOrSlug);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found.' });
    if (!canManageTournament(tournament, req.user)) {
      return res.status(403).json({ error: 'You cannot manage this tournament.' });
    }
    await query(
      'DELETE FROM announcements WHERE id = $1 AND tournament_id = $2',
      [Number(req.params.announcementId), tournament.id],
    );
    res.json({ ok: true });
  }),
);

export default router;
