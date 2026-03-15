import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../lib/validation.js';
import { markReadSchema } from '../validators/notifications.js';

const router = Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, type, payload, read_at, created_at
     FROM notifications
     WHERE user_id = :user_id
     ORDER BY created_at DESC`,
    { user_id: req.user.id }
  );
  res.json({ notifications: rows });
}));

router.post('/mark-read', requireAuth, validate(markReadSchema), asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const idParams = {};
  ids.forEach((id, index) => {
    idParams[`id${index}`] = id;
  });
  const idList = Object.keys(idParams).map((key) => `:${key}`).join(',');
  await db.query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE user_id = :user_id AND id IN (${idList})`,
    { user_id: req.user.id, ...idParams }
  );
  res.status(204).send();
}));

export default router;
