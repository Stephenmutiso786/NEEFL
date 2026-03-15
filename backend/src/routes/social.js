import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../lib/validation.js';
import { friendRequestSchema, followSchema, privacySchema } from '../validators/social.js';
import { logActivity } from '../services/activityService.js';

const router = Router();

function statusFromLastSeen(lastSeen) {
  if (!lastSeen) return 'offline';
  const last = new Date(lastSeen).getTime();
  if (Number.isNaN(last)) return 'offline';
  const diffSeconds = (Date.now() - last) / 1000;
  if (diffSeconds <= 120) return 'online';
  if (diffSeconds <= 600) return 'idle';
  return 'offline';
}

router.post('/presence/ping', requireAuth, asyncHandler(async (req, res) => {
  await db.query(
    'UPDATE users SET last_seen_at = NOW() WHERE id = :id',
    { id: req.user.id }
  );
  res.json({ status: 'ok' });
}));

router.get('/presence/online', requireAuth, asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const [rows] = await db.query(
    `SELECT u.id, u.last_seen_at, u.privacy_presence,
            p.gamer_tag
     FROM users u
     LEFT JOIN players p ON p.user_id = u.id
     WHERE u.status = 'active' AND u.privacy_presence = 1
     ORDER BY u.last_seen_at DESC
     LIMIT ${limit}`
  );
  const users = rows.map((row) => ({
    id: row.id,
    gamer_tag: row.gamer_tag || `User ${row.id}`,
    status: statusFromLastSeen(row.last_seen_at),
    last_seen_at: row.last_seen_at
  }));
  res.json({ users });
}));

