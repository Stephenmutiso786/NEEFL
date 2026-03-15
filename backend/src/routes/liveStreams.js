import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../lib/validation.js';
import { reviewLiveStreamSchema } from '../validators/liveStreams.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('admin', 'supervisor', 'referee', 'moderator', 'broadcaster'), asyncHandler(async (req, res) => {
  const status = req.query.status;
  const whereClause = status ? 'WHERE ls.status = :status' : '';
  const params = status ? { status } : {};

  const [rows] = await db.query(
    `SELECT ls.id, ls.match_id, ls.stream_platform, ls.stream_link, ls.stream_link_hd, ls.stream_link_sd,
            ls.stream_link_audio, ls.access_level, ls.status, ls.notes,
            ls.created_by, ls.created_at, ls.approved_by, ls.approved_at,
            p1.gamer_tag as player1_tag, p2.gamer_tag as player2_tag
     FROM live_streams ls
     LEFT JOIN matches m ON m.id = ls.match_id
     LEFT JOIN players p1 ON p1.user_id = m.player1_id
     LEFT JOIN players p2 ON p2.user_id = m.player2_id
     ${whereClause}
     ORDER BY ls.created_at DESC`,
    params
  );
  res.json({ streams: rows });
}));

router.put('/:id/approve', requireRole('admin'), validate(reviewLiveStreamSchema), asyncHandler(async (req, res) => {
  const { notes } = req.body;
  await db.tx(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT match_id FROM live_streams WHERE id = :id`,
      { id: req.params.id }
    );
    const matchId = rows?.[0]?.match_id;
    if (matchId) {
      await conn.execute(
        `UPDATE live_streams
         SET status = 'ended'
         WHERE match_id = :match_id AND status = 'live' AND id <> :id`,
        { match_id: matchId, id: req.params.id }
      );
    }
    await conn.execute(
      `UPDATE live_streams
       SET status = 'live', notes = :notes, approved_by = :approved_by, approved_at = NOW()
       WHERE id = :id`,
      { notes: notes || null, approved_by: req.user.id, id: req.params.id }
    );
  });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'live_stream_approved',
    entityType: 'live_stream',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

router.put('/:id/end', requireRole('admin'), validate(reviewLiveStreamSchema), asyncHandler(async (req, res) => {
  const { notes } = req.body;
  await db.query(
    `UPDATE live_streams
     SET status = 'ended', notes = :notes, approved_by = :approved_by, approved_at = NOW()
     WHERE id = :id`,
    { notes: notes || null, approved_by: req.user.id, id: req.params.id }
  );
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'live_stream_ended',
    entityType: 'live_stream',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

router.put('/:id/reject', requireRole('admin'), validate(reviewLiveStreamSchema), asyncHandler(async (req, res) => {
  const { notes } = req.body;
  await db.query(
    `UPDATE live_streams
     SET status = 'rejected', notes = :notes, approved_by = :approved_by, approved_at = NOW()
     WHERE id = :id`,
    { notes: notes || null, approved_by: req.user.id, id: req.params.id }
  );
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'live_stream_rejected',
    entityType: 'live_stream',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

export default router;
