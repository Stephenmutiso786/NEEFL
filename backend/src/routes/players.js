import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../lib/validation.js';
import { updateProfileSchema } from '../validators/players.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/leaderboard', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT p.user_id, p.gamer_tag, p.rank_points, p.wins, p.losses, p.goals_scored, p.division
     FROM players p
     ORDER BY p.rank_points DESC, p.wins DESC, p.goals_scored DESC
     LIMIT 100`
  );
  res.json({ leaderboard: rows });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT u.id, u.email, u.phone, u.role, u.status, u.kyc_status,
            p.gamer_tag, p.real_name, p.country, p.region, p.preferred_team,
            p.rank_points, p.wins, p.losses, p.goals_scored, p.division
     FROM users u
     JOIN players p ON p.user_id = u.id
     WHERE u.id = :id`,
    { id: req.user.id }
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json({ player: rows[0] });
}));

router.get('/me/matches', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT m.id, m.tournament_id, m.round, m.player1_id, m.player2_id,
            m.scheduled_at, m.status, m.score1, m.score2, m.winner_id,
            m.odds_home, m.odds_draw, m.odds_away,
            t.name as tournament_name,
            p1.gamer_tag as player1_tag,
            p2.gamer_tag as player2_tag
     FROM matches m
     JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN players p1 ON p1.user_id = m.player1_id
     LEFT JOIN players p2 ON p2.user_id = m.player2_id
     WHERE m.player1_id = :id OR m.player2_id = :id
     ORDER BY m.scheduled_at DESC`,
    { id: req.user.id }
  );
  res.json({ matches: rows });
}));

router.put('/me', requireAuth, validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const updates = req.body;

  if (updates.gamer_tag) {
    const [existing] = await db.query(
      'SELECT user_id FROM players WHERE gamer_tag = :gamer_tag AND user_id != :user_id',
      { gamer_tag: updates.gamer_tag, user_id: req.user.id }
    );
    if (existing.length) {
      return res.status(409).json({ error: 'gamer_tag_taken' });
    }
  }

  await db.query(
    `UPDATE players
     SET gamer_tag = COALESCE(:gamer_tag, gamer_tag),
         real_name = COALESCE(:real_name, real_name),
         country = COALESCE(:country, country),
         region = COALESCE(:region, region),
         preferred_team = COALESCE(:preferred_team, preferred_team)
     WHERE user_id = :user_id`,
    {
      gamer_tag: updates.gamer_tag || null,
      real_name: updates.real_name || null,
      country: updates.country || null,
      region: updates.region || null,
      preferred_team: updates.preferred_team || null,
      user_id: req.user.id
    }
  );

  res.status(204).send();
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT p.user_id, p.gamer_tag, p.country, p.region, p.preferred_team,
            p.rank_points, p.wins, p.losses, p.goals_scored, p.division
     FROM players p
     WHERE p.user_id = :id`,
    { id: req.params.id }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json({ player: rows[0] });
}));

export default router;
