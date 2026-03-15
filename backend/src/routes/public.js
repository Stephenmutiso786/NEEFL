import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { fetchRolePermissions, permissionsForRole } from '../services/rolePermissions.js';

const router = Router();

function clampLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed)) return 6;
  return Math.min(Math.max(Math.floor(parsed), 1), 50);
}

function statusFromLastSeen(lastSeen) {
  if (!lastSeen) return 'offline';
  const last = new Date(lastSeen).getTime();
  if (Number.isNaN(last)) return 'offline';
  const diffSeconds = (Date.now() - last) / 1000;
  if (diffSeconds <= 120) return 'online';
  if (diffSeconds <= 600) return 'idle';
  return 'offline';
}

async function fetchUpcoming(limit) {
  const safeLimit = clampLimit(limit);
  const [rows] = await db.query(
    `SELECT m.id, m.tournament_id, m.round, m.scheduled_at, m.status,
            m.odds_home, m.odds_draw, m.odds_away, m.betting_status,
            t.name as tournament_name,
            p1.gamer_tag as player1_tag,
            p2.gamer_tag as player2_tag
     FROM matches m
     JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN players p1 ON p1.user_id = m.player1_id
     LEFT JOIN players p2 ON p2.user_id = m.player2_id
     WHERE m.status = 'scheduled' AND m.scheduled_at >= NOW()
     ORDER BY m.scheduled_at ASC
     LIMIT ${safeLimit}`
  );
  return rows;
}

async function fetchLive(limit) {
  const safeLimit = clampLimit(limit);
  const [rows] = await db.query(
    `SELECT m.id, m.tournament_id, m.round, m.scheduled_at, m.status,
            COALESCE(m.live_score1, m.score1) AS score1,
            COALESCE(m.live_score2, m.score2) AS score2,
            m.live_status,
            t.name as tournament_name,
            p1.gamer_tag as player1_tag,
            p2.gamer_tag as player2_tag
     FROM matches m
     JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN players p1 ON p1.user_id = m.player1_id
     LEFT JOIN players p2 ON p2.user_id = m.player2_id
     WHERE m.live_status IN ('live','paused')
     ORDER BY m.updated_at DESC
     LIMIT ${safeLimit}`
  );
  return rows;
}

async function fetchResults(limit) {
  const safeLimit = clampLimit(limit);
  const [rows] = await db.query(
    `SELECT m.id, m.tournament_id, m.round, m.scheduled_at, m.status, m.score1, m.score2, m.winner_id,
            t.name as tournament_name,
            p1.gamer_tag as player1_tag,
            p2.gamer_tag as player2_tag,
            w.gamer_tag as winner_tag
     FROM matches m
     JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN players p1 ON p1.user_id = m.player1_id
     LEFT JOIN players p2 ON p2.user_id = m.player2_id
     LEFT JOIN players w ON w.user_id = m.winner_id
     WHERE m.status = 'approved'
     ORDER BY m.updated_at DESC
     LIMIT ${safeLimit}`
  );
  return rows;
}

router.get('/overview', asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 6;
  const [upcoming, live, results] = await Promise.all([
    fetchUpcoming(limit),
    fetchLive(limit),
    fetchResults(limit)
  ]);
  res.json({ upcoming, live, results });
}));

router.get('/featured-match', asyncHandler(async (req, res) => {
  const [[row]] = await db.query(
    \"SELECT setting_value FROM platform_settings WHERE setting_key = 'featured_match_id'\"
  );
  res.json({ match_id: row ? Number(row.setting_value) : null });
}));

router.get('/live-matches', asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const live = await fetchLive(limit);
  res.json({ matches: live });
}));

router.get('/upcoming-matches', asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const upcoming = await fetchUpcoming(limit);
  res.json({ matches: upcoming });
}));

router.get('/results', asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const results = await fetchResults(limit);
  res.json({ results });
}));

