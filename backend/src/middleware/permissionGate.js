import { db } from '../db/index.js';
import { verifyToken } from '../lib/jwt.js';
import { fetchRolePermissions, permissionsForRole } from '../services/rolePermissions.js';

const BYPASS_PREFIXES = [
  '/health',
  '/uploads',
  '/api/public',
  '/api/auth'
];

function resolveModule(pathname) {
  if (!pathname) return null;
  if (pathname.startsWith('/api/admin')) return 'admin';
  if (pathname.startsWith('/api/staff')) return 'staff';
  if (pathname.startsWith('/api/bets')) return 'betting';
  if (pathname.startsWith('/api/wallet') || pathname.startsWith('/api/payments')) return 'wallet';
  if (pathname.startsWith('/api/live-streams') || pathname.startsWith('/api/streams')) return 'streams';
  if (pathname.startsWith('/api/social')) return 'community';
  if (pathname.startsWith('/api/messages')) return 'messages';
  if (pathname.startsWith('/api/clubs')) return 'clubs';
  if (pathname.startsWith('/api/disputes')) return 'disputes';
  if (pathname.startsWith('/api/matches')) return 'matches';
  if (pathname.startsWith('/api/tournaments')) return 'tournaments';
  if (pathname.startsWith('/api/notifications')) return 'notifications';
  if (pathname.startsWith('/api/support')) return 'support';
  if (pathname.startsWith('/api/seasons')) return 'seasons';
  if (pathname.startsWith('/api/policies')) return 'policies';
  if (pathname.startsWith('/api/verification')) return 'kyc';
  return null;
}

export async function permissionGate(req, res, next) {
  if (req.method === 'OPTIONS') return next();

  const path = req.path || req.originalUrl || '';
  if (BYPASS_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return next();
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return next();
  }

  try {
    const payload = verifyToken(token);
    const [rows] = await db.query(
      'SELECT id, role, status FROM users WHERE id = :id',
      { id: payload.sub }
    );
    if (!rows.length) {
      return next();
    }
    const user = rows[0];
    if (user.status === 'banned') {
      return res.status(403).json({ error: 'banned' });
    }
    if (user.role === 'admin') {
      return next();
    }

    const moduleKey = resolveModule(path);
    if (!moduleKey) {
      return next();
    }

    const permissions = await fetchRolePermissions(db);
    const rolePermissions = permissionsForRole(user.role, permissions);
    if (Object.prototype.hasOwnProperty.call(rolePermissions, moduleKey) && rolePermissions[moduleKey] === false) {
      return res.status(403).json({ error: 'permission_denied', module: moduleKey });
    }
  } catch (err) {
    return next();
  }

  return next();
}
