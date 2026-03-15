import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../lib/validation.js';
import { placeBetSchema } from '../validators/bets.js';

const router = Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT b.id, b.match_id, b.amount, b.choice, b.odds, b.status, b.payout, b.created_at, b.settled_at,
            m.scheduled_at, m.status as match_status, m.score1, m.score2,
            t.name as tournament_name,
            p1.gamer_tag as player1_tag,
            p2.gamer_tag as player2_tag
     FROM bets b
     JOIN matches m ON m.id = b.match_id
     JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN players p1 ON p1.user_id = m.player1_id
     LEFT JOIN players p2 ON p2.user_id = m.player2_id
     WHERE b.user_id = :user_id
     ORDER BY b.created_at DESC`,
    { user_id: req.user.id }
  );
  res.json({ bets: rows });
}));

router.post('/', requireAuth, validate(placeBetSchema), asyncHandler(async (req, res) => {
  const { match_id, amount, choice } = req.body;

  const allowedRoles = ['player', 'supervisor', 'referee', 'fan', 'bettor'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  if (req.user.status !== 'active') {
    return res.status(403).json({ error: 'pending_approval' });
  }

  const [matches] = await db.query(
    `SELECT id, status, betting_status, odds_home, odds_draw, odds_away
     FROM matches WHERE id = :id`,
    { id: match_id }
  );
  if (!matches.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const match = matches[0];
  if (match.status !== 'scheduled') {
    return res.status(400).json({ error: 'betting_closed' });
  }
  if (match.betting_status !== 'open') {
    return res.status(400).json({ error: 'betting_closed' });
  }

  const oddsMap = {
    home: match.odds_home,
    draw: match.odds_draw,
    away: match.odds_away
  };
  const odds = oddsMap[choice];
  if (!odds || Number(odds) <= 0) {
    return res.status(400).json({ error: 'odds_unavailable' });
  }

  try {
    const betId = await db.tx(async (conn) => {
      const [[wallet]] = await conn.query(
        'SELECT balance FROM wallets WHERE user_id = :user_id FOR UPDATE',
        { user_id: req.user.id }
      );
      if (!wallet || Number(wallet.balance) < amount) {
        const err = new Error('insufficient_balance');
        err.code = 'insufficient_balance';
        throw err;
      }

      const [insert] = await conn.execute(
        `INSERT INTO bets (user_id, match_id, amount, choice, odds)
         VALUES (:user_id, :match_id, :amount, :choice, :odds)
         RETURNING id`,
        {
          user_id: req.user.id,
          match_id,
          amount,
          choice,
          odds
        }
      );

      await conn.execute(
        `UPDATE wallets SET balance = balance - :amount WHERE user_id = :user_id`,
        { amount, user_id: req.user.id }
      );
      await conn.execute(
        `INSERT INTO wallet_transactions (user_id, amount, type, reference_payment_id)
         VALUES (:user_id, :amount, 'debit', NULL)`,
        { user_id: req.user.id, amount }
      );

      return insert.insertId;
    });

    return res.status(201).json({ id: betId, status: 'pending' });
  } catch (err) {
    if (err.code === 'insufficient_balance') {
      return res.status(400).json({ error: 'insufficient_balance' });
    }
    throw err;
  }
}));

export default router;
