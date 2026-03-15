import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Link } from 'react-router-dom';
import Countdown from '../components/Countdown.jsx';

const formatDateTime = (value) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function PublicMatches() {
  const [upcoming, setUpcoming] = useState([]);
  const [live, setLive] = useState([]);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    api('/api/public/upcoming-matches', { auth: false })
      .then((data) => setUpcoming(data.matches || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));

    api('/api/public/live-matches', { auth: false })
      .then((data) => setLive(data.matches || []))
      .catch(() => {});

    api('/api/public/results', { auth: false })
      .then((data) => setResults(data.results || []))
      .catch(() => {});
  }, []);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-3">
        <a className="btn-secondary" href="#live">Live Matches</a>
        <a className="btn-secondary" href="#results">View Results</a>
        <a className="btn-secondary" href="#upcoming">View Match Details</a>
        <Link className="btn-primary" to="/betting">View Betting Odds</Link>
      </div>
      <section className="card p-6">
        <h3 id="live" className="section-title">Live Matches</h3>
        <p className="section-subtitle">Matches currently in progress.</p>
        <div className="mt-4 grid gap-3">
          {live.map((match) => (
            <div key={match.id} className="scoreboard">
              <p className="text-xs text-ink-500">{match.tournament_name}</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink-900">{match.player1_tag || 'TBD'}</span>
                <span className="score-pill glow-ring">{match.score1 ?? '-'}</span>
                <span className="score-pill glow-ring">{match.score2 ?? '-'}</span>
                <span className="text-sm font-semibold text-ink-900">{match.player2_tag || 'TBD'}</span>
              </div>
            </div>
          ))}
          {!live.length && (
            <p className="text-sm text-ink-500">No live matches right now.</p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 id="upcoming" className="section-title">Upcoming Matches</h3>
        <p className="section-subtitle">Public schedule for the next fixtures.</p>
        <div className="mt-4 grid gap-3">
          {upcoming.map((match) => (
            <div key={match.id} className="scoreboard">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {match.player1_tag || 'TBD'} vs {match.player2_tag || 'TBD'}
                  </p>
                  <p className="text-xs text-ink-500">{match.tournament_name} · {match.round || 'Match'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-ink-500">
                  <span>{formatDateTime(match.scheduled_at)}</span>
                  <Countdown target={match.scheduled_at} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-500">
                <span>Home {match.odds_home}</span>
                <span>Draw {match.odds_draw}</span>
                <span>Away {match.odds_away}</span>
              </div>
            </div>
          ))}
          {!upcoming.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No upcoming matches scheduled yet.
            </div>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 id="results" className="section-title">Verified Results</h3>
        <p className="section-subtitle">Confirmed results visible to everyone.</p>
        <div className="mt-4 grid gap-3">
          {results.map((match) => (
            <div key={match.id} className="scoreboard">
              <p className="text-xs text-ink-500">{match.tournament_name}</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink-900">{match.player1_tag || 'TBD'}</span>
                <span className="score-pill">{match.score1 ?? '-'}</span>
                <span className="score-pill">{match.score2 ?? '-'}</span>
                <span className="text-sm font-semibold text-ink-900">{match.player2_tag || 'TBD'}</span>
              </div>
            </div>
          ))}
          {!results.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No results published yet.
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
