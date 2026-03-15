import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../lib/validation.js';
import { policyCreateSchema, policyUpdateSchema } from '../validators/policies.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, slug, title, category, status, updated_at, created_at
     FROM policy_documents
     ORDER BY updated_at DESC`
  );
  res.json({ policies: rows });
}));

router.post('/', requireAuth, requireRole('admin'), validate(policyCreateSchema), asyncHandler(async (req, res) => {
  const { slug, title, category, body, status } = req.body;
  const [result] = await db.query(
    `INSERT INTO policy_documents (slug, title, category, body, status, updated_by)
     VALUES (:slug, :title, :category, :body, :status, :updated_by)`,
    {
      slug,
      title,
      category: category || 'policy',
      body,
      status: status || 'draft',
      updated_by: req.user.id
    }
  );
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'policy_created',
    entityType: 'policy',
    entityId: result.insertId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(201).json({ id: result.insertId });
}));

router.get('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, slug, title, category, body, status, updated_at, created_at
     FROM policy_documents
     WHERE id = :id`,
    { id: req.params.id }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json({ policy: rows[0] });
}));

router.put('/:id', requireAuth, requireRole('admin'), validate(policyUpdateSchema), asyncHandler(async (req, res) => {
  const { title, category, body, status } = req.body;
  await db.query(
    `UPDATE policy_documents
     SET title = COALESCE(:title, title),
         category = COALESCE(:category, category),
         body = COALESCE(:body, body),
         status = COALESCE(:status, status),
         updated_by = :updated_by
     WHERE id = :id`,
    {
      title: title || null,
      category: category || null,
      body: body || null,
      status: status || null,
      updated_by: req.user.id,
      id: req.params.id
    }
  );
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'policy_updated',
    entityType: 'policy',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  await db.query('DELETE FROM policy_documents WHERE id = :id', { id: req.params.id });
  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'policy_deleted',
    entityType: 'policy',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
}));

export default router;
