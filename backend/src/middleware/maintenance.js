import { db } from '../db/index.js';
import { verifyToken } from '../lib/jwt.js';
import { getSettings, parseBooleanSetting } from '../services/platformSettings.js';

const ALLOWED_PATHS = new Set([
  '/health',
  '/api/public/maintenance'
]);

export async function maintenanceGate(req, res, next) {
  if (req.method === 'OPTIONS') {
    return next();
  }
  if (ALLOWED_PATHS.has(req.path) || req.path.startsWith('/api/auth')) {
    return next();
  }

  const settings = await getSettings(db, [
    'maintenance_mode',
    'maintenance_message',
    'maintenance_end_time'
  ]);
  const enabled = parseBooleanSetting(settings.maintenance_mode);

  if (!enabled) {
    return next();
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = verifyToken(token);
      const [rows] = await db.query(
        'SELECT id, role, status FROM users WHERE id = :id',
        { id: payload.sub }
      );
      if (rows.length && rows[0].status !== 'banned' && rows[0].role === 'admin') {
        return next();
      }
    } catch (err) {
      // ignore token errors and fall through to maintenance response
    }
  }

  return res.status(503).json({
    error: 'maintenance',
    maintenance: {
      enabled: true,
      message: settings.maintenance_message || 'Platform under maintenance.',
      end_time: settings.maintenance_end_time || null
    }
  });
}
