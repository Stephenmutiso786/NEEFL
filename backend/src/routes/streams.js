import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const streamSchema = z.object({
  match_id: z.number(),
  platform: z.enum(['youtube', 'twitch', 'facebook']),
  url: z.string().url()
});

router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, match_id, user_id, platform, url, created_at
     FROM streams
     ORDER BY created_at DESC`
  );
  res.json({ streams: rows });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const allowedRoles = ['player', 'supervisor', 'referee', 'admin', 'broadcaster'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const parsed = streamSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
  }
  const { match_id, platform, url } = parsed.data;

  await db.query(
    `INSERT INTO streams (match_id, user_id, platform, url)
     VALUES (:match_id, :user_id, :platform, :url)`,
    { match_id, user_id: req.user.id, platform, url }
  );

  res.status(201).json({ status: 'created' });
}));

export default router;
