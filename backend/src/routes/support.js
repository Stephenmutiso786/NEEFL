import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../lib/validation.js';
import { supportTicketSchema, resolveTicketSchema } from '../validators/support.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { notifyUsers } from '../services/notificationService.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.post('/', requireAuth, validate(supportTicketSchema), asyncHandler(async (req, res) => {
  const { subject, message, contact_email, contact_phone } = req.body;

  const [result] = await db.query(
    `INSERT INTO support_tickets (user_id, subject, message, contact_email, contact_phone)
     VALUES (:user_id, :subject, :message, :contact_email, :contact_phone)
     RETURNING id`,
    {
      user_id: req.user.id,
      subject,
      message,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null
    }
  );

  const [[admins]] = await db.query(
    `SELECT STRING_AGG(id::text, ',') AS ids FROM users WHERE role = 'admin' AND status = 'active'`
  );
  const adminIds = admins?.ids ? admins.ids.split(',').map((id) => Number(id)) : [];

  await notifyUsers(db, [req.user.id], 'support_ticket_created', {
    ticket_id: result.insertId
  });
  if (adminIds.length) {
    await notifyUsers(db, adminIds, 'support_ticket_pending', {
      ticket_id: result.insertId,
      user_id: req.user.id,
      subject
    });
  }

  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'support_ticket_created',
    entityType: 'support_ticket',
    entityId: result.insertId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(201).json({ id: result.insertId });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, subject, status, created_at, resolved_at
     FROM support_tickets
     WHERE user_id = :user_id
     ORDER BY created_at DESC`,
    { user_id: req.user.id }
  );

  res.json({ tickets: rows });
}));

router.get('/admin', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, user_id, subject, status, created_at
     FROM support_tickets
     ORDER BY created_at DESC`
  );
  res.json({ tickets: rows });
}));

router.post('/admin/:id/resolve', requireAuth, requireRole('admin'), validate(resolveTicketSchema), asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const [rows] = await db.query(
    'SELECT id, user_id FROM support_tickets WHERE id = :id',
    { id: req.params.id }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const ticket = rows[0];

  await db.query(
    `UPDATE support_tickets
     SET status = :status, resolution = :resolution, resolved_by = :resolved_by, resolved_at = NOW()
     WHERE id = :id`,
    {
      status,
      resolved_by: req.user.id,
      resolution: notes || null,
      id: req.params.id
    }
  );

  await notifyUsers(db, [ticket.user_id], 'support_ticket_resolved', {
    ticket_id: ticket.id,
    status
  });

  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'support_ticket_resolved',
    entityType: 'support_ticket',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(204).send();
}));

export default router;
