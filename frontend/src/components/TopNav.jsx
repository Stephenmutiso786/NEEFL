import { NavLink, useNavigate } from 'react-router-dom';
import { clearToken, getToken, getUserRole } from '../lib/api.js';
import { usePermissions } from '../context/PermissionsContext.jsx';

const publicLinks = [
  { label: 'Home', path: '/' },
  { label: 'Tournaments', path: '/tournaments', module: 'tournaments' },
  { label: 'Upcoming', path: '/matches#upcoming', module: 'matches' },
  { label: 'Live', path: '/streams', module: 'streams' },
  { label: 'Results', path: '/matches#results', module: 'matches' },
  { label: 'Betting', path: '/betting', module: 'betting' },
  { label: 'Rules', path: '/policies/rulebook', module: 'policies' }
];

const adminLinks = [
  { label: 'Dashboard', path: '/admin', module: 'admin' },
  { label: 'Players', path: '/admin/players', module: 'admin' },
  { label: 'Tournaments', path: '/admin/tournaments', module: 'admin' },
  { label: 'Matches', path: '/admin/matches', module: 'admin' },
  { label: 'Live Control', path: '/admin/live', module: 'admin' },
  { label: 'Payments', path: '/admin/payments', module: 'admin' },
  { label: 'Analytics', path: '/admin/analytics', module: 'admin' },
  { label: 'Settings', path: '/admin/settings', module: 'admin' }
];

const staffLinks = [
  { label: 'Staff Hub', path: '/staff', module: 'staff' },
  { label: 'Match Review', path: '/staff/matches', module: 'staff' },
  { label: 'Disputes', path: '/staff/disputes', module: 'disputes' },
  { label: 'Betting', path: '/betting', module: 'betting' },
  { label: 'Community', path: '/community', module: 'community' },
  { label: 'Clubs', path: '/clubs', module: 'clubs' },
  { label: 'Wallet', path: '/payments', module: 'wallet' }
];

const moderatorLinks = [
  { label: 'Moderator Hub', path: '/moderator', module: 'staff' },
  { label: 'Match Review', path: '/staff/matches', module: 'staff' },
  { label: 'Disputes', path: '/staff/disputes', module: 'disputes' },
  { label: 'Community', path: '/community', module: 'community' },
  { label: 'Rules', path: '/policies/rulebook', module: 'policies' }
];

const broadcasterLinks = [
  { label: 'Broadcast', path: '/broadcaster', module: 'streams' },
  { label: 'Live Matches', path: '/streams', module: 'streams' },
  { label: 'Upcoming', path: '/matches#upcoming', module: 'matches' },
  { label: 'Results', path: '/matches#results', module: 'matches' },
  { label: 'Rules', path: '/policies/rulebook', module: 'policies' }
];

const fanLinks = [
  { label: 'Fan Hub', path: '/fan/dashboard', module: 'matches' },
  { label: 'Upcoming', path: '/matches#upcoming', module: 'matches' },
  { label: 'Live', path: '/streams', module: 'streams' },
  { label: 'Results', path: '/matches#results', module: 'matches' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'Betting', path: '/betting', module: 'betting' },
  { label: 'Rules', path: '/policies/rulebook', module: 'policies' }
];

const bettorLinks = [
  { label: 'Betting Hub', path: '/bettor/dashboard', module: 'betting' },
  { label: 'Betting', path: '/betting', module: 'betting' },
  { label: 'Wallet', path: '/payments', module: 'wallet' },
  { label: 'Upcoming', path: '/matches#upcoming', module: 'matches' },
  { label: 'Results', path: '/matches#results', module: 'matches' },
  { label: 'Rules', path: '/policies/rulebook', module: 'policies' }
];

const playerLinks = [
  { label: 'Dashboard', path: '/player/dashboard' },
  { label: 'Tournaments', path: '/player/tournaments', module: 'tournaments' },
  { label: 'My Matches', path: '/player/matches', module: 'matches' },
  { label: 'Betting', path: '/betting', module: 'betting' },
  { label: 'Community', path: '/community', module: 'community' },
  { label: 'Clubs', path: '/clubs', module: 'clubs' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'Wallet', path: '/payments', module: 'wallet' },
  { label: 'Notifications', path: '/notifications', module: 'notifications' },
  { label: 'Profile', path: '/player/profile' },
  { label: 'Rules', path: '/policies/rulebook', module: 'policies' }
];

export default function TopNav() {
  const token = getToken();
  const role = getUserRole();
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  const canAccess = (module) => !module || permissions?.[module] !== false;
  let links = publicLinks;
  if (token) {
    if (role === 'admin') {
      links = adminLinks;
    } else if (role === 'supervisor' || role === 'referee') {
      links = staffLinks;
    } else if (role === 'moderator') {
      links = moderatorLinks;
    } else if (role === 'broadcaster') {
      links = broadcasterLinks;
    } else if (role === 'fan') {
      links = fanLinks;
    } else if (role === 'bettor') {
      links = bettorLinks;
    } else {
      links = playerLinks;
    }
  }

  const onLogout = () => {
    clearToken();
    navigate('/login');
  };

  const visibleLinks = links.filter((link) => canAccess(link.module));

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="nav-pill">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : 'nav-link-idle'}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
      {!token && (
        <>
          <NavLink className="btn-secondary" to="/login">Login</NavLink>
          <NavLink className="btn-secondary" to="/register">Register</NavLink>
        </>
      )}
      {token && (
        <button type="button" className="btn-ghost" onClick={onLogout}>Logout</button>
      )}
    </div>
  );
}
