import { Router } from 'express';
import dayjs from 'dayjs';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../lib/validation.js';
import {
  approveResultSchema,
  resolveDisputeSchema,
  setRoleSchema,
  rejectResultSchema,
  updateTournamentSchema,
  createMatchSchema,
  updateMatchSchema,
  settingsSchema,
  updateOddsSchema,
  broadcastControlSchema,
  bettingStatusSchema,
  matchEventSchema,
  liveStatsSchema,
  replaySchema,
  chatSettingsSchema,
  chatMuteSchema,
  featuredMatchSchema,
  premiumSchema,
  tournamentEntryStatusSchema,
  resetUserPasswordSchema
} from '../validators/admin.js';
import { applyMatchStats } from '../services/statsService.js';
import { settleBetsForMatch, voidBetsForMatch } from '../services/bettingService.js';
import { notifyUsers } from '../services/notificationService.js';
import { logAudit } from '../services/auditService.js';
import { logActivity } from '../services/activityService.js';
import { sendNotificationSchema } from '../validators/notifications.js';
import { runDatabaseBackup } from '../services/backupService.js';
import { updateProfileSchema } from '../validators/players.js';
import { hashPassword } from '../lib/crypto.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

async function collectMatchUserIds(matchId) {
  const [matchRows] = await db.query(
    'SELECT player1_id, player2_id FROM matches WHERE id = :id',
    { id: matchId }
  );
  const match = matchRows[0];
  const [betRows] = await db.query(
    'SELECT DISTINCT user_id FROM bets WHERE match_id = :id',
    { id: matchId }
  );
  const bettorIds = betRows.map((row) => row.user_id);
  return [match?.player1_id, match?.player2_id, ...bettorIds].filter(Boolean);
}

router.get('/dashboard', asyncHandler(async (req, res) => {
  const [[players]] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "player"');
  const [[tournaments]] = await db.query('SELECT COUNT(*) as count FROM tournaments');
  const [[matches]] = await db.query('SELECT COUNT(*) as count FROM matches WHERE status IN ("scheduled","submitted","confirmed","disputed")');
  const [[disputes]] = await db.query('SELECT COUNT(*) as count FROM disputes WHERE status = "open"');
  const [[payments]] = await db.query('SELECT SUM(amount) as total FROM payments WHERE status = "paid"');
  const [[withdrawals]] = await db.query('SELECT COUNT(*) as count FROM withdrawal_requests WHERE status IN ("pending","approved")');

  res.json({
    players: players.count,
    tournaments: tournaments.count,
    pending_matches: matches.count,
    open_disputes: disputes.count,
    revenue: payments.total || 0,
    pending_withdrawals: withdrawals.count
  });
}));

