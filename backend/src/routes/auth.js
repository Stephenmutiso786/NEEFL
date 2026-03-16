import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { hashPassword, verifyPassword } from '../lib/crypto.js';
import { signToken } from '../lib/jwt.js';
import { generateToken, hashToken } from '../lib/tokens.js';
import { validate } from '../lib/validation.js';
import {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  verificationRequestSchema,
  verificationConfirmSchema
} from '../validators/auth.js';
import { sendEmail } from '../services/emailService.js';
import { sendSms } from '../services/smsService.js';
import dayjs from 'dayjs';
import { requireAuth } from '../middleware/auth.js';
import { notifyUsers } from '../services/notificationService.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { env } from '../config/env.js';
import { getSettings, parseBooleanSetting } from '../services/platformSettings.js';

const router = Router();

const approvalRequiredRoles = new Set(['supervisor', 'referee']);

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'too_many_login_attempts'
});
const registerLimiter = createRateLimiter({
  windowMs: 30 * 60 * 1000,
  max: 10,
  message: 'too_many_registrations'
});
const resetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'too_many_password_reset_requests'
});

router.post('/register', registerLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const maintenanceSettings = await getSettings(db, [
    'maintenance_mode',
    'maintenance_message',
    'maintenance_end_time'
  ]);
  if (parseBooleanSetting(maintenanceSettings.maintenance_mode)) {
    return res.status(503).json({
      error: 'maintenance',
      maintenance: {
        enabled: true,
        message: maintenanceSettings.maintenance_message || 'Platform under maintenance.',
        end_time: maintenanceSettings.maintenance_end_time || null
      }
    });
  }

  const { email, phone, password, gamer_tag, real_name, country, region, preferred_team, role } = req.body;
  const userRole = role || 'player';
  const requiresApproval = approvalRequiredRoles.has(userRole);
  const accountStatus = requiresApproval ? 'pending' : 'active';

  const [existing] = await db.query(
    'SELECT id FROM users WHERE email = :email OR phone = :phone',
    { email: email || null, phone: phone || null }
  );
  if (existing.length) {
    return res.status(409).json({ error: 'user_exists' });
  }

  const passwordHash = await hashPassword(password);

  const userId = await db.tx(async (conn) => {
    const [result] = await conn.execute(
      `INSERT INTO users (email, phone, password_hash, role, status)
       VALUES (:email, :phone, :password_hash, :role, :status)
       RETURNING id`,
      {
        email: email || null,
        phone: phone || null,
        password_hash: passwordHash,
        role: userRole,
        status: accountStatus
      }
    );

    const id = result.insertId;

    await conn.execute(
      `INSERT INTO players (user_id, gamer_tag, real_name, country, region, preferred_team)
       VALUES (:user_id, :gamer_tag, :real_name, :country, :region, :preferred_team)`,
      {
        user_id: id,
        gamer_tag,
        real_name: real_name || null,
        country: country || null,
        region: region || null,
        preferred_team: preferred_team || null
      }
    );

    await conn.execute(
      `INSERT INTO wallets (user_id, balance) VALUES (:user_id, 0)`,
      { user_id: id }
    );

    return id;
  });

  const [[admins]] = await db.query(
    `SELECT STRING_AGG(id::text, ',') AS ids FROM users WHERE role = 'admin' AND status = 'active'`
  );
  const adminIds = admins?.ids ? admins.ids.split(',').map((id) => Number(id)) : [];
  if (adminIds.length) {
    await notifyUsers(db, adminIds, 'new_user_registered', { user_id: userId, gamer_tag, role: userRole });
  }

  if (requiresApproval) {
    return res.status(201).json({
      id: userId,
      status: accountStatus,
      approval_required: true
    });
  }

  const token = signToken({ sub: userId, role: userRole });
  return res.status(201).json({ id: userId, token, status: accountStatus });
}));

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, phone, password, security_code, remember_me } = req.body;
  const [rows] = await db.query(
    `SELECT id, password_hash, role, status, failed_login_attempts, locked_until
     FROM users WHERE email = :email OR phone = :phone`,
    { email: email || null, phone: phone || null }
  );

  if (!rows.length) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const user = rows[0];
  const maintenanceSettings = await getSettings(db, [
    'maintenance_mode',
    'maintenance_message',
    'maintenance_end_time'
  ]);
  if (parseBooleanSetting(maintenanceSettings.maintenance_mode) && user.role !== 'admin') {
    return res.status(503).json({
      error: 'maintenance',
      maintenance: {
        enabled: true,
        message: maintenanceSettings.maintenance_message || 'Platform under maintenance.',
        end_time: maintenanceSettings.maintenance_end_time || null
      }
    });
  }
  if (!['player', 'admin', 'director', 'supervisor', 'referee', 'coach', 'fan', 'bettor', 'moderator', 'broadcaster'].includes(user.role)) {
    return res.status(403).json({ error: 'role_not_allowed' });
  }
  if (user.locked_until && dayjs().isBefore(dayjs(user.locked_until))) {
    return res.status(423).json({ error: 'account_locked', locked_until: user.locked_until });
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    const nextAttempts = (user.failed_login_attempts || 0) + 1;
    const shouldLock = nextAttempts >= env.loginMaxAttempts;
    await db.query(
      `UPDATE users
       SET failed_login_attempts = :attempts,
           locked_until = :locked_until
       WHERE id = :id`,
      {
        attempts: nextAttempts,
        locked_until: shouldLock ? dayjs().add(env.loginLockMinutes, 'minute').format('YYYY-MM-DD HH:mm:ss') : null,
        id: user.id
      }
    );
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  if (user.status === 'banned') {
    return res.status(403).json({ error: 'banned' });
  }
  if (approvalRequiredRoles.has(user.role) && user.status !== 'active') {
    return res.status(403).json({ error: 'pending_approval' });
  }
  if (user.role === 'admin' && env.adminSecurityCode) {
    if (!security_code) {
      return res.status(401).json({ error: 'security_code_required' });
    }
    if (security_code !== env.adminSecurityCode) {
      return res.status(401).json({ error: 'security_code_invalid' });
    }
  }

  await db.query(
    `UPDATE users
     SET failed_login_attempts = 0, locked_until = NULL, last_seen_at = NOW()
     WHERE id = :id`,
    { id: user.id }
  );

  const expiresIn = remember_me ? env.jwtRememberExpiresIn : env.jwtExpiresIn;
  const token = signToken({ sub: user.id, role: user.role }, { expiresIn });
  return res.json({ token });
}));

