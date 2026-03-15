import { verifyToken } from '../lib/jwt.js';
import { db } from '../db/index.js';

export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return next();
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
      return next();
    }
    const user = rows[0];
    if (user.status === 'banned') {
      return next();
    }
    req.user = user;
    return next();
  } catch (err) {
    return next();
  }
}
