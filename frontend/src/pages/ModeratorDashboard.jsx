import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Link } from 'react-router-dom';
import CompetitionTimeline from '../components/CompetitionTimeline.jsx';

export default function ModeratorDashboard() {
  const [summary, setSummary] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    api('/api/staff/overview')
      .then((data) => setSummary(data))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
    api('/api/staff/disputes')
      .then((data) => setDisputes(data.disputes || []))
      .catch(() => {});
  }, []);

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Moderator Hub</h3>
        <p className="section-subtitle">Resolve disputes and protect fair play.</p>
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
          <Link className="btn-primary" to="/staff/matches">Review Matches</Link>
          <Link className="btn-secondary" to="/staff/disputes">Resolve Disputes</Link>
        </div>
      </section>

      <CompetitionTimeline />

      <section className="card p-6">
        <h3 className="section-title">Recent Disputes</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {disputes.slice(0, 6).map((item) => (
            <div key={item.id} className="scoreboard">
              <p className="text-xs text-ink-500">Match #{item.match_id}</p>
              <p className="text-sm font-semibold text-ink-900">
                {item.player1_tag || item.player1_id} vs {item.player2_tag || item.player2_id}
              </p>
              <p className="text-xs text-ink-500">Status: {item.status}</p>
            </div>
          ))}
          {!disputes.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No disputes to review right now.
            </div>
          )}
        </div>
      </section>

      {status.message && (
        <p className="text-sm text-red-400">{status.message}</p>
      )}
    </div>
  );
}