router.get('/odds', asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const upcoming = await fetchUpcoming(limit);
  res.json({ odds: upcoming });
}));

router.get('/policies', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT slug, title, category, updated_at
     FROM policy_documents
     WHERE status = 'published'
     ORDER BY updated_at DESC`
  );
  res.json({ policies: rows });
}));

router.get('/policies/:slug', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT slug, title, category, body, updated_at
     FROM policy_documents
     WHERE slug = :slug AND status = 'published'`,
    { slug: req.params.slug }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json({ policy: rows[0] });
}));

router.get('/maintenance', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT setting_key, setting_value
     FROM platform_settings
     WHERE setting_key IN ('maintenance_mode','maintenance_message','maintenance_end_time')`
  );
  const settings = rows.reduce((acc, row) => {
    acc[row.setting_key] = row.setting_value;
    return acc;
  }, {});
  const enabledValue = String(settings.maintenance_mode || '').toLowerCase();
  const enabled = ['1', 'true', 'yes', 'on', 'enabled'].includes(enabledValue);
  res.json({
    enabled,
    message: settings.maintenance_message || '',
    end_time: settings.maintenance_end_time || null
  });
}));

router.get('/permissions', optionalAuth, asyncHandler(async (req, res) => {
  const permissions = await fetchRolePermissions(db);
  const role = req.user?.role || 'public';
  const rolePermissions = permissionsForRole(role, permissions);
  res.json({ role, permissions: rolePermissions });
}));

router.get('/activity', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const [rows] = await db.query(
    `SELECT a.id, a.actor_id, a.verb, a.entity_type, a.entity_id, a.target_user_id, a.payload, a.created_at,
            p.gamer_tag as actor_tag,
            t.gamer_tag as target_tag
     FROM activity_feed a
     LEFT JOIN players p ON p.user_id = a.actor_id
     LEFT JOIN players t ON t.user_id = a.target_user_id
     WHERE a.visibility = 'public'
     ORDER BY a.created_at DESC
     LIMIT ${limit}`
  );
  res.json({ activity: rows });
}));

router.get('/players/search', asyncHandler(async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query || query.length < 2) {
    return res.json({ players: [] });
  }
  const [rows] = await db.query(
    `SELECT p.user_id, p.gamer_tag, p.rank_points, p.wins, p.losses
     FROM players p
     JOIN users u ON u.id = p.user_id
     WHERE u.status = 'active' AND p.gamer_tag LIKE :q
     ORDER BY p.rank_points DESC
     LIMIT 20`,
    { q: `%${query}%` }
  );
  res.json({ players: rows });
}));

router.get('/players/:id', optionalAuth, asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  const [rows] = await db.query(
    `SELECT u.id, u.privacy_profile, u.privacy_presence, u.last_seen_at,
            p.gamer_tag, p.country, p.region, p.preferred_team, p.rank_points, p.wins, p.losses, p.goals_scored, p.division,
            (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
            (SELECT COUNT(*) FROM friends WHERE status = 'accepted' AND (requester_id = u.id OR receiver_id = u.id)) as friends_count
     FROM users u
     LEFT JOIN players p ON p.user_id = u.id
     WHERE u.id = :id AND u.status = 'active'`,
    { id: userId }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const player = rows[0];

  let friendStatus = null;
  let isFriend = false;
  let isFollowing = false;
  if (req.user) {
    const [friendRows] = await db.query(
      `SELECT status FROM friends
       WHERE (requester_id = :me AND receiver_id = :other)
          OR (requester_id = :other AND receiver_id = :me)
       LIMIT 1`,
      { me: req.user.id, other: userId }
    );
    if (friendRows.length) {
      friendStatus = friendRows[0].status;
      isFriend = friendStatus === 'accepted';
    }
    const [followRows] = await db.query(
      `SELECT id FROM follows
       WHERE follower_id = :me AND following_id = :other`,
      { me: req.user.id, other: userId }
    );
    isFollowing = followRows.length > 0;
  }

  const restrictedProfile = player.privacy_profile === 'private'
    || (player.privacy_profile === 'friends' && (!req.user || (req.user.id !== userId && !isFriend)));
  if (restrictedProfile) {
    return res.json({
      player: {
        id: player.id,
        gamer_tag: player.gamer_tag,
        privacy: 'private'
      },
      restricted: true
    });
  }

  res.json({
    player: {
      id: player.id,
      gamer_tag: player.gamer_tag,
      country: player.country,
      region: player.region,
      preferred_team: player.preferred_team,
      rank_points: player.rank_points,
      wins: player.wins,
      losses: player.losses,
      goals_scored: player.goals_scored,
      division: player.division,
      followers_count: player.followers_count,
      following_count: player.following_count,
      friends_count: player.friends_count,
      presence: player.privacy_presence ? statusFromLastSeen(player.last_seen_at) : 'offline'
    },
    relation: {
      is_friend: isFriend,
      friend_status: friendStatus,
      is_following: isFollowing
    }
  });
}));

router.get('/matches/:id/events', asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const [rows] = await db.query(
    `SELECT id, event_type, side, minute, description, created_at
     FROM match_events
     WHERE match_id = :match_id
     ORDER BY created_at DESC`,
    { match_id: matchId }
  );
  res.json({ events: rows });
}));

router.get('/matches/:id/stats', asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const [rows] = await db.query(
    `SELECT possession_home, possession_away, shots_home, shots_away,
            passes_home, passes_away, fouls_home, fouls_away,
            yellow_home, yellow_away, red_home, red_away, updated_at
     FROM match_live_stats WHERE match_id = :match_id`,
    { match_id: matchId }
  );
  res.json({ stats: rows[0] || null });
}));

router.get('/matches/:id/replay', asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const [rows] = await db.query(
    `SELECT replay_url, highlights_url, created_at
     FROM match_replays WHERE match_id = :match_id`,
    { match_id: matchId }
  );
  res.json({ replay: rows[0] || null });
}));

router.get('/matches/:id/chat', asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const since = req.query.since ? Number(req.query.since) : null;
  const [rows] = await db.query(
    `SELECT id, user_id, guest_name, message, created_at
     FROM match_chat_messages
     WHERE match_id = :match_id
       AND deleted_at IS NULL
       AND (:since IS NULL OR UNIX_TIMESTAMP(created_at) > :since)
     ORDER BY created_at DESC
     LIMIT 200`,
    { match_id: matchId, since: since || null }
  );
  res.json({ messages: rows });
}));

router.post('/matches/:id/chat', optionalAuth, asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const message = String(req.body.message || '').trim();
  const guestName = req.body.guest_name ? String(req.body.guest_name).trim() : null;
  if (!message || message.length < 1 || message.length > 500) {
    return res.status(400).json({ error: 'invalid_message' });
  }

  const [[settings]] = await db.query(
    `SELECT enabled, slow_mode_seconds FROM match_chat_settings WHERE match_id = :match_id`,
    { match_id: matchId }
  );
  if (settings && Number(settings.enabled) === 0) {
    return res.status(403).json({ error: 'chat_disabled' });
  }

  const ip = req.ip;
  const [mutes] = await db.query(
    `SELECT id FROM chat_mutes
     WHERE (
       (:user_id IS NOT NULL AND user_id = :user_id) OR
       (:ip IS NOT NULL AND ip = :ip)
     )
     AND (expires_at IS NULL OR expires_at > NOW())`,
    {
      user_id: req.user?.id || null,
      ip: ip || null
    }
  );
  if (mutes.length) {
    return res.status(403).json({ error: 'muted' });
  }

  const slowMode = settings?.slow_mode_seconds ? Number(settings.slow_mode_seconds) : 0;
  if (slowMode > 0) {
    const [lastRows] = await db.query(
      `SELECT created_at FROM match_chat_messages
       WHERE match_id = :match_id AND (
         (:user_id IS NOT NULL AND user_id = :user_id) OR
         (:user_id IS NULL AND guest_ip = :guest_ip)
       )
       ORDER BY created_at DESC LIMIT 1`,
      {
        match_id: matchId,
        user_id: req.user?.id || null,
        guest_ip: req.user?.id ? null : ip
      }
    );
    if (lastRows.length) {
      const last = new Date(lastRows[0].created_at).getTime();
      if (!Number.isNaN(last)) {
        const diff = (Date.now() - last) / 1000;
        if (diff < slowMode) {
          return res.status(429).json({ error: 'slow_mode' });
        }
      }
    }
  }

  await db.query(
    `INSERT INTO match_chat_messages (match_id, user_id, guest_name, guest_ip, message)
     VALUES (:match_id, :user_id, :guest_name, :guest_ip, :message)`,
    {
      match_id: matchId,
      user_id: req.user?.id || null,
      guest_name: req.user?.id ? null : (guestName || 'Guest'),
      guest_ip: req.user?.id ? null : ip,
      message
    }
  );
  res.status(201).json({ status: 'sent' });
}));

router.post('/matches/:id/viewer', optionalAuth, asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const viewerId = String(req.body.viewer_id || '').trim();
  if (!viewerId) {
    return res.status(400).json({ error: 'viewer_id_required' });
  }

  await db.tx(async (conn) => {
    await conn.execute(
      `INSERT INTO match_viewers (match_id, viewer_id, user_id, last_seen_at)
       VALUES (:match_id, :viewer_id, :user_id, NOW())
       ON CONFLICT (match_id, viewer_id)
       DO UPDATE SET last_seen_at = NOW(), user_id = EXCLUDED.user_id`,
      { match_id: matchId, viewer_id: viewerId, user_id: req.user?.id || null }
    );

    const [[current]] = await conn.query(
      `SELECT COUNT(*) as count
       FROM match_viewers
       WHERE match_id = :match_id AND last_seen_at >= (NOW() - INTERVAL '20 seconds')`,
      { match_id: matchId }
    );
    await conn.execute(
      `UPDATE matches
       SET viewer_peak = GREATEST(viewer_peak, :peak),
           viewer_total_seconds = viewer_total_seconds + 5
       WHERE id = :id`,
      { peak: current?.count || 0, id: matchId }
    );
  });

  res.status(200).json({ status: 'tracked' });
}));

router.get('/matches/:id/viewers', asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const [[countRow]] = await db.query(
    `SELECT COUNT(*) as count
     FROM match_viewers
     WHERE match_id = :match_id AND last_seen_at >= (NOW() - INTERVAL '20 seconds')`,
    { match_id: matchId }
  );
  const [rows] = await db.query(
    `SELECT mv.user_id, p.gamer_tag, u.privacy_presence, MAX(mv.last_seen_at) AS last_seen_at
     FROM match_viewers mv
     JOIN users u ON u.id = mv.user_id
     LEFT JOIN players p ON p.user_id = mv.user_id
     WHERE mv.match_id = :match_id
       AND mv.user_id IS NOT NULL
       AND u.privacy_presence = 1
       AND mv.last_seen_at >= (NOW() - INTERVAL '20 seconds')
     GROUP BY mv.user_id, p.gamer_tag, u.privacy_presence
     ORDER BY last_seen_at DESC
     LIMIT 12`,
    { match_id: matchId }
  );
  res.json({
    count: countRow?.count || 0,
    viewers: rows.map((row) => ({
      user_id: row.user_id,
      gamer_tag: row.gamer_tag || `User ${row.user_id}`
    }))
  });
}));

router.get('/sponsors', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, name, logo_url, website_url, position
     FROM sponsors
     WHERE active = 1
     ORDER BY position ASC, created_at DESC`
  );
  res.json({ sponsors: rows });
}));

export default router;
