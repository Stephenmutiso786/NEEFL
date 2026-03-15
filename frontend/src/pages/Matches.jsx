import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUserId } from '../lib/api.js';
import Countdown from '../components/Countdown.jsx';

export default function Matches() {
  const userId = Number(getUserId());
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
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

  const formatDateTime = (value) => {
    if (!value) return 'TBD';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const loadMatches = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      const data = await api('/api/players/me/matches');
      const list = data.matches || [];
      setMatches(list);
      if (!selectedMatchId && list.length) {
        setSelectedMatchId(String(list[0].id));
      }
      setStatus({ state: 'success', message: '' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    if (!selectedMatchId) {
      setMatch(null);
      return;
    }
    api(`/api/matches/${selectedMatchId}`, { auth: false })
      .then((data) => setMatch(data.match))
      .catch(() => setMatch(null));
  }, [selectedMatchId]);

  const selectedFromList = useMemo(() => {
    if (!selectedMatchId) return null;
    return matches.find((m) => String(m.id) === String(selectedMatchId)) || null;
  }, [matches, selectedMatchId]);

  const selected = match || selectedFromList;

  const submitResult = async (event) => {
    event.preventDefault();
    if (!selectedMatchId) return;
    setStatus({ state: 'loading', message: '' });
    try {
      const formData = new FormData();
      formData.append('score1', resultForm.score1);
      formData.append('score2', resultForm.score2);
      if (resultForm.video_url) formData.append('video_url', resultForm.video_url);
      if (resultForm.stream_url) formData.append('stream_url', resultForm.stream_url);
      if (resultForm.screenshot) formData.append('screenshot', resultForm.screenshot);

      await api(`/api/matches/${selectedMatchId}/submit-result`, {
        method: 'POST',
        body: formData
      });
      setStatus({ state: 'success', message: 'Result submitted.' });
      setResultForm({ score1: '', score2: '', video_url: '', stream_url: '', screenshot: null });
      await loadMatches();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const confirmResult = async () => {
    if (!selectedMatchId) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/matches/${selectedMatchId}/confirm-result`, {
        method: 'POST',
        body: { confirm: true }
      });
      setStatus({ state: 'success', message: 'Result confirmed.' });
      await loadMatches();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const submitDispute = async (event) => {
    event.preventDefault();
    if (!selectedMatchId) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/matches/${selectedMatchId}/dispute`, {
        method: 'POST',
        body: { reason: disputeReason }
      });
      setStatus({ state: 'success', message: 'Dispute submitted.' });
      setDisputeReason('');
      await loadMatches();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="section-title">My Matches</h3>
            <p className="section-subtitle">Upcoming fixtures, submissions, and results.</p>
          </div>
          <button className="btn-secondary" type="button" onClick={loadMatches} disabled={status.state === 'loading'}>
            Refresh
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {matches.map((item) => {
            const isSelected = String(item.id) === String(selectedMatchId);
            const isHome = Number(item.player1_id) === userId;
            const opponent = isHome ? (item.player2_tag || item.player2_id) : (item.player1_tag || item.player1_id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedMatchId(String(item.id))}
                className={`scoreboard text-left transition ${isSelected ? 'ring-2 ring-mint-500/50' : 'hover:bg-sand-100/60'}`}
              >
                <p className="text-xs text-ink-500">{item.tournament_name}</p>
                <p className="text-sm font-semibold text-ink-900">
                  {isHome ? 'You' : opponent} vs {isHome ? opponent : 'You'}
                </p>
                <p className="text-xs text-ink-500">{item.round || 'Match'} · {item.status}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500">
                  <span>{formatDateTime(item.scheduled_at)}</span>
                  <Countdown target={item.scheduled_at} />
                </div>
              </button>
            );
          })}
          {!matches.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No matches assigned yet. Join a tournament, get approved/paid, then an admin schedules fixtures.
            </div>
          )}
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="section-title">Match Center</h3>
            <p className="section-subtitle">Submit results, confirm opponent scores, or dispute.</p>
          </div>
          {selectedMatchId && (
            <Link className="btn-secondary" to={`/streams?match=${selectedMatchId}`}>
              Watch / Stream
            </Link>
          )}
        </div>

        {!selected && (
          <div className="mt-6 rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
            Select a match to view details and actions.
          </div>
        )}

        {selected && (
          <>
            <div className="mt-6 scoreboard">
              <p className="text-xs text-ink-500">{selected.tournament_name}</p>
              <p className="text-sm font-semibold text-ink-900">
                {selected.player1_tag || selected.player1_id} vs {selected.player2_tag || selected.player2_id}
              </p>
              <p className="text-xs text-ink-500">Round: {selected.round || 'Match'} · Status: {selected.status}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                <span>Scheduled: {formatDateTime(selected.scheduled_at)}</span>
                <span>Score {selected.score1 ?? '-'} : {selected.score2 ?? '-'}</span>
                <span>Odds H {selected.odds_home} · D {selected.odds_draw} · A {selected.odds_away}</span>
              </div>
            </div>

            <div className="mt-6 grid gap-6">
              <div>
                <h4 className="card-title">Submit Result</h4>
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
              </div>

              <div>
                <h4 className="card-title">Confirm Result</h4>
                <p className="section-subtitle">Opponent confirms the latest submission.</p>
                <button className="btn-secondary mt-4" type="button" onClick={confirmResult}>
                  Confirm Opponent Score
                </button>
              </div>

              <div>
                <h4 className="card-title">Dispute Match</h4>
                <form className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={submitDispute}>
                  <input className="input" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Reason for dispute" />
                  <button className="btn-secondary" type="submit">Submit Dispute</button>
                </form>
              </div>
            </div>
          </>
        )}

        {status.message && (
          <p className={`mt-4 text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
            {status.message}
          </p>
        )}
      </section>
    </div>
  );
}
