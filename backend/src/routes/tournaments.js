import { Router } from 'express';
import dayjs from 'dayjs';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../lib/validation.js';
import { createTournamentSchema, scheduleSchema } from '../validators/tournaments.js';
import { notifyUsers } from '../services/notificationService.js';
import { logAudit } from '../services/auditService.js';
import { logActivity } from '../services/activityService.js';

const router = Router();

function buildRoundRobin(players) {
  const list = [...players];
  if (list.length % 2 === 1) {
    list.push(null);
  }
  const n = list.length;
  const rounds = n - 1;
  const schedule = [];

  for (let round = 0; round < rounds; round += 1) {
    const pairings = [];
    for (let i = 0; i < n / 2; i += 1) {
      const p1 = list[i];
      const p2 = list[n - 1 - i];
      if (p1 && p2) {
        pairings.push([p1, p2]);
      }
    }
    schedule.push(pairings);

    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list.splice(0, list.length, fixed, ...rest);
  }

  return schedule;
}

router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, name, format, entry_fee, prize_pool, start_date, end_date, status
     FROM tournaments
     ORDER BY created_at DESC`
  );
  res.json({ tournaments: rows });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, name, format, entry_fee, prize_pool, rules, start_date, end_date, status
     FROM tournaments
     WHERE id = :id`,
    { id: req.params.id }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json({ tournament: rows[0] });
}));

router.post('/', requireAuth, requireRole('admin'), validate(createTournamentSchema), asyncHandler(async (req, res) => {
  const { name, format, entry_fee, prize_pool, rules, start_date, end_date, season_id } = req.body;

  const [result] = await db.query(
    `INSERT INTO tournaments (name, format, entry_fee, prize_pool, rules, start_date, end_date, status, season_id, created_by)
     VALUES (:name, :format, :entry_fee, :prize_pool, :rules, :start_date, :end_date, 'open', :season_id, :created_by)
     RETURNING id`,
    {
      name,
      format,
      entry_fee,
      prize_pool,
      rules: rules || null,
      start_date: start_date || null,
      end_date: end_date || null,
      season_id: season_id || null,
      created_by: req.user.id
    }
  );

  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'tournament_created',
    entityType: 'tournament',
    entityId: result.insertId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(201).json({ id: result.insertId });
}));