router.get('/friends', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT f.id, f.requester_id, f.receiver_id, f.status, f.created_at,
            u.id as user_id, u.last_seen_at, u.privacy_presence,
            p.gamer_tag
     FROM friends f
     JOIN users u ON u.id = IF(f.requester_id = :id, f.receiver_id, f.requester_id)
     LEFT JOIN players p ON p.user_id = u.id
     WHERE (f.requester_id = :id OR f.receiver_id = :id)
       AND f.status = 'accepted'
     ORDER BY f.updated_at DESC`,
    { id: req.user.id }
  );
  const friends = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    gamer_tag: row.gamer_tag || `User ${row.user_id}`,
    status: row.privacy_presence ? statusFromLastSeen(row.last_seen_at) : 'offline',
    last_seen_at: row.last_seen_at
  }));
  res.json({ friends });
}));

router.get('/friends/requests', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT f.id, f.requester_id, f.receiver_id, f.status, f.created_at,
            p1.gamer_tag as requester_tag,
            p2.gamer_tag as receiver_tag
     FROM friends f
     LEFT JOIN players p1 ON p1.user_id = f.requester_id
     LEFT JOIN players p2 ON p2.user_id = f.receiver_id
     WHERE (f.requester_id = :id OR f.receiver_id = :id)
       AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    { id: req.user.id }
  );
  const incoming = rows.filter((row) => row.receiver_id === req.user.id);
  const outgoing = rows.filter((row) => row.requester_id === req.user.id);
  res.json({ incoming, outgoing });
}));

router.post('/friends/request', requireAuth, validate(friendRequestSchema), asyncHandler(async (req, res) => {
  const targetId = req.body.user_id;
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'invalid_target' });
  }

  const [targets] = await db.query(
    'SELECT id, privacy_friend_requests, status FROM users WHERE id = :id',
    { id: targetId }
  );
  if (!targets.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  if (targets[0].status !== 'active') {
    return res.status(403).json({ error: 'user_unavailable' });
  }
  if (!targets[0].privacy_friend_requests) {
    return res.status(403).json({ error: 'friend_requests_closed' });
  }

  const [existing] = await db.query(
    `SELECT id, requester_id, receiver_id, status
     FROM friends
     WHERE (requester_id = :me AND receiver_id = :other)
        OR (requester_id = :other AND receiver_id = :me)
     LIMIT 1`,
    { me: req.user.id, other: targetId }
  );

  if (existing.length) {
    const row = existing[0];
    if (row.status === 'accepted') {
      return res.status(409).json({ error: 'already_friends' });
    }
    if (row.status === 'pending') {
      return res.status(409).json({ error: row.requester_id === req.user.id ? 'request_pending' : 'incoming_request' });
    }
    await db.query(
      `UPDATE friends
       SET requester_id = :me, receiver_id = :other, status = 'pending'
       WHERE id = :id`,
      { me: req.user.id, other: targetId, id: row.id }
    );
    return res.status(200).json({ status: 'pending' });
  }

  const [result] = await db.query(
    `INSERT INTO friends (requester_id, receiver_id, status)
     VALUES (:requester_id, :receiver_id, 'pending')
     RETURNING id`,
    { requester_id: req.user.id, receiver_id: targetId }
  );
  res.status(201).json({ id: result.insertId, status: 'pending' });
}));

router.post('/friends/:id/accept', requireAuth, asyncHandler(async (req, res) => {
  const requestId = Number(req.params.id);
  const [rows] = await db.query(
    `SELECT id, requester_id, receiver_id, status
     FROM friends
     WHERE id = :id AND receiver_id = :user_id`,
    { id: requestId, user_id: req.user.id }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  if (rows[0].status !== 'pending') {
    return res.status(400).json({ error: 'not_pending' });
  }

  await db.query(
    `UPDATE friends SET status = 'accepted' WHERE id = :id`,
    { id: requestId }
  );

  await logActivity(db, {
    actorUserId: req.user.id,
    verb: 'friend_added',
    entityType: 'friend',
    entityId: requestId,
    targetUserId: rows[0].requester_id,
    visibility: 'friends',
    payload: { friend_id: rows[0].requester_id }
  });

  res.status(200).json({ status: 'accepted' });
}));

router.post('/friends/:id/reject', requireAuth, asyncHandler(async (req, res) => {
  const requestId = Number(req.params.id);
  const [rows] = await db.query(
    `SELECT id FROM friends WHERE id = :id AND receiver_id = :user_id`,
    { id: requestId, user_id: req.user.id }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  await db.query(
    `UPDATE friends SET status = 'rejected' WHERE id = :id`,
    { id: requestId }
  );
  res.status(200).json({ status: 'rejected' });
}));

router.delete('/friends/:id', requireAuth, asyncHandler(async (req, res) => {
  const friendId = Number(req.params.id);
  await db.query(
    `DELETE FROM friends
     WHERE id = :id AND (requester_id = :user_id OR receiver_id = :user_id)`,
    { id: friendId, user_id: req.user.id }
  );
  res.status(204).send();
}));

router.post('/follow', requireAuth, validate(followSchema), asyncHandler(async (req, res) => {
  const targetId = req.body.user_id;
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'invalid_target' });
  }
  const [targets] = await db.query(
    'SELECT id, privacy_follow, status FROM users WHERE id = :id',
    { id: targetId }
  );
  if (!targets.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  if (targets[0].status !== 'active') {
    return res.status(403).json({ error: 'user_unavailable' });
  }
  if (!targets[0].privacy_follow) {
    return res.status(403).json({ error: 'follow_closed' });
  }
  await db.query(
    `INSERT INTO follows (follower_id, following_id)
     VALUES (:follower_id, :following_id)
     ON CONFLICT (follower_id, following_id) DO NOTHING`,
    { follower_id: req.user.id, following_id: targetId }
  );

  await logActivity(db, {
    actorUserId: req.user.id,
    verb: 'followed',
    entityType: 'user',
    entityId: targetId,
    targetUserId: targetId,
    visibility: 'public',
    payload: { user_id: targetId }
  });

  res.status(201).json({ status: 'following' });
}));

router.delete('/follow/:id', requireAuth, asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  await db.query(
    `DELETE FROM follows WHERE follower_id = :follower_id AND following_id = :following_id`,
    { follower_id: req.user.id, following_id: targetId }
  );
  res.status(204).send();
}));

router.get('/followers', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT f.id, f.follower_id as user_id, u.last_seen_at, u.privacy_presence, p.gamer_tag
     FROM follows f
     JOIN users u ON u.id = f.follower_id
     LEFT JOIN players p ON p.user_id = u.id
     WHERE f.following_id = :id
     ORDER BY f.created_at DESC`,
    { id: req.user.id }
  );
  const followers = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    gamer_tag: row.gamer_tag || `User ${row.user_id}`,
    status: row.privacy_presence ? statusFromLastSeen(row.last_seen_at) : 'offline'
  }));
  res.json({ followers });
}));