router.get('/players', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT u.id, u.email, u.phone, u.role, u.status, u.is_premium, u.kyc_status, u.created_at,
            p.gamer_tag, p.real_name, p.country, p.region, p.preferred_team,
            p.rank_points, p.wins, p.losses, p.goals_scored, p.division
     FROM users u
     LEFT JOIN players p ON p.user_id = u.id
     ORDER BY u.created_at DESC`
  );
  res.json({ players: rows });
}));

router.put('/players/:id', validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const updates = req.body;
  if (updates.gamer_tag) {
    const [existing] = await db.query(
      'SELECT user_id FROM players WHERE gamer_tag = :gamer_tag AND user_id != :user_id',
      { gamer_tag: updates.gamer_tag, user_id: req.params.id }
    );
    if (existing.length) {
      return res.status(409).json({ error: 'gamer_tag_taken' });
    }
  }

  await db.query(
    `UPDATE players
     SET gamer_tag = COALESCE(:gamer_tag, gamer_tag),
         real_name = COALESCE(:real_name, real_name),
         country = COALESCE(:country, country),
         region = COALESCE(:region, region),
         preferred_team = COALESCE(:preferred_team, preferred_team)
     WHERE user_id = :user_id`,
    {
      gamer_tag: updates.gamer_tag || null,
      real_name: updates.real_name || null,
      country: updates.country || null,
      region: updates.region || null,
      preferred_team: updates.preferred_team || null,
      user_id: req.params.id
    }
  );

  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'player_updated',
    entityType: 'player',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(204).send();
}));

router.post('/users/:id/approve', asyncHandler(async (req, res) => {
  await db.query(
    'UPDATE users SET status = "active" WHERE id = :id',
    { id: req.params.id }
  );
  await notifyUsers(db, [Number(req.params.id)], 'user_approved', { user_id: Number(req.params.id) });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'user_approved',
    entityType: 'user',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

router.post('/users/:id/ban', asyncHandler(async (req, res) => {
  await db.query(
    'UPDATE users SET status = "banned" WHERE id = :id',
    { id: req.params.id }
  );
  await notifyUsers(db, [Number(req.params.id)], 'user_banned', { user_id: Number(req.params.id) });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'user_banned',
    entityType: 'user',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

router.post('/users/:id/reset-password', validate(resetUserPasswordSchema), asyncHandler(async (req, res) => {
  const passwordHash = await hashPassword(req.body.new_password);
  await db.query(
    `UPDATE users
     SET password_hash = :password_hash,
         failed_login_attempts = 0,
         locked_until = NULL
     WHERE id = :id`,
    { password_hash: passwordHash, id: req.params.id }
  );
  await notifyUsers(db, [Number(req.params.id)], 'password_reset', { user_id: Number(req.params.id) });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'user_password_reset',
    entityType: 'user',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

router.post('/users/:id/role', validate(setRoleSchema), asyncHandler(async (req, res) => {
  const { role } = req.body;
  await db.query(
    'UPDATE users SET role = :role WHERE id = :id',
    { role, id: req.params.id }
  );
  await notifyUsers(db, [Number(req.params.id)], 'role_changed', { role });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'role_changed',
    entityType: 'user',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

router.post('/users/:id/premium', validate(premiumSchema), asyncHandler(async (req, res) => {
  const { is_premium } = req.body;
  await db.query(
    'UPDATE users SET is_premium = :is_premium WHERE id = :id',
    { is_premium: is_premium ? 1 : 0, id: req.params.id }
  );
  await notifyUsers(db, [Number(req.params.id)], 'premium_status', { is_premium });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'premium_updated',
    entityType: 'user',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

router.get('/tournaments', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, name, format, entry_fee, prize_pool, rules, start_date, end_date, status, created_at
     FROM tournaments
     ORDER BY created_at DESC`
  );
  res.json({ tournaments: rows });
}));

router.get('/tournaments/:id/entries', asyncHandler(async (req, res) => {
  const tournamentId = Number(req.params.id);
  const [rows] = await db.query(
    `SELECT e.id, e.tournament_id, e.player_id, e.status, e.payment_id, e.created_at,
            u.email, u.phone,
            p.gamer_tag
     FROM tournament_entries e
     JOIN users u ON u.id = e.player_id
     LEFT JOIN players p ON p.user_id = e.player_id
     WHERE e.tournament_id = :tournament_id
     ORDER BY e.created_at DESC`,
    { tournament_id: tournamentId }
  );
  res.json({ entries: rows });
}));

