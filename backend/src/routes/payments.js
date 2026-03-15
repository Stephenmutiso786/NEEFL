import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../lib/validation.js';
import { stkPushSchema, payoutSchema } from '../validators/payments.js';
import { stkPush, b2cPayout } from '../services/mpesaService.js';
import { env } from '../config/env.js';
import { notifyUsers } from '../services/notificationService.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, amount, currency, type, method, status, provider_ref, created_at
     FROM payments WHERE user_id = :user_id
     ORDER BY created_at DESC`,
    { user_id: req.user.id }
  );
  res.json({ payments: rows });
}));

router.post('/mpesa/stk-push', requireAuth, validate(stkPushSchema), asyncHandler(async (req, res) => {
  const {
    amount,
    phone,
    tournament_id,
    season_id,
    match_id,
    account_reference,
    transaction_desc,
    type
  } = req.body;
  const paymentType = type || 'entry_fee';

  if (paymentType === 'entry_fee' && !tournament_id && !season_id && !match_id) {
    return res.status(400).json({ error: 'entry_target_required' });
  }

  const [paymentResult] = await db.query(
    `INSERT INTO payments (user_id, amount, currency, type, method, status, metadata)
     VALUES (:user_id, :amount, 'KES', :type, 'mpesa', 'pending', :metadata)
     RETURNING id`,
    {
      user_id: req.user.id,
      amount,
      type: paymentType,
      metadata: JSON.stringify({
        tournament_id: tournament_id || null,
        season_id: season_id || null,
        match_id: match_id || null,
        type: paymentType
      })
    }
  );

  const paymentId = paymentResult.insertId;

  const callbackUrl = env.mpesa.callbackUrl || `${env.baseUrl}/api/payments/mpesa/callback`;

  const response = await stkPush({
    amount,
    phone,
    accountReference: account_reference || env.mpesa.accountReference,
    transactionDesc: transaction_desc || env.mpesa.transactionDesc,
    callbackUrl
  });

  await db.query(
    `INSERT INTO mpesa_transactions (payment_id, checkout_request_id, merchant_request_id, phone)
     VALUES (:payment_id, :checkout_request_id, :merchant_request_id, :phone)`,
    {
      payment_id: paymentId,
      checkout_request_id: response.CheckoutRequestID || null,
      merchant_request_id: response.MerchantRequestID || null,
      phone
    }
  );

  res.status(201).json({
    payment_id: paymentId,
    checkout_request_id: response.CheckoutRequestID,
    merchant_request_id: response.MerchantRequestID,
    customer_message: response.CustomerMessage
  });
}));

router.post('/mpesa/callback', asyncHandler(async (req, res) => {
  const stk = req.body?.Body?.stkCallback;
  if (!stk) {
    return res.status(400).json({ error: 'invalid_callback' });
  }

  const checkoutRequestId = stk.CheckoutRequestID;
  const resultCode = String(stk.ResultCode);
  const resultDesc = stk.ResultDesc;

  const metadataItems = stk.CallbackMetadata?.Item || [];
  const meta = {};
  for (const item of metadataItems) {
    meta[item.Name] = item.Value;
  }

  const receipt = meta.MpesaReceiptNumber || null;
  const phone = meta.PhoneNumber || null;

  const [rows] = await db.query(
    `SELECT p.id, p.user_id, p.metadata, p.type, p.amount
     FROM payments p
     JOIN mpesa_transactions m ON m.payment_id = p.id
     WHERE m.checkout_request_id = :checkout_request_id
     ORDER BY m.id DESC LIMIT 1`,
    { checkout_request_id: checkoutRequestId }
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'payment_not_found' });
  }

  const payment = rows[0];

  await db.tx(async (conn) => {
    await conn.execute(
      `UPDATE mpesa_transactions
       SET receipt_number = :receipt_number,
           result_code = :result_code,
           result_desc = :result_desc,
           phone = COALESCE(:phone, phone),
           raw_callback = :raw_callback
       WHERE checkout_request_id = :checkout_request_id`,
      {
        receipt_number: receipt,
        result_code: resultCode,
        result_desc: resultDesc,
        phone: phone,
        raw_callback: JSON.stringify(req.body),
        checkout_request_id: checkoutRequestId
      }
    );

    if (resultCode === '0') {
      await conn.execute(
        `UPDATE payments
         SET status = 'paid', provider_ref = :provider_ref
         WHERE id = :id`,
        { provider_ref: receipt, id: payment.id }
      );

      const metaObj = payment.metadata
        ? (typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata)
        : {};
      if (payment.type === 'entry_fee') {
        if (metaObj.tournament_id) {
          const [result] = await conn.execute(
            `UPDATE tournament_entries
             SET status = 'paid', payment_id = :payment_id
             WHERE tournament_id = :tournament_id AND player_id = :player_id`,
            {
              payment_id: payment.id,
              tournament_id: metaObj.tournament_id,
              player_id: payment.user_id
            }
          );
          if (result.affectedRows === 0) {
            await conn.execute(
              `INSERT INTO tournament_entries (tournament_id, player_id, status, payment_id)
               VALUES (:tournament_id, :player_id, 'paid', :payment_id)`,
              {
                tournament_id: metaObj.tournament_id,
                player_id: payment.user_id,
                payment_id: payment.id
              }
            );
          }
        }
        if (metaObj.season_id) {
          const [result] = await conn.execute(
            `UPDATE season_entries
             SET status = 'paid', payment_id = :payment_id
             WHERE season_id = :season_id AND player_id = :player_id`,
            {
              payment_id: payment.id,
              season_id: metaObj.season_id,
              player_id: payment.user_id
            }
          );
          if (result.affectedRows === 0) {
            await conn.execute(
              `INSERT INTO season_entries (season_id, player_id, status, payment_id)
               VALUES (:season_id, :player_id, 'paid', :payment_id)`,
              {
                season_id: metaObj.season_id,
                player_id: payment.user_id,
                payment_id: payment.id
              }
            );
          }
        }
      }
      if (payment.type === 'wallet_topup') {
        await conn.execute(
          `UPDATE wallets SET balance = balance + :amount WHERE user_id = :user_id`,
          { amount: payment.amount, user_id: payment.user_id }
        );
        await conn.execute(
          `INSERT INTO wallet_transactions (user_id, amount, type, reference_payment_id)
           VALUES (:user_id, :amount, 'credit', :payment_id)`,
          { user_id: payment.user_id, amount: payment.amount, payment_id: payment.id }
        );
      }
      await notifyUsers(conn, [payment.user_id], 'payment_paid', {
        payment_id: payment.id,
        receipt
      });
    } else {
      await conn.execute(
        `UPDATE payments
         SET status = 'failed'
         WHERE id = :id`,
        { id: payment.id }
      );
      await notifyUsers(conn, [payment.user_id], 'payment_failed', {
        payment_id: payment.id,
        result_desc: resultDesc
      });
    }
  });

  res.status(200).json({ status: 'ok' });
}));

router.post('/payouts', requireAuth, requireRole('admin'), validate(payoutSchema), asyncHandler(async (req, res) => {
  const { user_id, amount, phone, remarks, occasion } = req.body;

  const [paymentResult] = await db.query(
    `INSERT INTO payments (user_id, amount, currency, type, method, status)
     VALUES (:user_id, :amount, 'KES', 'prize_payout', 'mpesa', 'pending')
     RETURNING id`,
    { user_id, amount }
  );

  const paymentId = paymentResult.insertId;
  const response = await b2cPayout({ amount, phone, remarks, occasion });

  await db.query(
    `UPDATE payments SET provider_ref = :provider_ref WHERE id = :id`,
    { provider_ref: response.OriginatorConversationID || null, id: paymentId }
  );

  await notifyUsers(db, [user_id], 'payout_initiated', {
    payment_id: paymentId,
    amount
  });

  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'payout_initiated',
    entityType: 'payment',
    entityId: paymentId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(201).json({ payment_id: paymentId, provider_ref: response.OriginatorConversationID });
}));

export default router;
