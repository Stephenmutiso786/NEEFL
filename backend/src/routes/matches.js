import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { upload } from '../services/uploadService.js';
import { env } from '../config/env.js';
import { submitResultSchema, confirmResultSchema, disputeSchema, liveDataSchema } from '../validators/matches.js';
import { notifyUsers } from '../services/notificationService.js';
import { submitLiveStreamSchema } from '../validators/liveStreams.js';

const router = Router();

router.get('/:id', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT m.id, m.tournament_id, m.round, m.player1_id, m.player2_id, m.referee_id, m.scheduled_at, m.status,
            m.score1, m.score2, m.winner_id, m.match_fee, m.odds_home, m.odds_draw, m.odds_away,
            m.live_status, m.live_phase, m.live_timer_mode, m.live_timer_started_at, m.live_timer_offset_seconds,
            m.betting_status, m.viewer_peak, m.viewer_total_seconds,
            t.name as tournament_name,
            p1.gamer_tag as player1_tag,
            p2.gamer_tag as player2_tag,
            p1.preferred_team as player1_team,
            p2.preferred_team as player2_team,
            pref.gamer_tag as referee_tag
     FROM matches m
     JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN players p1 ON p1.user_id = m.player1_id
     LEFT JOIN players p2 ON p2.user_id = m.player2_id
     LEFT JOIN players pref ON pref.user_id = m.referee_id
     WHERE m.id = :id`,
    { id: req.params.id }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json({ match: rows[0] });
}));

router.get('/:id/live-data', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT COALESCE(live_score1, score1, 0) AS score1,
            COALESCE(live_score2, score2, 0) AS score2,
            live_clock,
            live_timer_mode,
            live_timer_started_at,
            live_timer_offset_seconds,
            live_phase,
            live_status
     FROM matches
     WHERE id = :id`,
    { id: req.params.id }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }

  const match = rows[0];
  let clock = match.live_clock || null;
  if (match.live_timer_mode === 'auto') {
    const offset = Number(match.live_timer_offset_seconds || 0);
    if (match.live_status === 'live' && match.live_timer_started_at) {
      const started = new Date(match.live_timer_started_at).getTime();
      const now = Date.now();
      if (!Number.isNaN(started)) {
        const elapsed = Math.max(0, Math.floor((now - started) / 1000) + offset);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        clock = `${mins}:${String(secs).padStart(2, '0')}`;
      }
    } else if (offset > 0) {
      const mins = Math.floor(offset / 60);
      const secs = offset % 60;
      clock = `${mins}:${String(secs).padStart(2, '0')}`;
    }
  }

  res.json({
    live: {
      score1: match.score1,
      score2: match.score2,
      clock,
      phase: match.live_phase,
      status: match.live_status
    }
  });
}));

router.put('/:id/live-data', requireAuth, requireRole('admin', 'supervisor', 'referee'), asyncHandler(async (req, res) => {
  const parsed = liveDataSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
  }

  const { score1, score2, clock } = parsed.data;
  const [result] = await db.query(
    `UPDATE matches
     SET live_score1 = :score1,
         live_score2 = :score2,
         live_clock = :clock
     WHERE id = :id`,
    { score1, score2, clock: clock || null, id: req.params.id }
  );
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json({ live: { score1, score2, clock: clock || null } });
}));

router.get('/:id/stream', optionalAuth, asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const [rows] = await db.query(
    `SELECT id, match_id, stream_platform, stream_link, stream_link_hd, stream_link_sd, stream_link_audio,
            access_level, status, created_at
     FROM live_streams
     WHERE match_id = :match_id AND status IN ('live','approved')
     ORDER BY created_at DESC
     LIMIT 1`,
    { match_id: matchId }
  );
  const stream = rows[0] || null;
  if (!stream) {
    return res.json({ stream: null });
  }

  if (stream.access_level === 'registered' && !req.user) {
    return res.status(401).json({ error: 'login_required' });
  }
  if (stream.access_level === 'premium') {
    if (!req.user) {
      return res.status(401).json({ error: 'login_required' });
    }
    if (!req.user.is_premium && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'premium_required' });
    }
  }

  res.json({ stream });
}));

router.post('/:id/stream', requireAuth, requireRole('player', 'supervisor', 'referee', 'admin', 'broadcaster'), asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const parsed = submitLiveStreamSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
  }

  const [matches] = await db.query(
    'SELECT id FROM matches WHERE id = :id',
    { id: matchId }
  );
  if (!matches.length) {
    return res.status(404).json({ error: 'not_found' });
  }

  const isAdmin = req.user.role === 'admin';
  const status = isAdmin ? 'live' : 'pending';
  const accessLevel = isAdmin && parsed.data.access_level ? parsed.data.access_level : 'public';

  const [result] = await db.tx(async (conn) => {
    if (isAdmin) {
      await conn.execute(
        `UPDATE live_streams
         SET status = 'ended'
         WHERE match_id = :match_id AND status = 'live'`,
        { match_id: matchId }
      );
    }

    return conn.execute(
      `INSERT INTO live_streams (
          match_id, stream_platform, stream_link, stream_link_hd, stream_link_sd, stream_link_audio,
          access_level, status, created_by, approved_by, approved_at
       )
       VALUES (
          :match_id, :stream_platform, :stream_link, :stream_link_hd, :stream_link_sd, :stream_link_audio,
          :access_level, :status, :created_by, :approved_by, :approved_at
       )
       RETURNING id`,
      {
        match_id: matchId,
        stream_platform: parsed.data.stream_platform,
        stream_link: parsed.data.stream_link,
        stream_link_hd: parsed.data.stream_link_hd || null,
        stream_link_sd: parsed.data.stream_link_sd || null,
        stream_link_audio: parsed.data.stream_link_audio || null,
        access_level: accessLevel,
        status,
        created_by: req.user.id,
        approved_by: isAdmin ? req.user.id : null,
        approved_at: isAdmin ? new Date() : null
      }
    );
  });

  res.status(201).json({ id: result.insertId, status });
}));

