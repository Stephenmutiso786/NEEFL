const CACHE_TTL_MS = 5000;
let cache = {
  expiresAt: 0,
  values: {}
};

function normalizeKey(key) {
  return String(key || '').trim();
}

export async function getSettings(db, keys) {
  const now = Date.now();
  if (now > cache.expiresAt) {
    cache = { expiresAt: 0, values: {} };
  }

  const requested = (keys || []).map(normalizeKey).filter(Boolean);
  const missing = requested.filter((key) => !(key in cache.values));

  if (missing.length) {
    const placeholders = missing.map((_, idx) => `:k${idx}`).join(', ');
    const params = Object.fromEntries(missing.map((key, idx) => [`k${idx}`, key]));
    const [rows] = await db.query(
      `SELECT setting_key, setting_value
       FROM platform_settings
       WHERE setting_key IN (${placeholders})`,
      params
    );
    const found = new Set();
    rows.forEach((row) => {
      cache.values[row.setting_key] = row.setting_value;
      found.add(row.setting_key);
    });
    missing.forEach((key) => {
      if (!found.has(key)) {
        cache.values[key] = null;
      }
    });
    cache.expiresAt = now + CACHE_TTL_MS;
  }

  return requested.reduce((acc, key) => {
    acc[key] = cache.values[key] ?? null;
    return acc;
  }, {});
}

export function parseBooleanSetting(value) {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(normalized);
}

