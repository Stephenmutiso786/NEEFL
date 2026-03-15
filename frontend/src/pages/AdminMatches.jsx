import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Link } from 'react-router-dom';

export default function AdminMatches() {
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [createdMatchId, setCreatedMatchId] = useState('');
  const [createForm, setCreateForm] = useState({
    tournament_id: '',
    round: '',
    scheduled_at: '',
    player1_id: '',
    player2_id: '',
    referee_id: '',
    odds_home: '',
    odds_draw: '',
    odds_away: ''
  });
  const [p1Query, setP1Query] = useState('');
  const [p2Query, setP2Query] = useState('');
  const [p1Results, setP1Results] = useState([]);
  const [p2Results, setP2Results] = useState([]);
  const [rejectForm, setRejectForm] = useState({ matchId: '', reason: '' });
  const [oddsForm, setOddsForm] = useState({ matchId: '', home: '', draw: '', away: '' });
  const [oddsCalcId, setOddsCalcId] = useState('');

  const load = () => {
    const query = statusFilter ? `?status=${statusFilter}` : '';
    api(`/api/admin/matches${query}`)
      .then((data) => setMatches(data.matches || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
  };

  const loadTournaments = () => {
    api('/api/admin/tournaments')
      .then((data) => setTournaments(data.tournaments || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    loadTournaments();
  }, [statusFilter]);

  useEffect(() => {
    const q = p1Query.trim();
    if (q.length < 2) {
      setP1Results([]);
      return;
    }
    const handle = setTimeout(() => {
      api(`/api/public/players/search?q=${encodeURIComponent(q)}`, { auth: false })
        .then((data) => setP1Results(data.players || []))
        .catch(() => setP1Results([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [p1Query]);

  useEffect(() => {
    const q = p2Query.trim();
    if (q.length < 2) {
      setP2Results([]);
      return;
    }
    const handle = setTimeout(() => {
      api(`/api/public/players/search?q=${encodeURIComponent(q)}`, { auth: false })
        .then((data) => setP2Results(data.players || []))
        .catch(() => setP2Results([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [p2Query]);

  const selectPlayer = (side, player) => {
    if (!player) return;
    if (side === 'home') {
      setCreateForm((prev) => ({ ...prev, player1_id: String(player.user_id) }));
      setP1Query(player.gamer_tag);
      setP1Results([]);
      return;
    }
    setCreateForm((prev) => ({ ...prev, player2_id: String(player.user_id) }));
    setP2Query(player.gamer_tag);
    setP2Results([]);
  };

  const createMatch = async (event) => {
    event.preventDefault();
    if (!createForm.player1_id || !createForm.player2_id) {
      setStatus({ state: 'error', message: 'Select both players before creating the match.' });
      return;
    }
    if (String(createForm.player1_id) === String(createForm.player2_id)) {
      setStatus({ state: 'error', message: 'Player 1 and Player 2 cannot be the same user.' });
      return;
    }
    setStatus({ state: 'loading', message: '' });
    setCreatedMatchId('');
    try {
      const payload = {
        tournament_id: Number(createForm.tournament_id),
        player1_id: Number(createForm.player1_id),
        player2_id: Number(createForm.player2_id),
        scheduled_at: createForm.scheduled_at,
        round: createForm.round || undefined,
        referee_id: createForm.referee_id ? Number(createForm.referee_id) : undefined,
        odds_home: createForm.odds_home ? Number(createForm.odds_home) : undefined,
        odds_draw: createForm.odds_draw ? Number(createForm.odds_draw) : undefined,
        odds_away: createForm.odds_away ? Number(createForm.odds_away) : undefined
      };
      const data = await api('/api/admin/matches', { method: 'POST', body: payload });
      setCreatedMatchId(String(data.id));
      setStatus({ state: 'success', message: `Match created (#${data.id}).` });
      setCreateForm({
        tournament_id: '',
        round: '',
        scheduled_at: '',
        player1_id: '',
        player2_id: '',
        referee_id: '',
        odds_home: '',
        odds_draw: '',
        odds_away: ''
      });
      setP1Query('');
      setP2Query('');
      setP1Results([]);
      setP2Results([]);
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="section-title">Create Match</h3>
            <p className="section-subtitle">Manual match creation for special fixtures and broadcast matches.</p>
          </div>
          {createdMatchId && (
            <div className="flex flex-wrap gap-2">
              <Link className="btn-secondary" to={`/streams?match=${createdMatchId}`}>Open Stream</Link>
              <span className="chip">Match #{createdMatchId}</span>
            </div>
          )}
        </div>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={createMatch}>
          <div>
            <label className="label">Tournament</label>
            <select
              className="input"
              value={createForm.tournament_id}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, tournament_id: e.target.value }))}
              required
            >
              <option value="">Select tournament</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} (ID {tournament.id})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-500">Players must be approved/paid entrants in this tournament.</p>
          </div>
          <div>
            <label className="label">Scheduled At</label>
            <input
              className="input"
              type="datetime-local"
              value={createForm.scheduled_at}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Round (optional)</label>
            <input
              className="input"
              value={createForm.round}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, round: e.target.value }))}
              placeholder="Final, Semi, Round 1..."
            />
          </div>
          <div>
            <label className="label">Referee ID (optional)</label>
            <input
              className="input"
              value={createForm.referee_id}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, referee_id: e.target.value }))}
              placeholder="User ID"
            />
          </div>
          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Player 1 (search gamer tag)</label>
              <input
                className="input"
                value={p1Query}
                onChange={(e) => setP1Query(e.target.value)}
                placeholder="Type gamer tag..."
              />
              {p1Results.length > 0 && (
                <div className="mt-2 max-h-44 overflow-auto rounded-2xl border border-sand-200 bg-sand-50">
                  {p1Results.map((player) => (
                    <button
                      key={player.user_id}
                      className="w-full border-b border-sand-200 px-3 py-2 text-left text-sm hover:bg-sand-100/70"
                      type="button"
                      onClick={() => selectPlayer('home', player)}
                    >
                      <span className="font-semibold text-ink-900">{player.gamer_tag}</span>
                      <span className="ml-2 text-xs text-ink-500">ID {player.user_id}</span>
                    </button>
                  ))}
                </div>
              )}
              {createForm.player1_id && (
                <p className="mt-1 text-xs text-ink-500">Selected ID: {createForm.player1_id}</p>
              )}
            </div>
            <div>
              <label className="label">Player 2 (search gamer tag)</label>
              <input
                className="input"
                value={p2Query}
                onChange={(e) => setP2Query(e.target.value)}
                placeholder="Type gamer tag..."
              />
              {p2Results.length > 0 && (
                <div className="mt-2 max-h-44 overflow-auto rounded-2xl border border-sand-200 bg-sand-50">
                  {p2Results.map((player) => (
                    <button
                      key={player.user_id}
                      className="w-full border-b border-sand-200 px-3 py-2 text-left text-sm hover:bg-sand-100/70"
                      type="button"
                      onClick={() => selectPlayer('away', player)}
                    >
                      <span className="font-semibold text-ink-900">{player.gamer_tag}</span>
                      <span className="ml-2 text-xs text-ink-500">ID {player.user_id}</span>
                    </button>
                  ))}
                </div>
              )}
              {createForm.player2_id && (
                <p className="mt-1 text-xs text-ink-500">Selected ID: {createForm.player2_id}</p>
              )}
            </div>
          </div>
          <div>
            <label className="label">Odds Home (optional)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={createForm.odds_home}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, odds_home: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Odds Draw (optional)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={createForm.odds_draw}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, odds_draw: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Odds Away (optional)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={createForm.odds_away}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, odds_away: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <button className="btn-primary" type="submit" disabled={status.state === 'loading'}>Create Match</button>
          </div>
        </form>
      </section>

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
