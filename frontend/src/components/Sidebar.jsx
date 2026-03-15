import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { clearToken, getToken, getUserRole, healthCheck } from '../lib/api.js';
import { usePermissions } from '../context/PermissionsContext.jsx';

export default function Sidebar() {
  const token = getToken();
  const role = getUserRole();
  const { permissions } = usePermissions();
  const [apiState, setApiState] = useState('checking');
  const canAccess = (module) => !module || permissions?.[module] !== false;
  const navSections = useMemo(() => {
    const base = [
      {
        title: 'Public',
        items: [
          { label: 'Home', path: '/' },
          { label: 'Tournaments', path: '/tournaments', module: 'tournaments' },
          { label: 'Upcoming', path: '/matches#upcoming', module: 'matches' },
          { label: 'Live', path: '/streams', module: 'streams' },
          { label: 'Results', path: '/matches#results', module: 'matches' },
          { label: 'Betting', path: '/betting', module: 'betting' },
          { label: 'Rules', path: '/policies/rulebook', module: 'policies' }
        ]
      }
    ];

    if (!token) return base;

    if (role === 'admin') {
      return [
        ...base,
        {
          title: 'Admin',
          items: [
            { label: 'Dashboard', path: '/admin', module: 'admin' },
            { label: 'Players', path: '/admin/players', module: 'admin' },
            { label: 'Tournaments', path: '/admin/tournaments', module: 'admin' },
            { label: 'Matches', path: '/admin/matches', module: 'admin' },
            { label: 'Live Control', path: '/admin/live', module: 'admin' },
            { label: 'Payments', path: '/admin/payments', module: 'admin' },
            { label: 'Analytics', path: '/admin/analytics', module: 'admin' },
            { label: 'Settings', path: '/admin/settings', module: 'admin' },
            { label: 'Messages', path: '/messages', module: 'messages' }
          ]
        }
      ];
    }

    if (role === 'supervisor' || role === 'referee') {
      return [
        ...base,
        {
          title: 'Staff',
          items: [
            { label: 'Dashboard', path: '/staff', module: 'staff' },
            { label: 'Match Review', path: '/staff/matches', module: 'staff' },
            { label: 'Disputes', path: '/staff/disputes', module: 'disputes' },
            { label: 'Community', path: '/community', module: 'community' },
            { label: 'Messages', path: '/messages', module: 'messages' },
            { label: 'Clubs', path: '/clubs', module: 'clubs' }
          ]
        },
        {
          title: 'Player',
          items: [
            { label: 'My Dashboard', path: '/player/dashboard' },
            { label: 'My Matches', path: '/player/matches', module: 'matches' },
            { label: 'Messages', path: '/messages', module: 'messages' },
            { label: 'Betting', path: '/betting', module: 'betting' },
            { label: 'Wallet', path: '/payments', module: 'wallet' },
            { label: 'Notifications', path: '/notifications', module: 'notifications' },
            { label: 'Profile', path: '/player/profile' }
          ]
        }
      ];
    }

    if (role === 'moderator') {
      return [
        ...base,
        {
          title: 'Moderator',
          items: [
            { label: 'Dashboard', path: '/moderator', module: 'staff' },
            { label: 'Match Review', path: '/staff/matches', module: 'staff' },
            { label: 'Disputes', path: '/staff/disputes', module: 'disputes' },
            { label: 'Community', path: '/community', module: 'community' },
            { label: 'Messages', path: '/messages', module: 'messages' },
            { label: 'Rules', path: '/policies/rulebook', module: 'policies' }
          ]
        }
      ];
    }

    if (role === 'broadcaster') {
      return [
        ...base,
        {
          title: 'Broadcast',
          items: [
            { label: 'Dashboard', path: '/broadcaster', module: 'streams' },
            { label: 'Live Matches', path: '/streams', module: 'streams' },
            { label: 'Upcoming', path: '/matches#upcoming', module: 'matches' },
            { label: 'Results', path: '/matches#results', module: 'matches' },
            { label: 'Messages', path: '/messages', module: 'messages' }
          ]
        }
      ];
    }

    if (role === 'fan') {
      return [
        ...base,
        {
          title: 'Fan',
          items: [
            { label: 'Dashboard', path: '/fan/dashboard', module: 'matches' },
            { label: 'Live', path: '/streams', module: 'streams' },
            { label: 'Upcoming', path: '/matches#upcoming', module: 'matches' },
            { label: 'Results', path: '/matches#results', module: 'matches' },
            { label: 'Leaderboard', path: '/leaderboard' },
            { label: 'Messages', path: '/messages', module: 'messages' }
          ]
        }
      ];
    }

    if (role === 'bettor') {
      return [
        ...base,
        {
          title: 'Betting',
          items: [
            { label: 'Dashboard', path: '/bettor/dashboard', module: 'betting' },
            { label: 'Place Bets', path: '/betting', module: 'betting' },
            { label: 'Wallet', path: '/payments', module: 'wallet' },
            { label: 'Upcoming', path: '/matches#upcoming', module: 'matches' },
            { label: 'Messages', path: '/messages', module: 'messages' }
          ]
        }
      ];
    }

    return [
      ...base,
      {
        title: 'Player',
          items: [
            { label: 'Dashboard', path: '/player/dashboard' },
            { label: 'Profile', path: '/player/profile' },
            { label: 'Tournaments', path: '/player/tournaments', module: 'tournaments' },
            { label: 'My Matches', path: '/player/matches', module: 'matches' },
            { label: 'Betting', path: '/betting', module: 'betting' },
            { label: 'Community', path: '/community', module: 'community' },
            { label: 'Messages', path: '/messages', module: 'messages' },
            { label: 'Clubs', path: '/clubs', module: 'clubs' },
            { label: 'Wallet', path: '/payments', module: 'wallet' },
            { label: 'Notifications', path: '/notifications', module: 'notifications' },
            { label: 'Support', path: '/support', module: 'support' },
            { label: 'Rules', path: '/policies/rulebook', module: 'policies' }
          ]
        }
      ];
  }, [token, role]);

  useEffect(() => {
    healthCheck()
      .then(() => setApiState('online'))
      .catch(() => setApiState('offline'));
  }, []);

  return (
    <aside className="flex h-full w-full flex-col gap-6 border-r border-sand-200 bg-sand-100/80 px-5 py-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-ink-500">NEEFL</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900">eFootball Arena</h1>
        <p className="mt-2 text-sm text-ink-500">Match control and live operations.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">API: {apiState}</span>
        </div>
      </div>

      <div className="space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="label mb-3">{section.title}</p>
            <div className="flex flex-col gap-2">
              {section.items.filter((item) => canAccess(item.module)).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-sand-50 text-ink-900 glow-ring'
                      : 'text-ink-500 hover:bg-sand-50 hover:text-ink-900'
                  }`
                }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto rounded-2xl border border-sand-200 bg-sand-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Session</p>
        <p className="mt-2 text-sm text-ink-700">
          {token ? `Active (${role || 'user'})` : 'No token saved'}
        </p>
        <button
          type="button"
          onClick={() => clearToken()}
          className="btn-secondary mt-3 w-full"
        >
          Clear Token
        </button>
      </div>
    </aside>
  );
}
