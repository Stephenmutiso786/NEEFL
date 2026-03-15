import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../lib/validation.js';
import { approveResultSchema, rejectResultSchema, resolveDisputeSchema } from '../validators/admin.js';
import { applyMatchStats } from '../services/statsService.js';
import { settleBetsForMatch } from '../services/bettingService.js';
import { notifyUsers } from '../services/notificationService.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.use(requireAuth, requireRole('admin', 'supervisor', 'referee', 'moderator'));

router.get('/overview', asyncHandler(async (req, res) => {
  const [[pendingMatches]] = await db.query(
    'SELECT COUNT(*) as count FROM matches WHERE status IN ("submitted","confirmed","disputed")'
  );
  const [[openDisputes]] = await db.query(
    'SELECT COUNT(*) as count FROM disputes WHERE status = "open"'
  );
  res.json({
    pending_matches: pendingMatches.count,
    open_disputes: openDisputes.count
  });
}));

router.get('/matches', asyncHandler(async (req, res) => {
  const statusFilter = req.query.status;
  const whereClause = statusFilter ? 'WHERE m.status = :status' : '';
  const params = statusFilter ? { status: statusFilter } : {};

  const [rows] = await db.query(
    `SELECT m.id, m.tournament_id, m.round, m.player1_id, m.player2_id, m.scheduled_at, m.status, m.score1, m.score2,
            m.odds_home, m.odds_draw, m.odds_away,
            p1.gamer_tag as player1_tag,
            p2.gamer_tag as player2_tag,
            r.id as result_id, r.screenshot_url, r.video_url, r.stream_url, r.status as result_status
     FROM matches m
     LEFT JOIN players p1 ON p1.user_id = m.player1_id
     LEFT JOIN players p2 ON p2.user_id = m.player2_id
     LEFT JOIN match_results r ON r.id = (
       SELECT id FROM match_results WHERE match_id = m.id ORDER BY id DESC LIMIT 1
     )
     ${whereClause}
     ORDER BY m.scheduled_at DESC`,
    params
  );
  res.json({ matches: rows });
}));

router.get('/disputes', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT d.id, d.match_id, d.reason, d.status, d.created_at,
            m.player1_id, m.player2_id,
            p1.gamer_tag as player1_tag,
            p2.gamer_tag as player2_tag
     FROM disputes d
     JOIN matches m ON m.id = d.match_id
     LEFT JOIN players p1 ON p1.user_id = m.player1_id
     LEFT JOIN players p2 ON p2.user_id = m.player2_id
     ORDER BY d.created_at DESC`
  );
  res.json({ disputes: rows });
}));

router.post('/results/:matchId/approve', validate(approveResultSchema), asyncHandler(async (req, res) => {
  const matchId = Number(req.params.matchId);

  const [rows] = await db.query(
    `SELECT m.id, m.player1_id, m.player2_id,
            r.id as result_id, r.score1, r.score2
     FROM matches m
     JOIN match_results r ON r.match_id = m.id
     WHERE m.id = :id
     ORDER BY r.id DESC LIMIT 1`,
    { id: matchId }
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }

  const match = rows[0];
  let winnerId = null;
  if (match.score1 > match.score2) {
    winnerId = match.player1_id;
  } else if (match.score2 > match.score1) {
    winnerId = match.player2_id;
  }

  await db.tx(async (conn) => {
    await conn.execute(
      `UPDATE match_results
       SET status = 'approved', admin_approved_by = :admin_id, admin_approved_at = NOW()
       WHERE id = :id`,
      { id: match.result_id, admin_id: req.user.id }
    );

    await conn.execute(
      `UPDATE matches
       SET status = 'approved', winner_id = :winner_id
       WHERE id = :id`,
      { id: matchId, winner_id: winnerId }
    );

    await applyMatchStats(conn, {
      player1_id: match.player1_id,
      player2_id: match.player2_id,
      score1: match.score1,
      score2: match.score2
    });

    await settleBetsForMatch(conn, {
      matchId,
      score1: match.score1,
      score2: match.score2
    });
  });

  await notifyUsers(db, [match.player1_id, match.player2_id], 'result_approved', {
    match_id: matchId,
    winner_id: winnerId
  });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'result_approved',
    entityType: 'match',
    entityId: matchId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(200).json({ status: 'approved', winner_id: winnerId });
}));

router.post('/results/:matchId/reject', validate(rejectResultSchema), asyncHandler(async (req, res) => {
  const matchId = Number(req.params.matchId);
  const { reason } = req.body;

  const [rows] = await db.query(
    `SELECT m.id, m.player1_id, m.player2_id,
            r.id as result_id
     FROM matches m
     JOIN match_results r ON r.match_id = m.id
     WHERE m.id = :id
     ORDER BY r.id DESC LIMIT 1`,
    { id: matchId }
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }

  const match = rows[0];

  await db.tx(async (conn) => {
    await conn.execute(
      `UPDATE match_results
       SET status = 'rejected'
       WHERE id = :id`,
      { id: match.result_id }
    );
    await conn.execute(
      `UPDATE matches
       SET status = 'scheduled', score1 = NULL, score2 = NULL, winner_id = NULL
       WHERE id = :id`,
      { id: matchId }
    );
  });

  await notifyUsers(db, [match.player1_id, match.player2_id], 'result_rejected', {
    match_id: matchId,
    reason: reason || null
  });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'result_rejected',
    entityType: 'match',
    entityId: matchId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(200).json({ status: 'rejected' });
}));

router.post('/disputes/:id/resolve', validate(resolveDisputeSchema), asyncHandler(async (req, res) => {
  const { status, resolution } = req.body;

  const [disputes] = await db.query(
    `SELECT d.id, d.match_id, d.raised_by, m.player1_id, m.player2_id
     FROM disputes d
     JOIN matches m ON m.id = d.match_id
     WHERE d.id = :id`,
    { id: req.params.id }
  );
  if (!disputes.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const dispute = disputes[0];

  await db.query(
    `UPDATE disputes
     SET status = :status, resolution = :resolution, resolved_by = :resolved_by, resolved_at = NOW()
     WHERE id = :id`,
    { status, resolution, resolved_by: req.user.id, id: req.params.id }
  );

  await notifyUsers(db, [dispute.raised_by, dispute.player1_id, dispute.player2_id], 'dispute_resolved', {
    dispute_id: dispute.id,
    status
  });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'dispute_resolved',
    entityType: 'dispute',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(204).send();
}));

export default router;