router.post('/:id/join', requireAuth, asyncHandler(async (req, res) => {
  const tournamentId = Number(req.params.id);
  if (req.user.status !== 'active') {
    return res.status(403).json({ error: 'pending_approval' });
  }
  const [tRows] = await db.query(
    'SELECT id, entry_fee, status FROM tournaments WHERE id = :id',
    { id: tournamentId }
  );
  if (!tRows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const tournament = tRows[0];
  if (tournament.status !== 'open') {
    return res.status(400).json({ error: 'tournament_not_open' });
  }

  const [existing] = await db.query(
    `SELECT id, status FROM tournament_entries
     WHERE tournament_id = :tournament_id AND player_id = :player_id`,
    { tournament_id: tournamentId, player_id: req.user.id }
  );
  if (existing.length) {
    const existingStatus = existing[0].status;
    if (existingStatus === 'paid' || existingStatus === 'approved') {
      return res.status(200).json({ status: existingStatus });
    }
    return res.status(402).json({ error: 'payment_required', amount: tournament.entry_fee, tournament_id: tournamentId });
  }

  const status = Number(tournament.entry_fee) === 0 ? 'approved' : 'pending';

  await db.query(
    `INSERT INTO tournament_entries (tournament_id, player_id, status)
     VALUES (:tournament_id, :player_id, :status)`,
    { tournament_id: tournamentId, player_id: req.user.id, status }
  );

  if (status === 'pending') {
    return res.status(402).json({ error: 'payment_required', amount: tournament.entry_fee, tournament_id: tournamentId });
  }

  await notifyUsers(db, [req.user.id], 'tournament_joined', {
    tournament_id: tournamentId,
    status
  });

  await logActivity(db, {
    actorUserId: req.user.id,
    verb: 'tournament_joined',
    entityType: 'tournament',
    entityId: tournamentId,
    visibility: 'public',
    payload: { tournament_id: tournamentId }
  });

  res.status(201).json({ status });
}));

router.post('/:id/schedule', requireAuth, requireRole('admin'), validate(scheduleSchema), asyncHandler(async (req, res) => {
  const tournamentId = Number(req.params.id);
  const [tRows] = await db.query(
    'SELECT id, format, start_date FROM tournaments WHERE id = :id',
    { id: tournamentId }
  );
  if (!tRows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const tournament = tRows[0];
  if (tournament.format !== 'league') {
    return res.status(400).json({ error: 'schedule_supported_for_league_only' });
  }

  const [players] = await db.query(
    `SELECT player_id FROM tournament_entries
     WHERE tournament_id = :tournament_id AND status IN ('approved','paid')
     ORDER BY player_id ASC`,
    { tournament_id: tournamentId }
  );

  if (players.length < 2) {
    return res.status(400).json({ error: 'not_enough_players' });
  }

  const schedule = buildRoundRobin(players.map((p) => p.player_id));

  const daysBetween = req.body.days_between_rounds ?? 1;
  const baseStart = req.body.start_datetime
    ? dayjs(req.body.start_datetime)
    : dayjs(tournament.start_date || undefined).isValid()
      ? dayjs(tournament.start_date).hour(18).minute(0).second(0)
      : dayjs().add(1, 'day').hour(18).minute(0).second(0);

  const matchTime = req.body.match_time || '18:00';
  const [matchHour, matchMinute] = matchTime.split(':').map((v) => Number(v));

  await db.tx(async (conn) => {
    for (let roundIndex = 0; roundIndex < schedule.length; roundIndex += 1) {
      const roundMatches = schedule[roundIndex];
      for (let i = 0; i < roundMatches.length; i += 1) {
        const [player1, player2] = roundMatches[i];
        const scheduledAt = baseStart
          .add(roundIndex * daysBetween, 'day')
          .hour(Number.isFinite(matchHour) ? matchHour : 18)
          .minute(Number.isFinite(matchMinute) ? matchMinute : 0)
          .add(i, 'hour')
          .format('YYYY-MM-DD HH:mm:ss');

        await conn.execute(
          `INSERT INTO matches (tournament_id, round, player1_id, player2_id, scheduled_at, status)
           VALUES (:tournament_id, :round, :player1_id, :player2_id, :scheduled_at, 'scheduled')`,
          {
            tournament_id: tournamentId,
            round: `Round ${roundIndex + 1}`,
            player1_id: player1,
            player2_id: player2,
            scheduled_at: scheduledAt
          }
        );

        await notifyUsers(conn, [player1, player2], 'match_scheduled', {
          tournament_id: tournamentId,
          round: `Round ${roundIndex + 1}`,
          scheduled_at: scheduledAt
        });
      }
    }
  });

  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'tournament_scheduled',
    entityType: 'tournament',
    entityId: tournamentId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(201).json({ rounds: schedule.length });
}));

router.get('/:id/matches', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT m.id, m.round, m.player1_id, m.player2_id, m.scheduled_at, m.status, m.score1, m.score2, m.winner_id,
            m.odds_home, m.odds_draw, m.odds_away,
            p1.gamer_tag as player1_tag,
            p2.gamer_tag as player2_tag
     FROM matches m
     LEFT JOIN players p1 ON p1.user_id = m.player1_id
     LEFT JOIN players p2 ON p2.user_id = m.player2_id
     WHERE m.tournament_id = :id
     ORDER BY m.scheduled_at ASC`,
    { id: req.params.id }
  );
  res.json({ matches: rows });
}));

export default router;
