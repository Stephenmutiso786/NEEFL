import { useEffect, useMemo, useState } from 'react';
import { api, getUserId } from '../lib/api.js';
import { Link } from 'react-router-dom';
import CompetitionTimeline from '../components/CompetitionTimeline.jsx';

const platformLabel = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  facebook: 'Facebook'
};

export default function BroadcasterDashboard() {
  const [matches, setMatches] = useState([]);
  const [streams, setStreams] = useState([]);
  const [form, setForm] = useState({ match_id: '', platform: 'youtube', url: '' });
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    api('/api/public/upcoming-matches', { auth: false })
      .then((data) => setMatches(data.matches || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
    api('/api/streams')
      .then((data) => setStreams(data.streams || []))
      .catch(() => {});
  }, []);

  const myStreams = useMemo(() => {
    const userId = getUserId();
    if (!userId) return [];
    return streams.filter((stream) => Number(stream.user_id) === Number(userId));
  }, [streams]);

  const submitStream = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/streams', {
        method: 'POST',
        body: {
          match_id: Number(form.match_id),
          platform: form.platform,
          url: form.url
        }
      });
      setStatus({ state: 'success', message: 'Stream submitted for review.' });
      setForm({ match_id: '', platform: 'youtube', url: '' });
      const data = await api('/api/streams');
      setStreams(data.streams || []);
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Broadcaster Console</h3>
        <p className="section-subtitle">Submit OBS streams for upcoming matches.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn-primary" to="/streams">View Live Page</Link>
          <Link className="btn-secondary" to="/matches">Upcoming Matches</Link>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Submit Stream</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submitStream}>
          <div>
            <label className="label">Match</label>
            <select
              className="input"
              value={form.match_id}
              onChange={(e) => setForm((prev) => ({ ...prev, match_id: e.target.value }))}
              required
            >
              <option value="">Select match</option>
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  #{match.id} {match.player1_tag || 'TBD'} vs {match.player2_tag || 'TBD'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Platform</label>
            <select
              className="input"
              value={form.platform}
              onChange={(e) => setForm((prev) => ({ ...prev, platform: e.target.value }))}
            >
              <option value="youtube">YouTube</option>
              <option value="twitch">Twitch</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Stream URL</label>
            <input
              className="input"
              value={form.url}
              onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://..."
              required
            />
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit" disabled={status.state === 'loading'}>
              {status.state === 'loading' ? 'Submitting...' : 'Submit Stream'}
            </button>
          </div>
          {status.message && (
            <p className={`text-sm ${status.state === 'error' ? 'text-red-400' : 'text-ink-500'} md:col-span-2`}>
              {status.message}
            </p>
          )}
        </form>
      </section>

      <CompetitionTimeline />

      <section className="card p-6">
        <h3 className="section-title">My Recent Streams</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {myStreams.slice(0, 6).map((stream) => (
            <div key={stream.id} className="scoreboard">
              <p className="text-xs text-ink-500">Match #{stream.match_id}</p>
              <p className="text-sm font-semibold text-ink-900">{platformLabel[stream.platform] || stream.platform}</p>
              <p className="text-xs text-ink-500">Submitted: {new Date(stream.created_at).toLocaleString()}</p>
            </div>
          ))}
          {!myStreams.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No streams submitted yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

