import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Link } from 'react-router-dom';
import CompetitionTimeline from '../components/CompetitionTimeline.jsx';
import { usePermissions } from '../context/PermissionsContext.jsx';

export default function PlayerDashboard() {
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const { permissions } = usePermissions();
  const canAccess = (module) => !module || permissions?.[module] !== false;

  useEffect(() => {
    api('/api/players/me')
      .then((data) => setProfile(data.player))
      .catch((err) => setStatus({ state: 'error', message: err.message }));

    api('/api/players/me/matches')
      .then((data) => setMatches(data.matches || []))
      .catch(() => {});

    api('/api/tournaments', { auth: false })
      .then((data) => setTournaments(data.tournaments || []))
      .catch(() => {});
  }, []);

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Player Dashboard</h3>
        <p className="section-subtitle">Your live stats, matches, and tournament access.</p>
        {profile && (
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Gamer Tag</p>
              <p className="mt-2 text-lg font-semibold">{profile.gamer_tag}</p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Rank Points</p>
              <p className="mt-2 text-lg font-semibold">{profile.rank_points}</p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Record</p>
              <p className="mt-2 text-sm text-ink-700">{profile.wins}W / {profile.losses}L</p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Goals</p>
              <p className="mt-2 text-lg font-semibold">{profile.goals_scored}</p>
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {canAccess('tournaments') && <Link className="btn-primary" to="/player/tournaments">Join Tournament</Link>}
          {canAccess('matches') && <Link className="btn-secondary" to="/player/matches">Submit Result</Link>}
          {canAccess('betting') && <Link className="btn-secondary" to="/betting">Betting</Link>}
          {canAccess('community') && <Link className="btn-secondary" to="/community">Community</Link>}
          {canAccess('clubs') && <Link className="btn-secondary" to="/clubs">Clubs</Link>}
          {canAccess('wallet') && <Link className="btn-secondary" to="/payments">Wallet</Link>}
          <Link className="btn-secondary" to="/leaderboard">Leaderboard</Link>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Quick Access</h3>
        <p className="section-subtitle">Jump straight into your next action.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {canAccess('matches') && (
            <Link className="tile tile-teal" to="/player/matches">
              <p className="text-sm font-semibold">My Matches</p>
              <p className="text-xs opacity-80">Submit results</p>
            </Link>
          )}
          {canAccess('tournaments') && (
            <Link className="tile tile-magenta" to="/player/tournaments">
              <p className="text-sm font-semibold">Tournaments</p>
              <p className="text-xs opacity-80">Join leagues</p>
            </Link>
          )}
          {canAccess('betting') && (
            <Link className="tile tile-gold" to="/betting">
              <p className="text-sm font-semibold">Betting</p>
              <p className="text-xs opacity-80">Place bets</p>
            </Link>
          )}
          {canAccess('wallet') && (
            <Link className="tile tile-lime" to="/payments">
              <p className="text-sm font-semibold">Wallet</p>
              <p className="text-xs opacity-80">Payments</p>
            </Link>
          )}
        </div>
      </section>

      <CompetitionTimeline />

      <section className="card p-6">
        <h3 className="card-title">Upcoming & Recent Matches</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {matches.slice(0, 6).map((match) => (
            <div key={match.id} className="scoreboard">
              <p className="text-xs text-ink-500">{match.tournament_name}</p>
              <p className="text-sm font-semibold text-ink-900">
                {match.player1_tag || match.player1_id} vs {match.player2_tag || match.player2_id}
              </p>
              <p className="text-xs text-ink-500">{match.round || 'League match'} · {match.status}</p>
              <p className="text-xs text-ink-500">Scheduled: {match.scheduled_at}</p>
            </div>
          ))}
          {!matches.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No matches assigned yet.
            </div>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="card-title">Active Tournaments</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm">
              <p className="font-semibold text-ink-900">{tournament.name}</p>
              <p className="text-xs text-ink-500">{tournament.format} | {tournament.status}</p>
              <p className="text-xs text-ink-500">Entry: KES {tournament.entry_fee}</p>
            </div>
          ))}
          {!tournaments.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No tournaments open yet.
            </div>
          )}
        </div>
      </section>

      {status.message && (
        <p className={`text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