router.post('/request-password-reset', resetLimiter, validate(passwordResetRequestSchema), asyncHandler(async (req, res) => {
  const { email, phone } = req.body;
  const [rows] = await db.query(
    'SELECT id, email, phone FROM users WHERE email = :email OR phone = :phone',
    { email: email || null, phone: phone || null }
  );

  if (!rows.length) {
    return res.status(204).send();
  }

  const user = rows[0];
  const token = generateToken(16);
  const tokenHash = hashToken(token);
  const expiresAt = dayjs().add(30, 'minute').format('YYYY-MM-DD HH:mm:ss');

  await db.query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES (:user_id, :token_hash, :expires_at)`,
    { user_id: user.id, token_hash: tokenHash, expires_at: expiresAt }
  );

  const message = `Your password reset code is: ${token}`;
  if (user.email) {
    await sendEmail({ to: user.email, subject: 'NEEFL Password Reset', text: message });
  } else if (user.phone) {
    await sendSms({ to: user.phone, message });
  }

  return res.status(204).send();
}));

router.post('/reset-password', validate(passwordResetSchema), asyncHandler(async (req, res) => {
  const { token, new_password } = req.body;
  const tokenHash = hashToken(token);

  const [rows] = await db.query(
    `SELECT id, user_id, expires_at, used_at
     FROM password_resets
     WHERE token_hash = :token_hash
     ORDER BY id DESC LIMIT 1`,
    { token_hash: tokenHash }
  );

  if (!rows.length) {
    return res.status(400).json({ error: 'invalid_token' });
  }

  const reset = rows[0];
  if (reset.used_at || dayjs().isAfter(dayjs(reset.expires_at))) {
    return res.status(400).json({ error: 'invalid_token' });
  }

  const passwordHash = await hashPassword(new_password);

  await db.tx(async (conn) => {
    await conn.execute(
      'UPDATE users SET password_hash = :password_hash WHERE id = :id',
      { password_hash: passwordHash, id: reset.user_id }
    );
    await conn.execute(
      'UPDATE password_resets SET used_at = NOW() WHERE id = :id',
      { id: reset.id }
    );
  });

  return res.status(204).send();
}));

router.post('/request-verification', requireAuth, validate(verificationRequestSchema), asyncHandler(async (req, res) => {
  const { type } = req.body;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const token = generateToken(8);
  const tokenHash = hashToken(token);
  const expiresAt = dayjs().add(15, 'minute').format('YYYY-MM-DD HH:mm:ss');

  await db.query(
    `INSERT INTO verification_tokens (user_id, type, token_hash, expires_at)
     VALUES (:user_id, :type, :token_hash, :expires_at)`,
    { user_id: user.id, type, token_hash: tokenHash, expires_at: expiresAt }
  );

  const message = `Your verification code is: ${token}`;
  if (type === 'email' && user.email) {
    await sendEmail({ to: user.email, subject: 'NEEFL Verification', text: message });
  } else if (type === 'phone' && user.phone) {
    await sendSms({ to: user.phone, message });
  } else {
    return res.status(400).json({ error: 'contact_missing' });
  }

  return res.status(204).send();
}));

router.post('/confirm-verification', requireAuth, validate(verificationConfirmSchema), asyncHandler(async (req, res) => {
  const { type, token } = req.body;
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const tokenHash = hashToken(token);
  const [rows] = await db.query(
    `SELECT id, expires_at, used_at
     FROM verification_tokens
     WHERE user_id = :user_id AND type = :type AND token_hash = :token_hash
     ORDER BY id DESC LIMIT 1`,
    { user_id: user.id, type, token_hash: tokenHash }
  );

  if (!rows.length) {
    return res.status(400).json({ error: 'invalid_token' });
  }

  const record = rows[0];
  if (record.used_at || dayjs().isAfter(dayjs(record.expires_at))) {
    return res.status(400).json({ error: 'invalid_token' });
  }

  await db.tx(async (conn) => {
    if (type === 'email') {
      await conn.execute('UPDATE users SET email_verified_at = NOW() WHERE id = :id', { id: user.id });
    } else {
      await conn.execute('UPDATE users SET phone_verified_at = NOW() WHERE id = :id', { id: user.id });
    }
    await conn.execute('UPDATE verification_tokens SET used_at = NOW() WHERE id = :id', { id: record.id });
  });

  return res.status(204).send();
}));

export default router;
