import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../lib/validation.js';
import { withdrawRequestSchema, reviewWithdrawSchema, topupRequestSchema, reviewTopupSchema, adminCreditSchema } from '../validators/wallet.js';
import { b2cPayout } from '../services/mpesaService.js';
import { notifyUsers } from '../services/notificationService.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const [[wallet]] = await db.query(
    'SELECT balance FROM wallets WHERE user_id = :user_id',
    { user_id: req.user.id }
  );
  const [tx] = await db.query(
    `SELECT id, amount, type, reference_payment_id, created_at
     FROM wallet_transactions WHERE user_id = :user_id
     ORDER BY created_at DESC`,
    { user_id: req.user.id }
  );
  const [withdrawals] = await db.query(
    `SELECT id, amount, phone, status, created_at
     FROM withdrawal_requests WHERE user_id = :user_id
     ORDER BY created_at DESC`,
    { user_id: req.user.id }
  );
  const [topups] = await db.query(
    `SELECT id, amount, method, reference, status, created_at
     FROM wallet_topups WHERE user_id = :user_id
     ORDER BY created_at DESC`,
    { user_id: req.user.id }
  );

  res.json({
    balance: wallet?.balance ?? 0,
    transactions: tx,
    withdrawals,
    topups
  });
}));

router.post('/topups', requireAuth, validate(topupRequestSchema), asyncHandler(async (req, res) => {
  const { amount, method, reference, sender_name, phone, receipt_url, notes } = req.body;

  const [result] = await db.query(
    `INSERT INTO wallet_topups (user_id, amount, method, reference, sender_name, phone, receipt_url, notes)
     VALUES (:user_id, :amount, :method, :reference, :sender_name, :phone, :receipt_url, :notes)
     RETURNING id`,
    {
      user_id: req.user.id,
      amount,
      method: method || 'manual',
      reference: reference || null,
      sender_name: sender_name || null,
      phone: phone || null,
      receipt_url: receipt_url || null,
      notes: notes || null
    }
  );

  const [[admins]] = await db.query(
    `SELECT STRING_AGG(id::text, ',') AS ids FROM users WHERE role = 'admin' AND status = 'active'`
  );
  const adminIds = admins?.ids ? admins.ids.split(',').map((id) => Number(id)) : [];

  await notifyUsers(db, [req.user.id], 'wallet_topup_requested', {
    topup_id: result.insertId,
    amount
  });
  if (adminIds.length) {
    await notifyUsers(db, adminIds, 'wallet_topup_pending', {
      topup_id: result.insertId,
      user_id: req.user.id,
      amount
    });
  }

  res.status(201).json({ id: result.insertId, status: 'pending' });
}));

router.get('/topups/me', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, amount, method, reference, sender_name, phone, receipt_url, status, created_at, reviewed_at, notes
     FROM wallet_topups
     WHERE user_id = :user_id
     ORDER BY created_at DESC`,
    { user_id: req.user.id }
  );
  res.json({ topups: rows });
}));

router.post('/withdraw', requireAuth, validate(withdrawRequestSchema), asyncHandler(async (req, res) => {
  const { amount, phone, notes } = req.body;
  if (req.user.kyc_status !== 'verified') {
    return res.status(403).json({ error: 'kyc_required' });
  }
  const [[wallet]] = await db.query(
    'SELECT balance FROM wallets WHERE user_id = :user_id',
    { user_id: req.user.id }
  );
  if (!wallet || Number(wallet.balance) < amount) {
    return res.status(400).json({ error: 'insufficient_balance' });
  }

  const result = await db.tx(async (conn) => {
    const [insert] = await conn.execute(
      `INSERT INTO withdrawal_requests (user_id, amount, phone, notes)
       VALUES (:user_id, :amount, :phone, :notes)
       RETURNING id`,
      {
        user_id: req.user.id,
        amount,
        phone,
        notes: notes || null
      }
    );

    await conn.execute(
      `UPDATE wallets SET balance = balance - :amount WHERE user_id = :user_id`,
      { amount, user_id: req.user.id }
    );

    await conn.execute(
      `INSERT INTO wallet_transactions (user_id, amount, type, reference_payment_id)
       VALUES (:user_id, :amount, 'debit', NULL)`,
      { user_id: req.user.id, amount }
    );

    return insert;
  });

  const [[admins]] = await db.query(
    `SELECT STRING_AGG(id::text, ',') AS ids FROM users WHERE role = 'admin' AND status = 'active'`
  );
  const adminIds = admins?.ids ? admins.ids.split(',').map((id) => Number(id)) : [];

  await notifyUsers(db, [req.user.id], 'withdrawal_requested', {
    request_id: result.insertId,
    amount
  });
  if (adminIds.length) {
    await notifyUsers(db, adminIds, 'withdrawal_pending', {
      request_id: result.insertId,
      user_id: req.user.id,
      amount
    });
  }

  res.status(201).json({ id: result.insertId, status: 'pending' });
}));

router.get('/admin/withdrawals', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, user_id, amount, phone, status, notes, created_at
     FROM withdrawal_requests
     ORDER BY created_at DESC`
  );
  res.json({ withdrawals: rows });
}));

