import { useState } from 'react';
import { api } from '../lib/api.js';

export default function Matches() {
  const [matchId, setMatchId] = useState('');
  const [match, setMatch] = useState(null);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [resultForm, setResultForm] = useState({
    score1: '',
    score2: '',
    video_url: '',
    stream_url: '',
    screenshot: null
  });
  const [disputeReason, setDisputeReason] = useState('');

  const loadMatch = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      const data = await api(`/api/matches/${matchId}`, { auth: false });
      setMatch(data.match);
      setStatus({ state: 'success', message: 'Match loaded.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const submitResult = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      const formData = new FormData();
      formData.append('score1', resultForm.score1);
      formData.append('score2', resultForm.score2);
      if (resultForm.video_url) formData.append('video_url', resultForm.video_url);
      if (resultForm.stream_url) formData.append('stream_url', resultForm.stream_url);
      if (resultForm.screenshot) formData.append('screenshot', resultForm.screenshot);

      await api(`/api/matches/${matchId}/submit-result`, {
        method: 'POST',
        body: formData
      });
      setStatus({ state: 'success', message: 'Result submitted.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const confirmResult = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/matches/${matchId}/confirm-result`, {
        method: 'POST',
        body: { confirm: true }
      });
      setStatus({ state: 'success', message: 'Result confirmed.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const submitDispute = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/matches/${matchId}/dispute`, {
        method: 'POST',
        body: { reason: disputeReason }
      });
      setStatus({ state: 'success', message: 'Dispute submitted.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Match Lookup</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <input className="input" value={matchId} onChange={(e) => setMatchId(e.target.value)} placeholder="Match ID" />
          <button className="btn-secondary" type="button" onClick={loadMatch}>Load Match</button>
        </div>
        {match && (
          <div className="mt-4 scoreboard">
            <p className="text-xs text-ink-500">{match.tournament_name}</p>
            <p className="text-sm font-semibold text-ink-900">
              {match.player1_tag || match.player1_id} vs {match.player2_tag || match.player2_id}
            </p>
            <p className="text-xs text-ink-500">Round: {match.round || 'Match'} · Status: {match.status}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
              <span>Score {match.score1 ?? '-'} : {match.score2 ?? '-'}</span>
              <span>Odds H {match.odds_home} · D {match.odds_draw} · A {match.odds_away}</span>
            </div>
          </div>
        )}
      </section>

      <section className="card p-6">
        <h3 className="section-title">Submit Result</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submitResult}>
          <div>
            <label className="label">Score Player 1</label>
            <input className="input" type="number" value={resultForm.score1} onChange={(e) => setResultForm((prev) => ({ ...prev, score1: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Score Player 2</label>
            <input className="input" type="number" value={resultForm.score2} onChange={(e) => setResultForm((prev) => ({ ...prev, score2: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Screenshot Proof</label>
            <input className="input" type="file" accept="image/*" onChange={(e) => setResultForm((prev) => ({ ...prev, screenshot: e.target.files[0] }))} />
          </div>
          <div>
            <label className="label">Video URL</label>
            <input className="input" value={resultForm.video_url} onChange={(e) => setResultForm((prev) => ({ ...prev, video_url: e.target.value }))} />
          </div>
          <div>
            <label className="label">Stream URL</label>
            <input className="input" value={resultForm.stream_url} onChange={(e) => setResultForm((prev) => ({ ...prev, stream_url: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <button className="btn-primary" type="submit">Submit Result</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Confirm Result</h3>
        <p className="section-subtitle">Opponent confirms the latest submission.</p>
        <button className="btn-secondary mt-4" type="button" onClick={confirmResult}>Confirm Opponent Score</button>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Dispute Match</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={submitDispute}>
          <input className="input" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Reason for dispute" />
          <button className="btn-secondary" type="submit">Submit Dispute</button>
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
