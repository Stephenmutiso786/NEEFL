import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function AdminMatches() {
  const [matches, setMatches] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [rejectForm, setRejectForm] = useState({ matchId: '', reason: '' });
  const [oddsForm, setOddsForm] = useState({ matchId: '', home: '', draw: '', away: '' });
  const [oddsCalcId, setOddsCalcId] = useState('');

  const load = () => {
    const query = statusFilter ? `?status=${statusFilter}` : '';
    api(`/api/admin/matches${query}`)
      .then((data) => setMatches(data.matches || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const approve = async (id) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/results/${id}/approve`, { method: 'POST', body: { approve: true } });
      setStatus({ state: 'success', message: 'Result approved.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const reject = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/results/${rejectForm.matchId}/reject`, {
        method: 'POST',
        body: { reason: rejectForm.reason || undefined }
      });
      setStatus({ state: 'success', message: 'Result rejected.' });
      setRejectForm({ matchId: '', reason: '' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updateOdds = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/matches/${oddsForm.matchId}/odds`, {
        method: 'PUT',
        body: {
          odds_home: Number(oddsForm.home),
          odds_draw: Number(oddsForm.draw),
          odds_away: Number(oddsForm.away)
        }
      });
      setStatus({ state: 'success', message: 'Odds updated.' });
      setOddsForm({ matchId: '', home: '', draw: '', away: '' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const calcOdds = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      const data = await api(`/api/admin/matches/${oddsCalcId}/calc-odds`, { method: 'POST' });
      setStatus({ state: 'success', message: `Odds calculated. H ${data.odds_home} · D ${data.odds_draw} · A ${data.odds_away}` });
      setOddsCalcId('');
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="section-title">Match Verification</h3>
            <p className="section-subtitle">Approve or reject submitted results.</p>
          </div>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="confirmed">Confirmed</option>
            <option value="disputed">Disputed</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
        <div className="mt-4 grid gap-3">
          {matches.map((match) => (
            <div key={match.id} className="scoreboard">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink-900">
                    {match.player1_tag || match.player1_id} vs {match.player2_tag || match.player2_id}
                  </p>
                  <p className="text-xs text-ink-500">Status: {match.status}</p>
                  <p className="text-xs text-ink-500">Result: {match.result_status || 'none'}</p>
                  <p className="text-xs text-ink-500">
                    Odds H {match.odds_home} · D {match.odds_draw} · A {match.odds_away}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary" type="button" onClick={() => approve(match.id)}>Approve</button>
                </div>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {match.screenshot_url && (
                  <a className="text-xs text-mint-700" href={match.screenshot_url} target="_blank" rel="noreferrer">Screenshot</a>
                )}
                {match.video_url && (
                  <a className="text-xs text-mint-700" href={match.video_url} target="_blank" rel="noreferrer">Video</a>
                )}
                {match.stream_url && (
                  <a className="text-xs text-mint-700" href={match.stream_url} target="_blank" rel="noreferrer">Stream</a>
                )}
              </div>
            </div>
          ))}
          {!matches.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No matches found.
            </div>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Update Odds</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-4" onSubmit={updateOdds}>
          <div>
            <label className="label">Match ID</label>
            <input className="input" value={oddsForm.matchId} onChange={(e) => setOddsForm((prev) => ({ ...prev, matchId: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Home Odds</label>
            <input className="input" type="number" step="0.01" value={oddsForm.home} onChange={(e) => setOddsForm((prev) => ({ ...prev, home: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Draw Odds</label>
            <input className="input" type="number" step="0.01" value={oddsForm.draw} onChange={(e) => setOddsForm((prev) => ({ ...prev, draw: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Away Odds</label>
            <input className="input" type="number" step="0.01" value={oddsForm.away} onChange={(e) => setOddsForm((prev) => ({ ...prev, away: e.target.value }))} required />
          </div>
          <div className="md:col-span-4">
            <button className="btn-secondary" type="submit">Save Odds</button>
          </div>
        </form>
        <form className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={calcOdds}>
          <input className="input" value={oddsCalcId} onChange={(e) => setOddsCalcId(e.target.value)} placeholder="Match ID for auto-odds" required />
          <button className="btn-secondary" type="submit">Auto-Calculate Odds</button>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Reject Result</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={reject}>
          <div>
            <label className="label">Match ID</label>
            <input className="input" value={rejectForm.matchId} onChange={(e) => setRejectForm((prev) => ({ ...prev, matchId: e.target.value }))} required />
          </div>
          <div className="md:col-span-2">
            <label className="label">Reason</label>
            <textarea className="input min-h-[100px]" value={rejectForm.reason} onChange={(e) => setRejectForm((prev) => ({ ...prev, reason: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Reject Result</button>
          </div>
        </form>
      </section>

      {status.message && (
        <p className={`text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
