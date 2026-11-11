import { Router } from 'express';
import { one, query } from '../db.js';
import { authRequired, canManageTournament } from '../auth.js';
import { h, toInt } from '../helpers.js';
import { mapRegistration } from '../serialize.js';

const router = Router();

router.patch(
  '/:id',
  authRequired,
  h(async (req, res) => {
    const registration = await one(
      `SELECT r.*, t.organizer_id, t.slots
       FROM registrations r
       JOIN tournaments t ON t.id = r.tournament_id
       WHERE r.id = $1`,
      [Number(req.params.id)],
    );
    if (!registration) return res.status(404).json({ error: 'Registration not found.' });
    if (!canManageTournament(registration, req.user)) {
      return res.status(403).json({ error: 'You cannot manage this registration.' });
    }

    const updates = [];
    const params = [];

    if ('status' in req.body) {
      const status = String(req.body.status);
      if (!['pending', 'approved', 'rejected', 'waitlist'].includes(status)) {
        return res.status(400).json({ error: 'Invalid registration status.' });
      }
      if (status === 'approved') {
        const [{ count }] = await query(
          `SELECT COUNT(*)::int AS count FROM registrations
           WHERE tournament_id = $1 AND status = 'approved' AND id <> $2`,
          [registration.tournament_id, registration.id],
        );
        if (Number(count) >= registration.slots) {
          return res.status(409).json({
            error: 'All slots are filled. Move a team to the waitlist first.',
          });
        }
      }
      params.push(status);
      updates.push(`status = $${params.length}`);
    }

    if ('seed' in req.body) {
      const seed = toInt(req.body.seed, null);
      params.push(seed);
      updates.push(`seed = $${params.length}`);
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    params.push(registration.id);
    await query(
      `UPDATE registrations SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params,
    );

    const row = await one(
      `SELECT r.id, r.status, r.seed, r.created_at,
              t.id AS team_id, t.name AS team_name, t.tag AS team_tag,
              u.display_name AS captain_name, u.ff_uid AS captain_uid,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
       FROM registrations r
       JOIN teams t ON t.id = r.team_id
       JOIN users u ON u.id = t.captain_id
       WHERE r.id = $1`,
      [registration.id],
    );

    res.json({ registration: mapRegistration(row) });
  }),
);

export default router;
