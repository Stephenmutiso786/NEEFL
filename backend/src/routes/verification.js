import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../lib/validation.js';
import { verificationDetailsSchema, verificationReviewSchema } from '../validators/verification.js';
import { logAudit } from '../services/auditService.js';
import { memoryUpload } from '../services/uploadService.js';
import { resolveKycUrl, uploadKycFile } from '../services/storageService.js';

const router = Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, full_name, id_type, id_number, country, date_of_birth, phone,
            document_url, document_front_url, document_back_url,
            status, reviewed_at, notes, created_at
     FROM user_verifications
     WHERE user_id = :user_id`,
    { user_id: req.user.id }
  );
  const verification = rows[0] || null;
  if (verification) {
    const [frontUrl, backUrl] = await Promise.all([
      resolveKycUrl(verification.document_front_url),
      resolveKycUrl(verification.document_back_url)
    ]);
    verification.document_front_url = frontUrl;
    verification.document_back_url = backUrl;
  }
  res.json({ verification });
}));

router.post('/me', requireAuth, memoryUpload.fields([
  { name: 'document_front', maxCount: 1 },
  { name: 'document_back', maxCount: 1 }
]), asyncHandler(async (req, res) => {
  const parsed = verificationDetailsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
  }
  const { full_name, id_type, id_number, country, date_of_birth, phone } = parsed.data;
  const frontFile = req.files?.document_front?.[0];
  const backFile = req.files?.document_back?.[0];
  if (!frontFile || !backFile) {
    return res.status(400).json({
      error: 'validation_error',
      details: { fieldErrors: { document_front: ['required'], document_back: ['required'] } }
    });
  }
  const isAllowed = (file) => file.mimetype?.startsWith('image/') || file.mimetype === 'application/pdf';
  if (!isAllowed(frontFile) || !isAllowed(backFile)) {
    return res.status(400).json({ error: 'invalid_file_type' });
  }
  const documentFrontUrl = await uploadKycFile({ file: frontFile, userId: req.user.id, side: 'front' });
  const documentBackUrl = await uploadKycFile({ file: backFile, userId: req.user.id, side: 'back' });

  await db.tx(async (conn) => {
    await conn.execute(
      `INSERT INTO user_verifications (
          user_id, full_name, id_type, id_number, country, date_of_birth, phone,
          document_url, document_front_url, document_back_url, status
       )
       VALUES (
          :user_id, :full_name, :id_type, :id_number, :country, :date_of_birth, :phone,
          :document_url, :document_front_url, :document_back_url, 'pending'
       )
       ON CONFLICT (user_id)
       DO UPDATE SET
         full_name = EXCLUDED.full_name,
         id_type = EXCLUDED.id_type,
         id_number = EXCLUDED.id_number,
         country = EXCLUDED.country,
         date_of_birth = EXCLUDED.date_of_birth,
         phone = EXCLUDED.phone,
         document_url = EXCLUDED.document_url,
         document_front_url = EXCLUDED.document_front_url,
         document_back_url = EXCLUDED.document_back_url,
         status = 'pending',
         reviewed_by = NULL,
         reviewed_at = NULL,
         notes = NULL`,
      {
        user_id: req.user.id,
        full_name,
        id_type,
        id_number,
        country,
        date_of_birth,
        phone: phone || null,
        document_url: null,
        document_front_url: documentFrontUrl,
        document_back_url: documentBackUrl
      }
    );

    await conn.execute(
      `UPDATE users SET kyc_status = 'pending' WHERE id = :id`,
      { id: req.user.id }
    );
  });

  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'kyc_submitted',
    entityType: 'user_verification',
    entityId: req.user.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(201).json({ status: 'pending' });
}));

router.get('/admin', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT v.id, v.user_id, v.full_name, v.id_type, v.id_number, v.country, v.date_of_birth,
            v.phone, v.document_url, v.document_front_url, v.document_back_url,
            v.status, v.created_at, v.reviewed_at,
            p.gamer_tag
     FROM user_verifications v
     LEFT JOIN players p ON p.user_id = v.user_id
     ORDER BY v.created_at DESC`
  );
  const verifications = await Promise.all(rows.map(async (row) => {
    const [frontUrl, backUrl] = await Promise.all([
      resolveKycUrl(row.document_front_url),
      resolveKycUrl(row.document_back_url)
    ]);
    return {
      ...row,
      document_front_url: frontUrl,
      document_back_url: backUrl
    };
  }));
  res.json({ verifications });
}));

router.post('/admin/:id/review', requireAuth, requireRole('admin'), validate(verificationReviewSchema), asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const verificationId = Number(req.params.id);

  const [rows] = await db.query(
    'SELECT id, user_id FROM user_verifications WHERE id = :id',
    { id: verificationId }
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const verification = rows[0];

  await db.tx(async (conn) => {
    await conn.execute(
      `UPDATE user_verifications
       SET status = :status, notes = :notes, reviewed_by = :reviewed_by, reviewed_at = NOW()
       WHERE id = :id`,
      {
        status,
        notes: notes || null,
        reviewed_by: req.user.id,
        id: verificationId
      }
    );

    await conn.execute(
      `UPDATE users
       SET kyc_status = :kyc_status,
           kyc_verified_at = CASE WHEN :kyc_status = 'verified' THEN NOW() ELSE NULL END
       WHERE id = :id`,
      {
        kyc_status: status === 'approved' ? 'verified' : 'rejected',
        id: verification.user_id
      }
    );
  });

  await logAudit(db, {
    actorUserId: req.user.id,
    action: 'kyc_reviewed',
    entityType: 'user_verification',
    entityId: verificationId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(204).send();
}));

export default router;
