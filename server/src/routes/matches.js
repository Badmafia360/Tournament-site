import { Router } from 'express';
import { one } from '../db.js';
import { authRequired, canManageTournament } from '../auth.js';
import { h } from '../helpers.js';
import { reportMatchResult } from '../bracket.js';

const router = Router();

router.patch(
  '/:id',
  authRequired,
  h(async (req, res) => {
    const match = await one(
      `SELECT m.*, t.organizer_id
       FROM matches m
       JOIN tournaments t ON t.id = m.tournament_id
       WHERE m.id = $1`,
      [Number(req.params.id)],
    );
    if (!match) return res.status(404).json({ error: 'Match not found.' });
    if (!canManageTournament({ organizer_id: match.organizer_id }, req.user)) {
      return res.status(403).json({ error: 'You cannot manage this match.' });
    }

    const updated = await reportMatchResult(match.id, {
      scoreA: req.body.scoreA,
      scoreB: req.body.scoreB,
      winnerId: req.body.winnerId,
    });

    res.json({ match: updated });
  }),
);

export default router;
