import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../lib/validation.js';
import { achievementCreateSchema, achievementAwardSchema } from '../validators/achievements.js';
import { logActivity } from '../services/activityService.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, name, description, icon_url, points
     FROM achievements
     ORDER BY created_at DESC`
  );
  res.json({ achievements: rows });
}));

router.get('/players/:id', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT a.id, a.name, a.description, a.icon_url, a.points, ua.awarded_at
     FROM user_achievements ua
     JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.user_id = :user_id
     ORDER BY ua.awarded_at DESC`,
    { user_id: req.params.id }
  );
  res.json({ achievements: rows });
}));

router.post('/admin', requireAuth, requireRole('admin'), validate(achievementCreateSchema), asyncHandler(async (req, res) => {
  const { name, description, icon_url, points } = req.body;
  const [result] = await db.query(
    `INSERT INTO achievements (name, description, icon_url, points)
     VALUES (:name, :description, :icon_url, :points)`,
    {
      name,
      description: description || null,
      icon_url: icon_url || null,
      points: Number.isFinite(points) ? points : 0
    }
  );
  res.status(201).json({ id: result.insertId });
}));

router.post('/admin/:id/award', requireAuth, requireRole('admin'), validate(achievementAwardSchema), asyncHandler(async (req, res) => {
  const achievementId = Number(req.params.id);
  const { user_id } = req.body;

  await db.query(
    `INSERT INTO user_achievements (achievement_id, user_id, awarded_by)
     VALUES (:achievement_id, :user_id, :awarded_by)
     ON DUPLICATE KEY UPDATE awarded_at = NOW(), awarded_by = :awarded_by`,
    {
      achievement_id: achievementId,
      user_id,
      awarded_by: req.user.id
    }
  );

  await logActivity(db, {
    actorUserId: user_id,
    verb: 'achievement_awarded',
    entityType: 'achievement',
    entityId: achievementId,
    visibility: 'public',
    payload: { achievement_id: achievementId }
  });

  res.status(201).json({ status: 'awarded' });
}));

export default router;