router.get('/following', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT f.id, f.following_id as user_id, u.last_seen_at, u.privacy_presence, p.gamer_tag
     FROM follows f
     JOIN users u ON u.id = f.following_id
     LEFT JOIN players p ON p.user_id = u.id
     WHERE f.follower_id = :id
     ORDER BY f.created_at DESC`,
    { id: req.user.id }
  );
  const following = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    gamer_tag: row.gamer_tag || `User ${row.user_id}`,
    status: row.privacy_presence ? statusFromLastSeen(row.last_seen_at) : 'offline'
  }));
  res.json({ following });
}));

router.get('/activity', requireAuth, asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const [friendRows] = await db.query(
    `SELECT CASE WHEN requester_id = :id THEN receiver_id ELSE requester_id END as friend_id
     FROM friends
     WHERE (requester_id = :id OR receiver_id = :id) AND status = 'accepted'`,
    { id: req.user.id }
  );
  const friendIds = friendRows.map((row) => row.friend_id);
  const params = { user_id: req.user.id };
  let friendFilter = '';
  if (friendIds.length) {
    friendFilter = ` OR (a.visibility = 'friends' AND a.actor_id IN (${friendIds.map((_, idx) => `:friend_${idx}`).join(',')}))`;
    friendIds.forEach((id, idx) => { params[`friend_${idx}`] = id; });
  }

  const [rows] = await db.query(
    `SELECT a.id, a.actor_id, a.verb, a.entity_type, a.entity_id, a.target_user_id, a.visibility,
            a.payload, a.created_at,
            p.gamer_tag as actor_tag,
            t.gamer_tag as target_tag
     FROM activity_feed a
     LEFT JOIN players p ON p.user_id = a.actor_id
     LEFT JOIN players t ON t.user_id = a.target_user_id
     WHERE a.visibility = 'public'
        OR a.actor_id = :user_id
        ${friendFilter}
     ORDER BY a.created_at DESC
     LIMIT ${limit}`,
    params
  );
  res.json({ activity: rows });
}));

router.get('/privacy', requireAuth, asyncHandler(async (req, res) => {
  const [[row]] = await db.query(
    `SELECT privacy_profile, privacy_presence, privacy_friend_requests, privacy_follow
     FROM users WHERE id = :id`,
    { id: req.user.id }
  );
  res.json({ privacy: row });
}));

router.put('/privacy', requireAuth, validate(privacySchema), asyncHandler(async (req, res) => {
  const { privacy_profile, privacy_presence, privacy_friend_requests, privacy_follow } = req.body;
  await db.query(
    `UPDATE users
     SET privacy_profile = COALESCE(:privacy_profile, privacy_profile),
         privacy_presence = COALESCE(:privacy_presence, privacy_presence),
         privacy_friend_requests = COALESCE(:privacy_friend_requests, privacy_friend_requests),
         privacy_follow = COALESCE(:privacy_follow, privacy_follow)
     WHERE id = :id`,
    {
      privacy_profile: privacy_profile || null,
      privacy_presence: privacy_presence === undefined ? null : (privacy_presence ? 1 : 0),
      privacy_friend_requests: privacy_friend_requests === undefined ? null : (privacy_friend_requests ? 1 : 0),
      privacy_follow: privacy_follow === undefined ? null : (privacy_follow ? 1 : 0),
      id: req.user.id
    }
  );
  res.status(204).send();
}));

export default router;
