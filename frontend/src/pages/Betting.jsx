import { useEffect, useMemo, useState } from 'react';
import { api, getToken, getUserRole } from '../lib/api.js';
import BallIcon from '../components/BallIcon.jsx';

const formatDateTime = (value) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function Betting() {
  const token = getToken();
  const role = getUserRole();
  const canBet = Boolean(token) && ['player', 'supervisor', 'referee', 'fan', 'bettor'].includes(role);

  const [matches, setMatches] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [bets, setBets] = useState([]);
  const [form, setForm] = useState({ match_id: '', choice: 'home', amount: '' });
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    api('/api/public/odds', { auth: false })
      .then((data) => setMatches(data.odds || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));

    if (canBet) {
      api('/api/wallet/me')
        .then((data) => setWallet(data))
        .catch(() => {});
      api('/api/bets/me')
        .then((data) => setBets(data.bets || []))
        .catch(() => {});
    }
  }, [canBet]);

  const selectedMatch = useMemo(
    () => matches.find((m) => String(m.id) === String(form.match_id)),
    [matches, form.match_id]
  );

  const placeBet = async (event) => {
    event.preventDefault();
    if (!canBet) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/bets', {
        method: 'POST',
        body: {
          match_id: Number(form.match_id),
          amount: Number(form.amount),
          choice: form.choice
        }
      });
      setStatus({ state: 'success', message: 'Bet placed successfully.' });
      setForm((prev) => ({ ...prev, amount: '' }));
      const [walletData, betsData] = await Promise.all([
        api('/api/wallet/me'),
        api('/api/bets/me')
      ]);
      setWallet(walletData);
      setBets(betsData.bets || []);
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h3 className="section-title">Betting Odds</h3>
          <p className="text-xs text-ink-500">Odds visible to all users.</p>
        </div>
        <div className="mt-4 grid gap-3">
          {matches.map((match) => (
            <button
              key={match.id}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, match_id: String(match.id) }))}
              className={`scoreboard text-left transition ${
                String(form.match_id) === String(match.id) ? 'border-mint-500/70 glow-ring' : ''
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {match.player1_tag || 'TBD'} vs {match.player2_tag || 'TBD'}
                  </p>
                  <p className="text-xs text-ink-500">{match.tournament_name}</p>
                </div>
                <div className="text-xs text-ink-500">{formatDateTime(match.scheduled_at)}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-500">
                <span>Home {match.odds_home}</span>
                <span>Draw {match.odds_draw}</span>
                <span>Away {match.odds_away}</span>
                <span className={`rounded-full px-2 py-0.5 ${match.betting_status === 'open' ? 'bg-mint-500/20 text-mint-500' : 'bg-sand-200 text-ink-500'}`}>
                  {match.betting_status === 'open' ? 'Betting Open' : 'Betting Closed'}
                </span>
              </div>
            </button>
          ))}
          {!matches.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No matches open for betting.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4">
        <div className="card p-6">
          <h3 className="section-title">Bet Slip</h3>
          <p className="section-subtitle">Sign in to place a bet on the selected match.</p>
          {!canBet && (
            <p className="mt-4 text-sm text-ink-500">
              Only registered players, fans, bettors, supervisors, and referees can place bets.
            </p>
          )}
          {canBet && (
            <form className="mt-4 grid gap-4" onSubmit={placeBet}>
              <div>
                <label className="label">Match</label>
                <select
                  className="input"
                  value={form.match_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, match_id: e.target.value }))}
                  required
                >
                  <option value="">Select a match</option>
                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      #{match.id} {match.player1_tag || 'TBD'} vs {match.player2_tag || 'TBD'}
                    </option>
                  ))}
                </select>
              </div>
              {selectedMatch && (
                <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-xs text-ink-500">
                  Odds: Home {selectedMatch.odds_home} · Draw {selectedMatch.odds_draw} · Away {selectedMatch.odds_away}
                  {selectedMatch.betting_status !== 'open' && (
                    <span className="ml-2 text-red-400">Betting is closed for this match.</span>
                  )}
                </div>
              )}
              <div>
                <label className="label">Choice</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {['home', 'draw', 'away'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`btn-secondary ${form.choice === option ? 'border-mint-500/70 text-ink-900' : ''}`}
                      onClick={() => setForm((prev) => ({ ...prev, choice: option }))}
                    >
                      {option.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Amount (KES)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
              <button
                className="btn-primary"
                type="submit"
                disabled={status.state === 'loading' || (selectedMatch && selectedMatch.betting_status !== 'open')}
              >
                <span className="flex items-center gap-2">
                  <BallIcon className="h-4 w-4" />
                  {status.state === 'loading' ? 'Placing...' : 'Place Bet'}
                </span>
              </button>
            </form>
          )}
          {wallet && (
            <p className="mt-4 text-sm text-ink-500">
              Wallet balance: KES {wallet.balance}
            </p>
          )}
          {status.message && (
            <p className={`mt-3 text-sm ${status.state === 'error' ? 'text-red-400' : 'text-ink-500'}`}>
              {status.message}
            </p>
          )}
        </div>

        <div className="card p-6">
          <h3 className="section-title">My Bets</h3>
          <div className="mt-4 grid gap-3">
            {bets.map((bet) => (
              <div key={bet.id} className="scoreboard">
                <p className="text-xs text-ink-500">
                  {bet.tournament_name} · #{bet.match_id}
                </p>
                <p className="text-sm font-semibold text-ink-900">
                  {bet.player1_tag || 'TBD'} vs {bet.player2_tag || 'TBD'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                  <span>Choice: {bet.choice}</span>
                  <span>Stake: KES {bet.amount}</span>
                  <span>Odds: {bet.odds}</span>
                  <span>Status: {bet.status}</span>
                  {bet.payout > 0 && <span>Payout: KES {bet.payout}</span>}
                </div>
              </div>
            ))}
            {!bets.length && (
              <p className="text-sm text-ink-500">No bets placed yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
