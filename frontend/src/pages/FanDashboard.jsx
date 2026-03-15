import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Link } from 'react-router-dom';
import CompetitionTimeline from '../components/CompetitionTimeline.jsx';

export default function FanDashboard() {
  const [overview, setOverview] = useState({ upcoming: [], live: [], results: [] });
  const [leaders, setLeaders] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    api('/api/public/overview', { auth: false })
      .then((data) => setOverview(data))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
    api('/api/players/leaderboard', { auth: false })
      .then((data) => setLeaders(data.leaderboard || []))
      .catch(() => {});
  }, []);

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Fan Dashboard</h3>
        <p className="section-subtitle">Track live matches, results, and top players.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="scoreboard">
            <p className="label">Live Matches</p>
            <p className="mt-2 text-3xl font-semibold text-ink-900">{overview.live?.length || 0}</p>
          </div>
          <div className="scoreboard">
            <p className="label">Upcoming</p>
            <p className="mt-2 text-3xl font-semibold text-ink-900">{overview.upcoming?.length || 0}</p>
          </div>
          <div className="scoreboard">
            <p className="label">Results</p>
            <p className="mt-2 text-3xl font-semibold text-ink-900">{overview.results?.length || 0}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn-primary" to="/matches">View Matches</Link>
          <Link className="btn-secondary" to="/streams">Watch Live</Link>
          <Link className="btn-secondary" to="/leaderboard">Leaderboard</Link>
          <Link className="btn-secondary" to="/betting">Betting Odds</Link>
        </div>
      </section>

      <CompetitionTimeline />

      <section className="card p-6">
        <h3 className="section-title">Top Players</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {leaders.slice(0, 6).map((player, idx) => (
            <div key={player.user_id} className="scoreboard">
              <p className="text-xs text-ink-500">#{idx + 1}</p>
              <p className="text-sm font-semibold text-ink-900">{player.gamer_tag}</p>
              <p className="text-xs text-ink-500">
                {player.rank_points} pts · {player.wins}W/{player.losses}L
              </p>
            </div>
          ))}
          {!leaders.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No leaderboard data yet.
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

