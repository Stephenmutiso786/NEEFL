import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

async function insertAlert({ match_id, user_id, alert_type, severity, details }) {
  const [existing] = await db.query(
    `SELECT id FROM fraud_alerts
     WHERE alert_type = :alert_type
       AND ((:match_id IS NOT NULL AND match_id = :match_id) OR (:match_id IS NULL AND match_id IS NULL))
       AND ((:user_id IS NOT NULL AND user_id = :user_id) OR (:user_id IS NULL AND user_id IS NULL))
       AND resolved_at IS NULL
     LIMIT 1`,
    { alert_type, match_id: match_id || null, user_id: user_id || null }
  );
  if (existing.length) return;

  await db.query(
    `INSERT INTO fraud_alerts (match_id, user_id, alert_type, severity, details)
     VALUES (:match_id, :user_id, :alert_type, :severity, :details)`,
    {
      match_id: match_id || null,
      user_id: user_id || null,
      alert_type,
      severity,
      details: details ? JSON.stringify(details) : null
    }
  );
}

router.get('/alerts', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, match_id, user_id, alert_type, severity, details, resolved_at, created_at
     FROM fraud_alerts
     ORDER BY created_at DESC`
  );
  res.json({ alerts: rows });
}));

router.post('/scan', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const [multi] = await db.query(
    `SELECT match_id, user_id, COUNT(DISTINCT choice) as choices, SUM(amount) as total_amount
     FROM bets
     GROUP BY match_id, user_id
     HAVING choices > 1`
  );

  for (const row of multi) {
    await insertAlert({
      match_id: row.match_id,
      user_id: row.user_id,
      alert_type: 'multi_side_bet',
      severity: 'high',
      details: { choices: row.choices, total_amount: row.total_amount }
    });
  }

  const [highStakes] = await db.query(
    `SELECT b.match_id, b.user_id, b.amount, s.avg_amount
     FROM bets b
     JOIN (
       SELECT match_id, AVG(amount) as avg_amount
       FROM bets
       GROUP BY match_id
     ) s ON s.match_id = b.match_id
     WHERE s.avg_amount > 0 AND b.amount >= s.avg_amount * 5`
  );

  for (const row of highStakes) {
    await insertAlert({
      match_id: row.match_id,
      user_id: row.user_id,
      alert_type: 'high_stake',
      severity: 'medium',
      details: { amount: row.amount, avg_amount: row.avg_amount }
    });
  }

  res.json({ scanned: true, multi_side: multi.length, high_stake: highStakes.length });
}));

router.post('/alerts/:id/resolve', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  await db.query(
    `UPDATE fraud_alerts
     SET resolved_at = NOW(), resolved_by = :user_id
     WHERE id = :id`,
    { id: req.params.id, user_id: req.user.id }
  );
  res.status(204).send();
}));

export default router;
