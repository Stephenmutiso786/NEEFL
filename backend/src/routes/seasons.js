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
    `SELECT id, name, start_date, end_date, status, created_at
     FROM seasons
     ORDER BY created_at DESC`
  );
  res.json({ seasons: rows });
}));

router.post('/', requireAuth, requireRole('admin'), validate(seasonCreateSchema), asyncHandler(async (req, res) => {
  const { name, start_date, end_date, status } = req.body;
  const [result] = await db.query(
    `INSERT INTO seasons (name, start_date, end_date, status)
     VALUES (:name, :start_date, :end_date, :status)`,
    {
      name,
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
  const { name, start_date, end_date, status } = req.body;
  await db.query(
    `UPDATE seasons
     SET name = COALESCE(:name, name),
         start_date = COALESCE(:start_date, start_date),
         end_date = COALESCE(:end_date, end_date),
         status = COALESCE(:status, status)
     WHERE id = :id`,
    {
      name: name || null,
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

export default router;
