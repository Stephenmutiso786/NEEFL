import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Link } from 'react-router-dom';
import CompetitionTimeline from '../components/CompetitionTimeline.jsx';
import { usePermissions } from '../context/PermissionsContext.jsx';

export default function StaffDashboard() {
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const { permissions } = usePermissions();
  const canAccess = (module) => !module || permissions?.[module] !== false;

  useEffect(() => {
    api('/api/staff/overview')
      .then((data) => setSummary(data))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
  }, []);

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Staff Control Room</h3>
        <p className="section-subtitle">Review results, handle disputes, and keep matches fair.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="scoreboard">
            <p className="label">Pending Matches</p>
            <p className="mt-2 text-3xl font-semibold text-ink-900">{summary?.pending_matches ?? 0}</p>
          </div>
          <div className="scoreboard">
            <p className="label">Open Disputes</p>
            <p className="mt-2 text-3xl font-semibold text-ink-900">{summary?.open_disputes ?? 0}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {canAccess('staff') && <Link className="btn-primary" to="/staff/matches">Review Matches</Link>}
          {canAccess('disputes') && <Link className="btn-secondary" to="/staff/disputes">Resolve Disputes</Link>}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Quick Access</h3>
        <p className="section-subtitle">Key tools for supervisors, referees, and moderators.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {canAccess('staff') && (
            <Link className="tile tile-teal" to="/staff/matches">
              <p className="text-sm font-semibold">Match Review</p>
              <p className="text-xs opacity-80">Verify results</p>
            </Link>
          )}
          {canAccess('disputes') && (
            <Link className="tile tile-magenta" to="/staff/disputes">
              <p className="text-sm font-semibold">Disputes</p>
              <p className="text-xs opacity-80">Resolve cases</p>
            </Link>
          )}
          {canAccess('streams') && (
            <Link className="tile tile-gold" to="/streams">
              <p className="text-sm font-semibold">Live Arena</p>
              <p className="text-xs opacity-80">Watch streams</p>
            </Link>
          )}
          {canAccess('community') && (
            <Link className="tile tile-lime" to="/community">
              <p className="text-sm font-semibold">Community</p>
              <p className="text-xs opacity-80">Players online</p>
            </Link>
          )}
        </div>
      </section>

      <CompetitionTimeline />

      {status.message && (
        <p className="text-sm text-red-400">{status.message}</p>
      )}
    </div>
  );
}
