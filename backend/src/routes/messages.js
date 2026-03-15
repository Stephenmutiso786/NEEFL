import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../lib/validation.js';
import { messageSendSchema } from '../validators/messages.js';

const router = Router();

router.use(requireAuth);

router.get('/threads', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `
    WITH base AS (
      SELECT id, sender_id, receiver_id, message, created_at, read_at,
             CASE WHEN sender_id = :me THEN receiver_id ELSE sender_id END AS partner_id,
             CASE WHEN sender_id = :me THEN 'outbound' ELSE 'inbound' END AS direction
      FROM direct_messages
      WHERE sender_id = :me OR receiver_id = :me
    )
    SELECT DISTINCT ON (partner_id)
      partner_id,
      message,
      created_at,
      direction,
      read_at,
      u.email,
      p.gamer_tag,
      (
        SELECT COUNT(*) FROM direct_messages dm
        WHERE dm.sender_id = partner_id AND dm.receiver_id = :me AND dm.read_at IS NULL
      ) AS unread_count
    FROM base
    LEFT JOIN users u ON u.id = base.partner_id
    LEFT JOIN players p ON p.user_id = base.partner_id
    ORDER BY partner_id, created_at DESC
    `,
    { me: req.user.id }
  );

  res.json({ threads: rows });
}));

router.get('/thread/:userId', asyncHandler(async (req, res) => {
  const otherId = Number(req.params.userId);
  if (!Number.isFinite(otherId) || otherId <= 0) {
    return res.status(400).json({ error: 'invalid_target' });
  }
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const cappedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 20), 200) : 100;

  const [rows] = await db.query(
    `
    SELECT id, sender_id, receiver_id, message, read_at, created_at
    FROM direct_messages
    WHERE (sender_id = :me AND receiver_id = :other)
       OR (sender_id = :other AND receiver_id = :me)
    ORDER BY created_at ASC
    LIMIT ${cappedLimit}
    `,
    { me: req.user.id, other: otherId }
  );

  await db.query(
    `UPDATE direct_messages
     SET read_at = NOW()
     WHERE sender_id = :other AND receiver_id = :me AND read_at IS NULL`,
    { me: req.user.id, other: otherId }
  );

  res.json({ messages: rows });
}));

router.post('/thread/:userId', validate(messageSendSchema), asyncHandler(async (req, res) => {
  const otherId = Number(req.params.userId);
  if (otherId === req.user.id) {
    return res.status(400).json({ error: 'invalid_target' });
  }

  const [users] = await db.query(
    'SELECT id, status FROM users WHERE id = :id',
    { id: otherId }
  );
  if (!users.length || users[0].status !== 'active') {
    return res.status(404).json({ error: 'not_found' });
  }

  const { message } = req.body;

  const [result] = await db.query(
    `INSERT INTO direct_messages (sender_id, receiver_id, message)
     VALUES (:sender_id, :receiver_id, :message)
     RETURNING id`,
    { sender_id: req.user.id, receiver_id: otherId, message }
  );

  res.status(201).json({ id: result.insertId });
}));

export default router;