router.post('/:id/submit-result', requireAuth, upload.single('screenshot'), asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);

  const score1 = Number(req.body.score1);
  const score2 = Number(req.body.score2);
  const payload = {
    score1,
    score2,
    video_url: req.body.video_url,
    stream_url: req.body.stream_url
  };
  const parsed = submitResultSchema.safeParse(payload);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
  }

  const [rows] = await db.query(
    `SELECT id, player1_id, player2_id, status
     FROM matches WHERE id = :id`,
    { id: matchId }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }

  const match = rows[0];
  if (![match.player1_id, match.player2_id].includes(req.user.id)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const screenshotUrl = req.file
    ? `${env.baseUrl}/uploads/${req.file.filename}`
    : null;

  await db.tx(async (conn) => {
    await conn.execute(
      `INSERT INTO match_results (match_id, submitted_by, score1, score2, screenshot_url, video_url, stream_url, status)
       VALUES (:match_id, :submitted_by, :score1, :score2, :screenshot_url, :video_url, :stream_url, 'submitted')`,
      {
        match_id: matchId,
        submitted_by: req.user.id,
        score1: score1,
        score2: score2,
        screenshot_url: screenshotUrl,
        video_url: payload.video_url || null,
        stream_url: payload.stream_url || null
      }
    );

    await conn.execute(
      `UPDATE matches
       SET status = 'submitted', score1 = :score1, score2 = :score2
       WHERE id = :id`,
      { score1: score1, score2: score2, id: matchId }
    );
  });

  const opponentId = match.player1_id === req.user.id ? match.player2_id : match.player1_id;
  await notifyUsers(db, [opponentId], 'result_submitted', {
    match_id: matchId,
    submitted_by: req.user.id
  });

  res.status(201).json({ status: 'submitted' });
}));

router.post('/:id/confirm-result', requireAuth, asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const parsed = confirmResultSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
  }

  const [matches] = await db.query(
    `SELECT id, player1_id, player2_id FROM matches WHERE id = :id`,
    { id: matchId }
  );
  if (!matches.length) {
    return res.status(404).json({ error: 'not_found' });
  }

  const match = matches[0];
  if (![match.player1_id, match.player2_id].includes(req.user.id)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const [results] = await db.query(
    `SELECT id, submitted_by, status FROM match_results
     WHERE match_id = :match_id ORDER BY id DESC LIMIT 1`,
    { match_id: matchId }
  );
  if (!results.length) {
    return res.status(400).json({ error: 'no_result' });
  }

  const result = results[0];
  if (result.submitted_by === req.user.id) {
    return res.status(400).json({ error: 'cannot_confirm_own_result' });
  }

  await db.tx(async (conn) => {
    await conn.execute(
      `UPDATE match_results
       SET status = 'confirmed', opponent_confirmed_at = NOW()
       WHERE id = :id`,
      { id: result.id }
    );
    await conn.execute(
      `UPDATE matches SET status = 'confirmed' WHERE id = :id`,
      { id: matchId }
    );
  });

  await notifyUsers(db, [match.player1_id, match.player2_id], 'result_confirmed', {
    match_id: matchId
  });

  res.status(200).json({ status: 'confirmed' });
}));

router.post('/:id/dispute', requireAuth, asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const parsed = disputeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
  }

  const [matches] = await db.query(
    `SELECT id, player1_id, player2_id FROM matches WHERE id = :id`,
    { id: matchId }
  );
  if (!matches.length) {
    return res.status(404).json({ error: 'not_found' });
  }

  const match = matches[0];
  if (![match.player1_id, match.player2_id].includes(req.user.id)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  await db.tx(async (conn) => {
    await conn.execute(
      `INSERT INTO disputes (match_id, raised_by, reason, status)
       VALUES (:match_id, :raised_by, :reason, 'open')`,
      { match_id: matchId, raised_by: req.user.id, reason: parsed.data.reason }
    );
    await conn.execute(
      `UPDATE matches SET status = 'disputed' WHERE id = :id`,
      { id: matchId }
    );
  });

  await notifyUsers(db, [match.player1_id, match.player2_id], 'match_disputed', {
    match_id: matchId,
    raised_by: req.user.id
  });

  res.status(201).json({ status: 'disputed' });
}));

export default router;
