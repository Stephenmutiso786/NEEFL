import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../lib/validation.js';
import { clubCreateSchema } from '../validators/clubs.js';
import { logActivity } from '../services/activityService.js';

const router = Router();

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

async function hasClubControl(userId, clubId) {
  const [rows] = await db.query(
    `SELECT role, status
     FROM club_members
     WHERE club_id = :club_id AND user_id = :user_id`,
    { club_id: clubId, user_id: userId }
  );
  if (!rows.length) return false;
  return rows[0].status === 'approved' && ['owner', 'manager'].includes(rows[0].role);
}

router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT c.id, c.name, c.slug, c.description, c.logo_url, c.region, c.created_at,
            (SELECT COUNT(*) FROM club_members cm WHERE cm.club_id = c.id AND cm.status = 'approved') as member_count
     FROM clubs c
     ORDER BY c.created_at DESC`
  );
  res.json({ clubs: rows });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT c.id, c.name, c.slug, c.logo_url, cm.role, cm.status, cm.joined_at
     FROM club_members cm
     JOIN clubs c ON c.id = cm.club_id
     WHERE cm.user_id = :user_id
     ORDER BY cm.created_at DESC`,
    { user_id: req.user.id }
  );
  res.json({ clubs: rows });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const [clubs] = await db.query(
    `SELECT c.id, c.name, c.slug, c.description, c.logo_url, c.region, c.created_at,
            p.gamer_tag as owner_tag
     FROM clubs c
     LEFT JOIN club_members cm ON cm.club_id = c.id AND cm.role = 'owner'
     LEFT JOIN players p ON p.user_id = cm.user_id
     WHERE c.id = :id`,
    { id: req.params.id }
  );
  if (!clubs.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const [members] = await db.query(
    `SELECT cm.user_id, cm.role, cm.joined_at, p.gamer_tag
     FROM club_members cm
     LEFT JOIN players p ON p.user_id = cm.user_id
     WHERE cm.club_id = :club_id AND cm.status = 'approved'
     ORDER BY cm.role ASC, cm.joined_at DESC`,
    { club_id: req.params.id }
  );
  res.json({ club: clubs[0], members });
}));

router.post('/', requireAuth, validate(clubCreateSchema), asyncHandler(async (req, res) => {
  const { name, slug, description, logo_url, region } = req.body;
  const finalSlug = slugify(slug || name);
  if (!finalSlug) {
    return res.status(400).json({ error: 'invalid_slug' });
  }

  const clubId = await db.tx(async (conn) => {
    const [result] = await conn.execute(
      `INSERT INTO clubs (name, slug, description, logo_url, region, created_by)
       VALUES (:name, :slug, :description, :logo_url, :region, :created_by)`,
      {
        name,
        slug: finalSlug,
        description: description || null,
        logo_url: logo_url || null,
        region: region || null,
        created_by: req.user.id
      }
    );

    await conn.execute(
      `INSERT INTO club_members (club_id, user_id, role, status, joined_at)
       VALUES (:club_id, :user_id, 'owner', 'approved', NOW())`,
      { club_id: result.insertId, user_id: req.user.id }
    );

    return result.insertId;
  });

  await logActivity(db, {
    actorUserId: req.user.id,
    verb: 'club_created',
    entityType: 'club',
    entityId: clubId,
    visibility: 'public',
    payload: { club_id: clubId, name }
  });

  res.status(201).json({ id: clubId, slug: finalSlug });
}));

router.post('/:id/join', requireAuth, asyncHandler(async (req, res) => {
  const clubId = Number(req.params.id);
  const [clubs] = await db.query(
    'SELECT id FROM clubs WHERE id = :id',
    { id: clubId }
  );
  if (!clubs.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  const [existing] = await db.query(
    `SELECT id, status FROM club_members WHERE club_id = :club_id AND user_id = :user_id`,
    { club_id: clubId, user_id: req.user.id }
  );
  if (existing.length) {
    return res.status(409).json({ error: 'already_requested' });
  }

  await db.query(
    `INSERT INTO club_members (club_id, user_id, status)
     VALUES (:club_id, :user_id, 'pending')`,
    { club_id: clubId, user_id: req.user.id }
  );
  res.status(201).json({ status: 'pending' });
}));

router.post('/:id/members/:userId/approve', requireAuth, asyncHandler(async (req, res) => {
  const clubId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);

  const allowed = req.user.role === 'admin' || await hasClubControl(req.user.id, clubId);
  if (!allowed) {
    return res.status(403).json({ error: 'forbidden' });
  }

  await db.query(
    `UPDATE club_members
     SET status = 'approved', joined_at = NOW()
     WHERE club_id = :club_id AND user_id = :user_id`,
    { club_id: clubId, user_id: targetUserId }
  );

  await logActivity(db, {
    actorUserId: targetUserId,
    verb: 'club_joined',
    entityType: 'club',
    entityId: clubId,
    visibility: 'public',
    payload: { club_id: clubId }
  });

  res.status(204).send();
}));

router.delete('/:id/members/:userId', requireAuth, asyncHandler(async (req, res) => {
  const clubId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  const isSelf = targetUserId === req.user.id;
  const allowed = isSelf || req.user.role === 'admin' || await hasClubControl(req.user.id, clubId);
  if (!allowed) {
    return res.status(403).json({ error: 'forbidden' });
  }
  await db.query(
    `DELETE FROM club_members WHERE club_id = :club_id AND user_id = :user_id`,
    { club_id: clubId, user_id: targetUserId }
  );
  res.status(204).send();
}));

export default router;
