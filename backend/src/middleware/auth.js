import { verifyToken } from '../lib/jwt.js';
import { db } from '../db/index.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const payload = verifyToken(token);
    const [rows] = await db.query(
      `SELECT id, email, phone, role, status, is_premium,
              kyc_status, last_seen_at,
              privacy_profile, privacy_presence, privacy_friend_requests, privacy_follow
       FROM users WHERE id = :id`,
      { id: payload.sub }
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const user = rows[0];
    if (user.status === 'banned') {
      return res.status(403).json({ error: 'banned' });
    }
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized' });
  }
}
