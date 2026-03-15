import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import LeaderboardChart from '../components/LeaderboardChart.jsx';

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    api('/api/players/leaderboard', { auth: false })
      .then((data) => setRows(data.leaderboard || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
  }, []);

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Leaderboard</h3>
        <p className="section-subtitle">Top players ranked by points.</p>
        {rows.length > 0 && (
          <div className="mt-4">
            <LeaderboardChart rows={rows} />
          </div>
        )}
      </section>

      <section className="card p-6">
        <h3 className="card-title">Top 100</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-ink-500">
                <th className="py-2">Player</th>
                <th className="py-2">Points</th>
                <th className="py-2">Wins</th>
                <th className="py-2">Goals</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id} className="border-t border-sand-200">
                  <td className="py-2 font-semibold text-ink-900">
                    <Link className="text-mint-500 hover:text-mint-700" to={`/players/${row.user_id}`}>
                      {row.gamer_tag}
                    </Link>
                  </td>
                  <td className="py-2 text-ink-700">{row.rank_points}</td>
                  <td className="py-2 text-ink-700">{row.wins}</td>
                  <td className="py-2 text-ink-700">{row.goals_scored}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="mt-4 text-sm text-ink-500">No leaderboard data yet.</p>
        )}
      </section>

      {status.message && (
        <p className="text-sm text-red-600">{status.message}</p>
      )}
    </div>
  );
}
