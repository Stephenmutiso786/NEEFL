import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Link } from 'react-router-dom';
import CompetitionTimeline from '../components/CompetitionTimeline.jsx';

export default function BettorDashboard() {
  const [wallet, setWallet] = useState(null);
  const [bets, setBets] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    api('/api/wallet/me')
      .then((data) => setWallet(data))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
    api('/api/bets/me')
      .then((data) => setBets(data.bets || []))
      .catch(() => {});
  }, []);

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Betting Dashboard</h3>
        <p className="section-subtitle">Manage your balance and active bets.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="scoreboard">
            <p className="label">Wallet Balance</p>
            <p className="mt-2 text-3xl font-semibold text-ink-900">KES {wallet?.balance ?? 0}</p>
          </div>
          <div className="scoreboard">
            <p className="label">Active Bets</p>
            <p className="mt-2 text-3xl font-semibold text-ink-900">
              {bets.filter((bet) => bet.status === 'pending').length}
            </p>
          </div>
          <div className="scoreboard">
            <p className="label">Settled Bets</p>
            <p className="mt-2 text-3xl font-semibold text-ink-900">
              {bets.filter((bet) => bet.status !== 'pending').length}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn-primary" to="/betting">Place Bet</Link>
          <Link className="btn-secondary" to="/payments">Wallet</Link>
          <Link className="btn-secondary" to="/matches">Upcoming Matches</Link>
        </div>
      </section>

      <CompetitionTimeline />

      <section className="card p-6">
        <h3 className="section-title">Recent Bets</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {bets.slice(0, 6).map((bet) => (
            <div key={bet.id} className="scoreboard">
              <p className="text-xs text-ink-500">{bet.tournament_name}</p>
              <p className="text-sm font-semibold text-ink-900">
                {bet.player1_tag || 'TBD'} vs {bet.player2_tag || 'TBD'}
              </p>
              <p className="text-xs text-ink-500">
                Choice: {bet.choice} · Amount: KES {bet.amount} · Status: {bet.status}
              </p>
            </div>
          ))}
          {!bets.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No bets yet. Place your first bet to get started.
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

