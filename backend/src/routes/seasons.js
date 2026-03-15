import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../lib/validation.js';
import { seasonCreateSchema, seasonUpdateSchema } from '../validators/seasons.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, name, entry_fee, prize_pool, start_date, end_date, status, created_at
     FROM seasons
     ORDER BY created_at DESC`
  );
  res.json({ seasons: rows });
}));

router.post('/', requireAuth, requireRole('admin'), validate(seasonCreateSchema), asyncHandler(async (req, res) => {
  const { name, entry_fee, prize_pool, start_date, end_date, status } = req.body;
  const [result] = await db.query(
    `INSERT INTO seasons (name, entry_fee, prize_pool, start_date, end_date, status)
     VALUES (:name, :entry_fee, :prize_pool, :start_date, :end_date, :status)
     RETURNING id`,
    {
      name,
      entry_fee,
      prize_pool,
      start_date,
      end_date,
      status: status || 'draft'
    }
  );
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'season_created',
    entityType: 'season',
    entityId: result.insertId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(201).json({ id: result.insertId });
}));

router.put('/:id', requireAuth, requireRole('admin'), validate(seasonUpdateSchema), asyncHandler(async (req, res) => {
  const { name, entry_fee, prize_pool, start_date, end_date, status } = req.body;
  await db.query(
    `UPDATE seasons
     SET name = COALESCE(:name, name),
         entry_fee = COALESCE(:entry_fee, entry_fee),
         prize_pool = COALESCE(:prize_pool, prize_pool),
         start_date = COALESCE(:start_date, start_date),
         end_date = COALESCE(:end_date, end_date),
         status = COALESCE(:status, status)
     WHERE id = :id`,
    {
      name: name || null,
      entry_fee: entry_fee ?? null,
      prize_pool: prize_pool ?? null,
      start_date: start_date || null,
      end_date: end_date || null,
      status: status || null,
      id: req.params.id
    }
  );
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'season_updated',
    entityType: 'season',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

router.post('/:id/join', requireAuth, asyncHandler(async (req, res) => {
  const seasonId = Number(req.params.id);
  if (req.user.status !== 'active') {
    return res.status(403).json({ error: 'pending_approval' });
  }

  const [rows] = await db.query(
    'SELECT id, entry_fee, status FROM seasons WHERE id = :id',
    { id: seasonId }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const season = rows[0];
  if (season.status !== 'active') {
    return res.status(400).json({ error: 'season_not_active' });
  }

  const [existing] = await db.query(
    `SELECT id, status FROM season_entries
     WHERE season_id = :season_id AND player_id = :player_id`,
    { season_id: seasonId, player_id: req.user.id }
  );

  if (existing.length) {
    const existingStatus = existing[0].status;
    if (existingStatus === 'paid' || existingStatus === 'approved') {
      return res.status(200).json({ status: existingStatus });
    }
    return res.status(200).json({
      status: existingStatus,
      payment_required: true,
      amount: Number(season.entry_fee) || 0,
      season_id: seasonId
    });
  }

  const status = Number(season.entry_fee) === 0 ? 'approved' : 'pending';
  await db.query(
    `INSERT INTO season_entries (season_id, player_id, status)
     VALUES (:season_id, :player_id, :status)`,
    { season_id: seasonId, player_id: req.user.id, status }
  );

  res.status(201).json({
    status,
    payment_required: status !== 'approved',
    amount: Number(season.entry_fee) || 0,
    season_id: seasonId
  });
}));

export default router;
