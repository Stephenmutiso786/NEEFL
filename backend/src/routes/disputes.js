import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT d.id, d.match_id, d.reason, d.status, d.resolution, d.created_at
     FROM disputes d
     WHERE d.raised_by = :user_id
     ORDER BY d.created_at DESC`,
    { user_id: req.user.id }
  );
  res.json({ disputes: rows });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT d.id, d.match_id, d.reason, d.status, d.resolution, d.created_at
     FROM disputes d
     WHERE d.id = :id`,
    { id: req.params.id }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json({ dispute: rows[0] });
}));

export default router;