router.get('/admin/topups', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, user_id, amount, method, reference, sender_name, phone, receipt_url, status, notes, created_at
     FROM wallet_topups
     ORDER BY created_at DESC`
  );
  res.json({ topups: rows });
}));

router.post('/admin/credit', requireAuth, requireRole('admin'), validate(adminCreditSchema), asyncHandler(async (req, res) => {
  const { user_id, email, gamer_tag, amount, method, reference, sender_name, phone, receipt_url, notes } = req.body;

  let resolvedUserId = user_id;
  if (!resolvedUserId && email) {
    const [rows] = await db.query(
      'SELECT id FROM users WHERE email = :email',
      { email }
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'user_not_found' });
    }
    resolvedUserId = rows[0].id;
  }

  if (!resolvedUserId && gamer_tag) {
    const [rows] = await db.query(
      'SELECT user_id FROM players WHERE gamer_tag = :gamer_tag',
      { gamer_tag }
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'user_not_found' });
    }
    resolvedUserId = rows[0].user_id;
  }

  if (!resolvedUserId) {
    return res.status(404).json({ error: 'user_not_found' });
  }

  const result = await db.tx(async (conn) => {
    const [insert] = await conn.execute(
      `INSERT INTO wallet_topups (
        user_id, amount, method, reference, sender_name, phone, receipt_url,
        status, reviewed_by, reviewed_at, notes
      )
      VALUES (
        :user_id, :amount, :method, :reference, :sender_name, :phone, :receipt_url,
        'approved', :reviewed_by, NOW(), :notes
      )
      RETURNING id`,
      {
        user_id: resolvedUserId,
        amount,
        method: method || 'manual',
        reference: reference || null,
        sender_name: sender_name || null,
        phone: phone || null,
        receipt_url: receipt_url || null,
        reviewed_by: req.user.id,
        notes: notes || null
      }
    );

    await conn.execute(
      `INSERT INTO wallets (user_id, balance)
       VALUES (:user_id, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      { user_id: resolvedUserId }
    );

    await conn.execute(
      `UPDATE wallets SET balance = balance + :amount WHERE user_id = :user_id`,
      { amount, user_id: resolvedUserId }
    );

    await conn.execute(
      `INSERT INTO wallet_transactions (user_id, amount, type, reference_payment_id)
       VALUES (:user_id, :amount, 'credit', NULL)`,
      { user_id: resolvedUserId, amount }
    );

    return insert;
  });

  await notifyUsers(db, [resolvedUserId], 'wallet_topup_reviewed', {
    topup_id: result.insertId,
    status: 'approved'
  });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'wallet_admin_credit',
    entityType: 'wallet_topup',
    entityId: result.insertId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(201).json({ id: result.insertId, status: 'approved', user_id: resolvedUserId });
}));

