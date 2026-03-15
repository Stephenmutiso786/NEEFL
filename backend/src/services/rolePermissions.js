import { getSettings } from './platformSettings.js';

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    admin: true,
    staff: true,
    matches: true,
    tournaments: true,
    streams: true,
    betting: true,
    wallet: true,
    community: true,
    messages: true,
    clubs: true,
    disputes: true,
    support: true,
    notifications: true,
    policies: true,
    seasons: true
  },
  player: {
    matches: true,
    tournaments: true,
    streams: true,
    betting: true,
    wallet: true,
    community: true,
    messages: true,
    clubs: true,
    disputes: true,
    support: true,
    notifications: true,
    policies: true,
    seasons: true
  },
  fan: {
    matches: true,
    tournaments: true,
    streams: true,
    betting: true,
    wallet: true,
    community: true,
    messages: true,
    support: true,
    notifications: true,
    policies: true,
    seasons: true
  },
  bettor: {
    matches: true,
    tournaments: true,
    streams: true,
    betting: true,
    wallet: true,
    community: true,
    messages: true,
    support: true,
    notifications: true,
    policies: true,
    seasons: true
  },
  supervisor: {
    staff: true,
    matches: true,
    tournaments: true,
    streams: true,
    disputes: true,
    community: true,
    messages: true,
    support: true,
    notifications: true,
    policies: true,
    seasons: true
  },
  referee: {
    staff: true,
    matches: true,
    streams: true,
    disputes: true,
    community: true,
    messages: true,
    support: true,
    notifications: true,
    policies: true,
    seasons: true
  },
  moderator: {
    staff: true,
    matches: true,
    streams: true,
    disputes: true,
    community: true,
    messages: true,
    support: true,
    notifications: true,
    policies: true,
    seasons: true
  },
  broadcaster: {
    streams: true,
    matches: true,
    tournaments: true,
    messages: true,
    support: true,
    notifications: true,
    policies: true,
    seasons: true
  }
};

function ensureRoleDefaults(raw) {
  const merged = {};
  Object.entries(DEFAULT_ROLE_PERMISSIONS).forEach(([role, defaults]) => {
    merged[role] = { ...defaults, ...(raw?.[role] || {}) };
  });
  Object.keys(raw || {}).forEach((role) => {
    if (!merged[role]) {
      merged[role] = { ...raw[role] };
    }
  });
  return merged;
}

export async function fetchRolePermissions(db) {
  const settings = await getSettings(db, ['role_permissions']);
  const rawValue = settings.role_permissions;
  if (!rawValue) {
    return ensureRoleDefaults({});
  }
  try {
    const parsed = JSON.parse(rawValue);
    if (parsed && typeof parsed === 'object') {
      return ensureRoleDefaults(parsed);
    }
  } catch (err) {
    return ensureRoleDefaults({});
  }
  return ensureRoleDefaults({});
}

export function permissionsForRole(role, permissions) {
  if (!role) return {};
  if (!permissions) return DEFAULT_ROLE_PERMISSIONS[role] || {};
  return permissions[role] || DEFAULT_ROLE_PERMISSIONS[role] || {};
}