router.post('/tournament-entries/:id/status', validate(tournamentEntryStatusSchema), asyncHandler(async (req, res) => {
  const entryId = Number(req.params.id);
  const { status } = req.body;

  const [rows] = await db.query(
    `SELECT id, tournament_id, player_id, status AS current_status
     FROM tournament_entries
     WHERE id = :id`,
    { id: entryId }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const entry = rows[0];

  await db.query(
    `UPDATE tournament_entries
     SET status = :status
     WHERE id = :id`,
    { status, id: entryId }
  );

  await notifyUsers(db, [entry.player_id], 'tournament_entry_status', {
    tournament_id: entry.tournament_id,
    status
  });

  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'tournament_entry_status',
    entityType: 'tournament_entry',
    entityId: entryId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(204).send();
}));

router.put('/tournaments/:id', validate(updateTournamentSchema), asyncHandler(async (req, res) => {
  const updates = req.body;
  await db.query(
    `UPDATE tournaments
     SET name = COALESCE(:name, name),
         format = COALESCE(:format, format),
         entry_fee = COALESCE(:entry_fee, entry_fee),
         prize_pool = COALESCE(:prize_pool, prize_pool),
         rules = COALESCE(:rules, rules),
         start_date = COALESCE(:start_date, start_date),
         end_date = COALESCE(:end_date, end_date),
         status = COALESCE(:status, status)
     WHERE id = :id`,
    {
      ...updates,
      id: req.params.id
    }
  );
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'tournament_updated',
    entityType: 'tournament',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

router.delete('/tournaments/:id', asyncHandler(async (req, res) => {
  await db.query('DELETE FROM tournaments WHERE id = :id', { id: req.params.id });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'tournament_deleted',
    entityType: 'tournament',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

router.post('/matches', validate(createMatchSchema), asyncHandler(async (req, res) => {
  const {
    tournament_id,
    player1_id,
    player2_id,
    referee_id,
    round,
    scheduled_at,
    match_fee,
    odds_home,
    odds_draw,
    odds_away
  } = req.body;

  if (player1_id === player2_id) {
    return res.status(400).json({ error: 'same_players' });
  }

  const [[tournament]] = await db.query(
    'SELECT id FROM tournaments WHERE id = :id',
    { id: tournament_id }
  );
  if (!tournament) {
    return res.status(404).json({ error: 'tournament_not_found' });
  }

  const [players] = await db.query(
    `SELECT id, status
     FROM users
     WHERE id IN (:player1_id, :player2_id)`,
    { player1_id, player2_id }
  );
  if (players.length !== 2) {
    return res.status(404).json({ error: 'player_not_found' });
  }
  if (players.some((row) => row.status !== 'active')) {
    return res.status(400).json({ error: 'player_not_active' });
  }

  if (referee_id) {
    const [[ref]] = await db.query(
      `SELECT id FROM users
       WHERE id = :id AND status = 'active' AND role IN ('admin','supervisor','referee','moderator')`,
      { id: referee_id }
    );
    if (!ref) {
      return res.status(400).json({ error: 'invalid_referee' });
    }
  }

  const [entries] = await db.query(
    `SELECT player_id, status
     FROM tournament_entries
     WHERE tournament_id = :tournament_id AND player_id IN (:player1_id, :player2_id)`,
    { tournament_id, player1_id, player2_id }
  );
  const entryMap = new Map(entries.map((row) => [Number(row.player_id), row.status]));
  const allowed = new Set(['approved', 'paid']);
  const invalidPlayers = [player1_id, player2_id].filter((id) => !allowed.has(entryMap.get(id)));
  if (invalidPlayers.length) {
    return res.status(400).json({ error: 'entry_not_approved', players: invalidPlayers });
  }

  const scheduled = dayjs(scheduled_at);
  if (!scheduled.isValid()) {
    return res.status(400).json({ error: 'invalid_datetime' });
  }
  const scheduledAt = scheduled.format('YYYY-MM-DD HH:mm:ss');

  const [result] = await db.query(
    `INSERT INTO matches (
        tournament_id, round, player1_id, player2_id, referee_id, scheduled_at, status, match_fee, odds_home, odds_draw, odds_away
     )
     VALUES (
        :tournament_id, :round, :player1_id, :player2_id, :referee_id, :scheduled_at,
        'scheduled', :match_fee, :odds_home, :odds_draw, :odds_away
     )`,
    {
      tournament_id,
      round: round || null,
      player1_id,
      player2_id,
      referee_id: referee_id || null,
      scheduled_at: scheduledAt,
      match_fee: match_fee ?? 0,
      odds_home: odds_home ?? 1,
      odds_draw: odds_draw ?? 1,
      odds_away: odds_away ?? 1
    }
  );

  await notifyUsers(db, [player1_id, player2_id], 'match_scheduled', {
    tournament_id,
    round: round || 'Match',
    scheduled_at: scheduledAt
  });

  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'match_created',
    entityType: 'match',
    entityId: result.insertId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(201).json({ id: result.insertId });
}));

router.get('/matches', asyncHandler(async (req, res) => {
  const statusFilter = req.query.status;
  const whereClause = statusFilter ? 'WHERE m.status = :status' : '';
  const params = statusFilter ? { status: statusFilter } : {};

  const [rows] = await db.query(
    `SELECT m.id, m.tournament_id, m.round, m.player1_id, m.player2_id, m.scheduled_at, m.status, m.score1, m.score2,
            m.referee_id, m.match_fee,
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

router.put('/matches/:id', validate(updateMatchSchema), asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const { scheduled_at, round, referee_id, status, match_fee } = req.body;

  const updates = [];
  const params = { id: matchId };

  if (scheduled_at !== undefined) {
    const scheduled = dayjs(scheduled_at);
    if (!scheduled.isValid()) {
      return res.status(400).json({ error: 'invalid_datetime' });
    }
    updates.push('scheduled_at = :scheduled_at');
    params.scheduled_at = scheduled.format('YYYY-MM-DD HH:mm:ss');
  }

  if (round !== undefined) {
    updates.push('round = :round');
    params.round = round || null;
  }

  if (referee_id !== undefined) {
    if (referee_id === null) {
      updates.push('referee_id = NULL');
    } else {
      const [[ref]] = await db.query(
        'SELECT id, role, status FROM users WHERE id = :id',
        { id: referee_id }
      );
      if (!ref) {
        return res.status(404).json({ error: 'referee_not_found' });
      }
      if (!['referee', 'supervisor', 'admin', 'moderator'].includes(ref.role)) {
        return res.status(400).json({ error: 'invalid_referee_role' });
      }
      if (ref.status !== 'active') {
        return res.status(400).json({ error: 'referee_not_active' });
      }
      updates.push('referee_id = :referee_id');
      params.referee_id = referee_id;
    }
  }

  if (status !== undefined) {
    updates.push('status = :status');
    params.status = status;
  }

  if (match_fee !== undefined) {
    updates.push('match_fee = :match_fee');
    params.match_fee = match_fee;
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'no_updates' });
  }

  const [result] = await db.query(
    `UPDATE matches SET ${updates.join(', ')} WHERE id = :id`,
    params
  );
  if (!result.affectedRows) {
    return res.status(404).json({ error: 'not_found' });
  }

  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'match_updated',
    entityType: 'match',
    entityId: matchId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(204).send();
}));

router.delete('/matches/:id', asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const [[match]] = await db.query('SELECT id FROM matches WHERE id = :id', { id: matchId });
  if (!match) {
    return res.status(404).json({ error: 'not_found' });
  }

  const [[activity]] = await db.query(
    `SELECT
        (SELECT COUNT(*) FROM match_results WHERE match_id = :id) AS results_count,
        (SELECT COUNT(*) FROM disputes WHERE match_id = :id) AS disputes_count,
        (SELECT COUNT(*) FROM bets WHERE match_id = :id) AS bets_count,
        (SELECT COUNT(*) FROM live_streams WHERE match_id = :id) AS live_streams_count
     `,
    { id: matchId }
  );

  const hasActivity =
    Number(activity?.results_count || 0) > 0 ||
    Number(activity?.disputes_count || 0) > 0 ||
    Number(activity?.bets_count || 0) > 0 ||
    Number(activity?.live_streams_count || 0) > 0;

  if (hasActivity) {
    return res.status(409).json({ error: 'match_has_activity' });
  }

  await db.tx(async (conn) => {
    await conn.execute('DELETE FROM match_viewers WHERE match_id = :id', { id: matchId });
    await conn.execute('DELETE FROM match_chat_messages WHERE match_id = :id', { id: matchId });
    await conn.execute('DELETE FROM match_chat_settings WHERE match_id = :id', { id: matchId });
    await conn.execute('DELETE FROM match_replays WHERE match_id = :id', { id: matchId });
    await conn.execute('DELETE FROM match_live_stats WHERE match_id = :id', { id: matchId });
    await conn.execute('DELETE FROM match_events WHERE match_id = :id', { id: matchId });
    await conn.execute('DELETE FROM streams WHERE match_id = :id', { id: matchId });
    await conn.execute('DELETE FROM matches WHERE id = :id', { id: matchId });
  });

  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'match_deleted',
    entityType: 'match',
    entityId: matchId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(204).send();
}));

router.put('/matches/:id/odds', validate(updateOddsSchema), asyncHandler(async (req, res) => {
  const { odds_home, odds_draw, odds_away } = req.body;
  await db.query(
    `UPDATE matches
     SET odds_home = :odds_home, odds_draw = :odds_draw, odds_away = :odds_away
     WHERE id = :id`,
    { odds_home, odds_draw, odds_away, id: req.params.id }
  );
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'match_odds_updated',
    entityType: 'match',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

router.post('/matches/:id/calc-odds', asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const [rows] = await db.query(
    `SELECT m.id,
            p1.rank_points as p1_points, p1.wins as p1_wins, p1.losses as p1_losses,
            p2.rank_points as p2_points, p2.wins as p2_wins, p2.losses as p2_losses
     FROM matches m
     LEFT JOIN players p1 ON p1.user_id = m.player1_id
     LEFT JOIN players p2 ON p2.user_id = m.player2_id
     WHERE m.id = :id`,
    { id: matchId }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const row = rows[0];
  const rating1 = Number(row.p1_points || 0) + (Number(row.p1_wins || 0) - Number(row.p1_losses || 0)) * 10;
  const rating2 = Number(row.p2_points || 0) + (Number(row.p2_wins || 0) - Number(row.p2_losses || 0)) * 10;
  const expected1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
  const expected2 = 1 - expected1;
  const draw = 0.2;
  const scale = 1 - draw;
  const prob1 = Math.max(expected1 * scale, 0.01);
  const prob2 = Math.max(expected2 * scale, 0.01);
  const probDraw = Math.max(draw, 0.01);
  const odds_home = Number((1 / prob1).toFixed(2));
  const odds_draw = Number((1 / probDraw).toFixed(2));
  const odds_away = Number((1 / prob2).toFixed(2));

  await db.query(
    `UPDATE matches
     SET odds_home = :odds_home, odds_draw = :odds_draw, odds_away = :odds_away
     WHERE id = :id`,
    { odds_home, odds_draw, odds_away, id: matchId }
  );

  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'match_odds_calculated',
    entityType: 'match',
    entityId: matchId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json({ odds_home, odds_draw, odds_away });
}));

router.post('/matches/:id/broadcast/start', validate(broadcastControlSchema), asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const { timer_mode, phase, clock } = req.body;
  await db.tx(async (conn) => {
    const [[match]] = await conn.query(
      `SELECT id, live_timer_mode
       FROM matches WHERE id = :id FOR UPDATE`,
      { id: matchId }
    );
    if (!match) {
      const error = new Error('not_found');
      error.status = 404;
      throw error;
    }

    const mode = timer_mode || match.live_timer_mode || 'manual';
    await conn.execute(
      `UPDATE matches
       SET live_status = 'live',
           live_phase = :phase,
           live_timer_mode = :mode,
           live_timer_started_at = :started_at,
           live_timer_offset_seconds = :offset,
           live_clock = :clock,
           betting_status = CASE WHEN betting_status = 'open' THEN 'closed' ELSE betting_status END
       WHERE id = :id`,
      {
        phase: phase || 'first_half',
        mode,
        started_at: mode === 'auto' ? new Date() : null,
        offset: 0,
        clock: mode === 'manual' ? (clock || null) : null,
        id: matchId
      }
    );
  });

  const users = await collectMatchUserIds(matchId);
  if (users.length) {
    await notifyUsers(db, users, 'match_starting', { match_id: matchId });
  }

  res.status(200).json({ status: 'live' });
}));

router.post('/matches/:id/broadcast/pause', asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  await db.tx(async (conn) => {
    const [[match]] = await conn.query(
      `SELECT live_timer_mode, live_timer_started_at, live_timer_offset_seconds
       FROM matches WHERE id = :id FOR UPDATE`,
      { id: matchId }
    );
    if (!match) {
      const error = new Error('not_found');
      error.status = 404;
      throw error;
    }
    let offset = Number(match.live_timer_offset_seconds || 0);
    if (match.live_timer_mode === 'auto' && match.live_timer_started_at) {
      const started = dayjs(match.live_timer_started_at);
      const diff = dayjs().diff(started, 'second');
      offset += Math.max(0, diff);
    }
    await conn.execute(
      `UPDATE matches
       SET live_status = 'paused',
           live_timer_started_at = NULL,
           live_timer_offset_seconds = :offset
       WHERE id = :id`,
      { offset, id: matchId }
    );
  });
  res.status(200).json({ status: 'paused' });
}));

router.post('/matches/:id/broadcast/resume', asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  await db.query(
    `UPDATE matches
     SET live_status = 'live',
         live_timer_started_at = CASE WHEN live_timer_mode = 'auto' THEN NOW() ELSE NULL END
     WHERE id = :id`,
    { id: matchId }
  );
  res.status(200).json({ status: 'live' });
}));

router.post('/matches/:id/broadcast/end', asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  await db.query(
    `UPDATE matches
     SET live_status = 'ended',
         live_phase = 'full_time',
         live_timer_started_at = NULL,
         betting_status = 'closed'
     WHERE id = :id`,
    { id: matchId }
  );
  const users = await collectMatchUserIds(matchId);
  if (users.length) {
    await notifyUsers(db, users, 'match_finished', { match_id: matchId });
  }
  res.status(200).json({ status: 'ended' });
}));

router.post('/matches/:id/broadcast/emergency', asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  await db.query(
    `UPDATE matches
     SET live_status = 'emergency',
         betting_status = 'suspended'
     WHERE id = :id`,
    { id: matchId }
  );
  res.status(200).json({ status: 'emergency' });
}));

router.put('/matches/:id/broadcast', validate(broadcastControlSchema), asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const { timer_mode, phase, clock } = req.body;
  await db.query(
    `UPDATE matches
     SET live_timer_mode = COALESCE(:mode, live_timer_mode),
         live_phase = COALESCE(:phase, live_phase),
         live_clock = COALESCE(:clock, live_clock)
     WHERE id = :id`,
    { mode: timer_mode || null, phase: phase || null, clock: clock || null, id: matchId }
  );
  res.status(200).json({ status: 'updated' });
}));

router.put('/matches/:id/betting-status', validate(bettingStatusSchema), asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const { status } = req.body;
  if (status === 'voided') {
    await db.tx(async (conn) => {
      await conn.execute(
        `UPDATE matches SET betting_status = 'voided' WHERE id = :id`,
        { id: matchId }
      );
      await voidBetsForMatch(conn, { matchId });
    });
  } else {
    await db.query(
      `UPDATE matches SET betting_status = :status WHERE id = :id`,
      { status, id: matchId }
    );
  }
  const users = await collectMatchUserIds(matchId);
  if (users.length) {
    await notifyUsers(db, users, 'betting_status', { match_id: matchId, status });
  }
  res.status(200).json({ status });
}));

router.post('/matches/:id/events', validate(matchEventSchema), asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const { event_type, side, minute, description } = req.body;
  const [result] = await db.query(
    `INSERT INTO match_events (match_id, event_type, side, minute, description, created_by)
     VALUES (:match_id, :event_type, :side, :minute, :description, :created_by)`,
    {
      match_id: matchId,
      event_type,
      side: side || 'neutral',
      minute: Number.isFinite(minute) ? minute : null,
      description: description || null,
      created_by: req.user.id
    }
  );
  const users = await collectMatchUserIds(matchId);
  if (users.length) {
    await notifyUsers(db, users, 'match_event', {
      match_id: matchId,
      event_type,
      side: side || 'neutral',
      minute: Number.isFinite(minute) ? minute : null,
      description: description || null
    });
  }
  res.status(201).json({ id: result.insertId });
}));

router.put('/matches/:id/stats', validate(liveStatsSchema), asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const payload = req.body;
  await db.query(
    `INSERT INTO match_live_stats (
        match_id, possession_home, possession_away, shots_home, shots_away,
        passes_home, passes_away, fouls_home, fouls_away, yellow_home, yellow_away, red_home, red_away
     )
     VALUES (
        :match_id, :possession_home, :possession_away, :shots_home, :shots_away,
        :passes_home, :passes_away, :fouls_home, :fouls_away, :yellow_home, :yellow_away, :red_home, :red_away
     )
     ON DUPLICATE KEY UPDATE
        possession_home = COALESCE(:possession_home, possession_home),
        possession_away = COALESCE(:possession_away, possession_away),
        shots_home = COALESCE(:shots_home, shots_home),
        shots_away = COALESCE(:shots_away, shots_away),
        passes_home = COALESCE(:passes_home, passes_home),
        passes_away = COALESCE(:passes_away, passes_away),
        fouls_home = COALESCE(:fouls_home, fouls_home),
        fouls_away = COALESCE(:fouls_away, fouls_away),
        yellow_home = COALESCE(:yellow_home, yellow_home),
        yellow_away = COALESCE(:yellow_away, yellow_away),
        red_home = COALESCE(:red_home, red_home),
        red_away = COALESCE(:red_away, red_away)`,
    {
      match_id: matchId,
      possession_home: payload.possession_home ?? null,
      possession_away: payload.possession_away ?? null,
      shots_home: payload.shots_home ?? null,
      shots_away: payload.shots_away ?? null,
      passes_home: payload.passes_home ?? null,
      passes_away: payload.passes_away ?? null,
      fouls_home: payload.fouls_home ?? null,
      fouls_away: payload.fouls_away ?? null,
      yellow_home: payload.yellow_home ?? null,
      yellow_away: payload.yellow_away ?? null,
      red_home: payload.red_home ?? null,
      red_away: payload.red_away ?? null
    }
  );
  res.status(200).json({ status: 'updated' });
}));

router.put('/matches/:id/replay', validate(replaySchema), asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const { replay_url, highlights_url } = req.body;
  await db.query(
    `INSERT INTO match_replays (match_id, replay_url, highlights_url, created_by)
     VALUES (:match_id, :replay_url, :highlights_url, :created_by)
     ON DUPLICATE KEY UPDATE
        replay_url = COALESCE(:replay_url, replay_url),
        highlights_url = COALESCE(:highlights_url, highlights_url),
        created_by = :created_by`,
    {
      match_id: matchId,
      replay_url: replay_url || null,
      highlights_url: highlights_url || null,
      created_by: req.user.id
    }
  );
  res.status(200).json({ status: 'updated' });
}));

router.put('/matches/:id/chat-settings', validate(chatSettingsSchema), asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const { enabled, slow_mode_seconds } = req.body;
  await db.query(
    `INSERT INTO match_chat_settings (match_id, enabled, slow_mode_seconds, updated_by)
     VALUES (:match_id, :enabled, :slow_mode_seconds, :updated_by)
     ON DUPLICATE KEY UPDATE
        enabled = COALESCE(:enabled, enabled),
        slow_mode_seconds = COALESCE(:slow_mode_seconds, slow_mode_seconds),
        updated_by = :updated_by`,
    {
      match_id: matchId,
      enabled: enabled === undefined ? null : enabled ? 1 : 0,
      slow_mode_seconds: slow_mode_seconds ?? null,
      updated_by: req.user.id
    }
  );
  res.status(200).json({ status: 'updated' });
}));

router.post('/matches/:id/chat-mute', validate(chatMuteSchema), asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const { user_id, ip, minutes, reason } = req.body;
  const expiresAt = minutes ? dayjs().add(minutes, 'minute').format('YYYY-MM-DD HH:mm:ss') : null;
  await db.query(
    `INSERT INTO chat_mutes (user_id, ip, reason, expires_at, created_by)
     VALUES (:user_id, :ip, :reason, :expires_at, :created_by)`,
    {
      user_id: user_id || null,
      ip: ip || null,
      reason: reason || null,
      expires_at: expiresAt,
      created_by: req.user.id
    }
  );
  await db.query(
    `UPDATE match_chat_messages
     SET deleted_at = NOW(), deleted_by = :deleted_by
     WHERE match_id = :match_id AND (
       (:user_id IS NOT NULL AND user_id = :user_id) OR
       (:ip IS NOT NULL AND guest_ip = :ip)
     )`,
    {
      match_id: matchId,
      user_id: user_id || null,
      ip: ip || null,
      deleted_by: req.user.id
    }
  );
  res.status(201).json({ status: 'muted' });
}));

router.get('/matches/:id/viewers', asyncHandler(async (req, res) => {
  const matchId = Number(req.params.id);
  const [[match]] = await db.query(
    `SELECT viewer_peak, viewer_total_seconds
     FROM matches WHERE id = :id`,
    { id: matchId }
  );
  const [[current]] = await db.query(
    `SELECT COUNT(*) as count
     FROM match_viewers
     WHERE match_id = :match_id AND last_seen_at >= DATE_SUB(NOW(), INTERVAL 20 SECOND)`,
    { match_id: matchId }
  );
  res.json({
    current_viewers: current?.count || 0,
    peak_viewers: match?.viewer_peak || 0,
    total_watch_seconds: match?.viewer_total_seconds || 0
  });
}));

router.get('/featured-match', asyncHandler(async (req, res) => {
  const [[row]] = await db.query(
    'SELECT setting_value FROM platform_settings WHERE setting_key = "featured_match_id"'
  );
  res.json({ match_id: row ? Number(row.setting_value) : null });
}));

router.put('/featured-match', validate(featuredMatchSchema), asyncHandler(async (req, res) => {
  const { match_id } = req.body;
  await db.query(
    `INSERT INTO platform_settings (setting_key, setting_value, updated_by)
     VALUES ('featured_match_id', :value, :updated_by)
     ON DUPLICATE KEY UPDATE setting_value = :value, updated_by = :updated_by`,
    { value: String(match_id), updated_by: req.user.id }
  );
  res.status(200).json({ match_id });
}));

router.get('/sponsors', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, name, logo_url, website_url, position, active
     FROM sponsors
     ORDER BY position ASC, created_at DESC`
  );
  res.json({ sponsors: rows });
}));

router.post('/sponsors', asyncHandler(async (req, res) => {
  const { name, logo_url, website_url, position, active } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name_required' });
  }
  const [result] = await db.query(
    `INSERT INTO sponsors (name, logo_url, website_url, position, active)
     VALUES (:name, :logo_url, :website_url, :position, :active)`,
    {
      name,
      logo_url: logo_url || null,
      website_url: website_url || null,
      position: Number.isFinite(Number(position)) ? Number(position) : 0,
      active: active === undefined ? 1 : active ? 1 : 0
    }
  );
  res.status(201).json({ id: result.insertId });
}));

router.put('/sponsors/:id', asyncHandler(async (req, res) => {
  const { name, logo_url, website_url, position, active } = req.body;
  await db.query(
    `UPDATE sponsors
     SET name = COALESCE(:name, name),
         logo_url = COALESCE(:logo_url, logo_url),
         website_url = COALESCE(:website_url, website_url),
         position = COALESCE(:position, position),
         active = COALESCE(:active, active)
     WHERE id = :id`,
    {
      name: name || null,
      logo_url: logo_url || null,
      website_url: website_url || null,
      position: Number.isFinite(Number(position)) ? Number(position) : null,
      active: active === undefined ? null : active ? 1 : 0,
      id: req.params.id
    }
  );
  res.status(204).send();
}));

router.delete('/sponsors/:id', asyncHandler(async (req, res) => {
  await db.query('DELETE FROM sponsors WHERE id = :id', { id: req.params.id });
  res.status(204).send();
}));

router.get('/payments', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, user_id, amount, currency, type, method, status, provider_ref, created_at
     FROM payments
     ORDER BY created_at DESC`
  );
  res.json({ payments: rows });
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
  await logActivity(db, {
    actorUserId: winnerId || match.player1_id,
    verb: 'match_result',
    entityType: 'match',
    entityId: matchId,
    visibility: 'public',
    payload: {
      match_id: matchId,
      score1: match.score1,
      score2: match.score2,
      player1_id: match.player1_id,
      player2_id: match.player2_id,
      winner_id: winnerId
    }
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

router.post('/notifications/send', validate(sendNotificationSchema), asyncHandler(async (req, res) => {
  const { user_id, type, message } = req.body;
  await notifyUsers(db, [user_id], type, { message });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'notification_sent',
    entityType: 'notification',
    entityId: user_id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(201).json({ status: 'sent' });
}));

router.get('/reports/summary', asyncHandler(async (req, res) => {
  const from = req.query.from ? dayjs(req.query.from).startOf('day') : null;
  const to = req.query.to ? dayjs(req.query.to).endOf('day') : null;

  const timeFilter = from && to ? 'AND created_at BETWEEN :from AND :to' : '';
  const params = from && to ? { from: from.format('YYYY-MM-DD HH:mm:ss'), to: to.format('YYYY-MM-DD HH:mm:ss') } : {};

  const [[playerCount]] = await db.query(
    `SELECT COUNT(*) as count FROM users WHERE role = "player" ${timeFilter}`,
    params
  );
  const [[tournamentCount]] = await db.query(
    `SELECT COUNT(*) as count FROM tournaments WHERE 1=1 ${timeFilter}`,
    params
  );
  const [[matchCount]] = await db.query(
    `SELECT COUNT(*) as count FROM matches WHERE 1=1 ${timeFilter}`,
    params
  );
  const [[revenue]] = await db.query(
    `SELECT SUM(amount) as total FROM payments WHERE status = "paid" ${timeFilter}`,
    params
  );

  res.json({
    players: playerCount.count,
    tournaments: tournamentCount.count,
    matches: matchCount.count,
    revenue: revenue.total || 0
  });
}));

router.get('/settings', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT setting_key, setting_value, updated_at
     FROM platform_settings
     ORDER BY setting_key ASC`
  );
  res.json({ settings: rows });
}));

router.post('/settings', validate(settingsSchema), asyncHandler(async (req, res) => {
  const { key, value } = req.body;
  await db.query(
    `INSERT INTO platform_settings (setting_key, setting_value, updated_by)
     VALUES (:key, :value, :updated_by)
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       updated_by = VALUES(updated_by)`,
    { key, value, updated_by: req.user.id }
  );
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'setting_updated',
    entityType: 'platform_setting',
    entityId: key,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

router.post('/backup', asyncHandler(async (req, res) => {
  try {
    const backup = await runDatabaseBackup();
    await logAudit(db, {
      actorUserId: req.user.id,
      action: 'database_backup',
      entityType: 'backup',
      entityId: backup.filename,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.status(201).json({ file: backup.filename });
  } catch (err) {
    res.status(500).json({ error: err.message || 'backup_failed' });
  }
}));

export default router;