router.post('/admin/topups/:id/review', requireAuth, requireRole('admin'), validate(reviewTopupSchema), asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  const [rows] = await db.query(
    `SELECT id, user_id, amount FROM wallet_topups WHERE id = :id`,
    { id: req.params.id }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const topup = rows[0];

  await db.tx(async (conn) => {
    await conn.execute(
      `UPDATE wallet_topups
       SET status = :status, notes = :notes, reviewed_by = :reviewed_by, reviewed_at = NOW()
       WHERE id = :id`,
      {
        status,
        notes: notes || null,
        reviewed_by: req.user.id,
        id: req.params.id
      }
    );

    if (status === 'approved') {
      await conn.execute(
        `UPDATE wallets SET balance = balance + :amount WHERE user_id = :user_id`,
        { amount: topup.amount, user_id: topup.user_id }
      );
      await conn.execute(
        `INSERT INTO wallet_transactions (user_id, amount, type, reference_payment_id)
         VALUES (:user_id, :amount, 'credit', NULL)`,
        { user_id: topup.user_id, amount: topup.amount }
      );
    }
  });

  await notifyUsers(db, [topup.user_id], 'wallet_topup_reviewed', {
    topup_id: topup.id,
    status
  });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'wallet_topup_reviewed',
    entityType: 'wallet_topup',
    entityId: topup.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(204).send();
}));

router.post('/admin/withdrawals/:id/review', requireAuth, requireRole('admin'), validate(reviewWithdrawSchema), asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  const [rows] = await db.query(
    `SELECT id, user_id, amount FROM withdrawal_requests WHERE id = :id`,
    { id: req.params.id }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const request = rows[0];

  await db.tx(async (conn) => {
    await conn.execute(
      `UPDATE withdrawal_requests
       SET status = :status, notes = :notes, reviewed_by = :reviewed_by, reviewed_at = NOW()
       WHERE id = :id`,
      {
        status,
        notes: notes || null,
        reviewed_by: req.user.id,
        id: req.params.id
      }
    );

    if (status === 'rejected') {
      await conn.execute(
        `UPDATE wallets SET balance = balance + :amount WHERE user_id = :user_id`,
        { amount: request.amount, user_id: request.user_id }
      );
      await conn.execute(
        `INSERT INTO wallet_transactions (user_id, amount, type, reference_payment_id)
         VALUES (:user_id, :amount, 'credit', NULL)`,
        { user_id: request.user_id, amount: request.amount }
      );
    }
  });

  await notifyUsers(db, [request.user_id], 'withdrawal_reviewed', {
    request_id: request.id,
    status
  });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'withdrawal_reviewed',
    entityType: 'withdrawal_request',
    entityId: request.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(204).send();
}));

router.post('/admin/withdrawals/:id/payout', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, user_id, amount, phone, status
     FROM withdrawal_requests WHERE id = :id`,
    { id: req.params.id }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const request = rows[0];
  if (request.status !== 'approved') {
    return res.status(400).json({ error: 'not_approved' });
  }

  const [paymentResult] = await db.query(
    `INSERT INTO payments (user_id, amount, currency, type, method, status)
     VALUES (:user_id, :amount, 'KES', 'prize_payout', 'mpesa', 'pending')`,
    { user_id: request.user_id, amount: request.amount }
  );

  const paymentId = paymentResult.insertId;
  const response = await b2cPayout({ amount: request.amount, phone: request.phone });

  await db.query(
    `UPDATE payments SET provider_ref = :provider_ref WHERE id = :id`,
    { provider_ref: response.OriginatorConversationID || null, id: paymentId }
  );

  await db.query(
    `UPDATE withdrawal_requests
     SET status = 'paid', payment_id = :payment_id
     WHERE id = :id`,
    { payment_id: paymentId, id: request.id }
  );

  await notifyUsers(db, [request.user_id], 'withdrawal_paid', {
    request_id: request.id,
    payment_id: paymentId
  });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'withdrawal_paid',
    entityType: 'withdrawal_request',
    entityId: request.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(201).json({ status: 'paid', payment_id: paymentId });
}));

export default router;
