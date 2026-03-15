import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, getUserRole } from '../lib/api.js';

const DEFAULT_ROLE_PERMISSIONS = {
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
    support: true,
    notifications: true,
    policies: true,
    seasons: true
  }
};

const PermissionsContext = createContext({ loaded: false, permissions: {}, role: null });

function mergeDefaults(role, permissions) {
  if (!role) return permissions || {};
  const defaults = DEFAULT_ROLE_PERMISSIONS[role] || {};
  return { ...defaults, ...(permissions || {}) };
}

export function PermissionsProvider({ children }) {
  const token = getToken();
  const role = getUserRole();
  const [state, setState] = useState({
    loaded: false,
    role,
    permissions: mergeDefaults(role, {})
  });

  useEffect(() => {
    if (!token) {
      setState({ loaded: true, role: null, permissions: {} });
      return;
    }
    let mounted = true;
    api('/api/public/permissions')
      .then((data) => {
        if (!mounted) return;
        const currentRole = data.role || role;
        setState({
          loaded: true,
          role: currentRole,
          permissions: mergeDefaults(currentRole, data.permissions || {})
        });
      })
      .catch(() => {
        if (!mounted) return;
        setState({
          loaded: true,
          role,
          permissions: mergeDefaults(role, {})
        });
      });
    return () => {
      mounted = false;
    };
  }, [token, role]);

  const value = useMemo(() => state, [state]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
