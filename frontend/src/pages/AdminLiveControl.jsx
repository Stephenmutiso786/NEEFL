import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

export default function AdminLiveControl() {
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [match, setMatch] = useState(null);
  const [viewerStats, setViewerStats] = useState(null);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [broadcastForm, setBroadcastForm] = useState({ timer_mode: 'manual', phase: 'first_half', clock: '' });
  const [bettingStatus, setBettingStatus] = useState('open');
  const [eventForm, setEventForm] = useState({ event_type: 'goal', side: 'home', minute: '', description: '' });
  const [statsForm, setStatsForm] = useState({
    possession_home: '',
    possession_away: '',
    shots_home: '',
    shots_away: '',
    passes_home: '',
    passes_away: '',
    fouls_home: '',
    fouls_away: '',
    yellow_home: '',
    yellow_away: '',
    red_home: '',
    red_away: ''
  });
  const [replayForm, setReplayForm] = useState({ replay_url: '', highlights_url: '' });
  const [streamForm, setStreamForm] = useState({
    stream_platform: 'youtube',
    stream_link: '',
    stream_link_hd: '',
    stream_link_sd: '',
    stream_link_audio: '',
    access_level: 'public'
  });
  const [activeStream, setActiveStream] = useState(null);
  const [chatSettings, setChatSettings] = useState({ enabled: true, slow_mode_seconds: 0 });
  const [chatMute, setChatMute] = useState({ user_id: '', ip: '', minutes: '10', reason: '' });
  const [featured, setFeatured] = useState('');

  const loadMatches = () => {
    api('/api/admin/matches')
      .then((data) => setMatches(data.matches || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
  };

  const loadFeatured = () => {
    api('/api/admin/featured-match')
      .then((data) => setFeatured(data.match_id ? String(data.match_id) : ''))
      .catch(() => {});
  };

  const loadViewerStats = (matchId) => {
    if (!matchId) return;
    api(`/api/admin/matches/${matchId}/viewers`)
      .then((data) => setViewerStats(data))
      .catch(() => setViewerStats(null));
  };

  const loadStream = (matchId) => {
    if (!matchId) return;
    api(`/api/matches/${matchId}/stream`)
      .then((data) => setActiveStream(data.stream || null))
      .catch(() => setActiveStream(null));
  };

  useEffect(() => {
    loadMatches();
    loadFeatured();
  }, []);

  useEffect(() => {
    if (!selectedMatchId) return;
    api(`/api/matches/${selectedMatchId}`, { auth: false })
      .then((data) => {
        setMatch(data.match);
        setBettingStatus(data.match?.betting_status || 'open');
        setBroadcastForm((prev) => ({
          ...prev,
          timer_mode: data.match?.live_timer_mode || prev.timer_mode,
          phase: data.match?.live_phase || prev.phase
        }));
      })
      .catch(() => setMatch(null));
    loadViewerStats(selectedMatchId);
    loadStream(selectedMatchId);
  }, [selectedMatchId]);

  const submitStream = async (event) => {
    event.preventDefault();
    if (!selectedMatchId) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/matches/${selectedMatchId}/stream`, {
        method: 'POST',
        body: {
          stream_platform: streamForm.stream_platform,
          stream_link: streamForm.stream_link,
          stream_link_hd: streamForm.stream_link_hd || undefined,
          stream_link_sd: streamForm.stream_link_sd || undefined,
          stream_link_audio: streamForm.stream_link_audio || undefined,
          access_level: streamForm.access_level || undefined
        }
      });
      setStatus({ state: 'success', message: 'Live stream attached.' });
      setStreamForm({
        stream_platform: 'youtube',
        stream_link: '',
        stream_link_hd: '',
        stream_link_sd: '',
        stream_link_audio: '',
        access_level: 'public'
      });
      loadStream(selectedMatchId);
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const runAction = async (action, payload) => {
    if (!selectedMatchId) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/matches/${selectedMatchId}/broadcast/${action}`, { method: 'POST', body: payload });
      setStatus({ state: 'success', message: `Broadcast ${action} executed.` });
      loadMatches();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updateBroadcastConfig = async (event) => {
    event.preventDefault();
    if (!selectedMatchId) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/matches/${selectedMatchId}/broadcast`, {
        method: 'PUT',
        body: {
          timer_mode: broadcastForm.timer_mode,
          phase: broadcastForm.phase,
          clock: broadcastForm.clock || undefined
        }
      });
      setStatus({ state: 'success', message: 'Broadcast settings updated.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updateBettingStatus = async () => {
    if (!selectedMatchId) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/matches/${selectedMatchId}/betting-status`, {
        method: 'PUT',
        body: { status: bettingStatus }
      });
      setStatus({ state: 'success', message: 'Betting status updated.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const addEvent = async (event) => {
    event.preventDefault();
    if (!selectedMatchId) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/matches/${selectedMatchId}/events`, {
        method: 'POST',
        body: {
          event_type: eventForm.event_type,
          side: eventForm.side,
          minute: eventForm.minute ? Number(eventForm.minute) : undefined,
          description: eventForm.description || undefined
        }
      });
      setStatus({ state: 'success', message: 'Event added.' });
      setEventForm({ event_type: 'goal', side: 'home', minute: '', description: '' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updateStats = async (event) => {
    event.preventDefault();
    if (!selectedMatchId) return;
    const payload = Object.fromEntries(
      Object.entries(statsForm).map(([key, value]) => [key, value === '' ? undefined : Number(value)])
    );
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/matches/${selectedMatchId}/stats`, { method: 'PUT', body: payload });
      setStatus({ state: 'success', message: 'Live stats updated.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updateReplay = async (event) => {
    event.preventDefault();
    if (!selectedMatchId) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/matches/${selectedMatchId}/replay`, {
        method: 'PUT',
        body: {
          replay_url: replayForm.replay_url || undefined,
          highlights_url: replayForm.highlights_url || undefined
        }
      });
      setStatus({ state: 'success', message: 'Replay links updated.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updateChatSettings = async (event) => {
    event.preventDefault();
    if (!selectedMatchId) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/matches/${selectedMatchId}/chat-settings`, {
        method: 'PUT',
        body: {
          enabled: Boolean(chatSettings.enabled),
          slow_mode_seconds: Number(chatSettings.slow_mode_seconds || 0)
        }
      });
      setStatus({ state: 'success', message: 'Chat settings updated.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const muteChat = async (event) => {
    event.preventDefault();
    if (!selectedMatchId) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/matches/${selectedMatchId}/chat-mute`, {
        method: 'POST',
        body: {
          user_id: chatMute.user_id ? Number(chatMute.user_id) : undefined,
          ip: chatMute.ip || undefined,
          minutes: chatMute.minutes ? Number(chatMute.minutes) : undefined,
          reason: chatMute.reason || undefined
        }
      });
      setStatus({ state: 'success', message: 'Chat mute applied.' });
      setChatMute({ user_id: '', ip: '', minutes: '10', reason: '' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updateFeatured = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/admin/featured-match', {
        method: 'PUT',
        body: { match_id: Number(featured) }
      });
      setStatus({ state: 'success', message: 'Featured match updated.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const selectedMatch = useMemo(
    () => matches.find((item) => String(item.id) === String(selectedMatchId)),
    [matches, selectedMatchId]
  );

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Live Match Control Center</h3>
        <p className="section-subtitle">Start broadcasts, manage betting, and keep score aligned with the stream.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <select className="input" value={selectedMatchId} onChange={(e) => setSelectedMatchId(e.target.value)}>
            <option value="">Select match</option>
            {matches.map((item) => (
              <option key={item.id} value={item.id}>
                #{item.id} {item.player1_tag || 'TBD'} vs {item.player2_tag || 'TBD'}
              </option>
            ))}
          </select>
          <button className="btn-secondary" type="button" onClick={loadMatches}>Refresh Matches</button>
        </div>

        {selectedMatch && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="scoreboard">
              <p className="label">Match</p>
              <p className="text-sm font-semibold text-ink-900">{selectedMatch.player1_tag || 'TBD'} vs {selectedMatch.player2_tag || 'TBD'}</p>
              <p className="text-xs text-ink-500">{selectedMatch.tournament_name || 'Tournament'} · {selectedMatch.round || 'Match'}</p>
            </div>
            <div className="scoreboard">
              <p className="label">Status</p>
              <p className="text-sm text-ink-700">Live Status: {match?.live_status || 'ready'}</p>
              <p className="text-sm text-ink-700">Phase: {match?.live_phase || 'pre_match'}</p>
            </div>
            <div className="scoreboard">
              <p className="label">Viewers</p>
              <p className="text-sm text-ink-700">Current: {viewerStats?.current_viewers || 0}</p>
              <p className="text-sm text-ink-700">Peak: {viewerStats?.peak_viewers || 0}</p>
              <p className="text-sm text-ink-700">Watch Time: {Math.round((viewerStats?.total_watch_seconds || 0) / 60)} min</p>
            </div>
          </div>
        )}
      </section>

      <section className="card p-6">
        <h3 className="section-title">Broadcast Controls</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" type="button" onClick={() => runAction('start', broadcastForm)}>Start Match Broadcast</button>
          <button className="btn-secondary" type="button" onClick={() => runAction('pause')}>Pause Stream</button>
          <button className="btn-secondary" type="button" onClick={() => runAction('resume')}>Resume Stream</button>
          <button className="btn-secondary" type="button" onClick={() => runAction('end')}>End Match</button>
          <button className="btn-secondary" type="button" onClick={() => runAction('emergency')}>Emergency Stop</button>
        </div>
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={updateBroadcastConfig}>
          <div>
            <label className="label">Timer Mode</label>
            <select className="input" value={broadcastForm.timer_mode} onChange={(e) => setBroadcastForm((prev) => ({ ...prev, timer_mode: e.target.value }))}>
              <option value="manual">Manual</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div>
            <label className="label">Phase</label>
            <select className="input" value={broadcastForm.phase} onChange={(e) => setBroadcastForm((prev) => ({ ...prev, phase: e.target.value }))}>
              <option value="pre_match">Pre Match</option>
              <option value="first_half">First Half</option>
              <option value="half_time">Half Time</option>
              <option value="second_half">Second Half</option>
              <option value="extra_time">Extra Time</option>
              <option value="penalties">Penalties</option>
              <option value="full_time">Full Time</option>
            </select>
          </div>
          <div>
            <label className="label">Clock (MM:SS)</label>
            <input className="input" value={broadcastForm.clock} onChange={(e) => setBroadcastForm((prev) => ({ ...prev, clock: e.target.value }))} placeholder="45:00" />
          </div>
          <div className="md:col-span-3">
            <button className="btn-secondary" type="submit">Update Broadcast Settings</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Attach Live Stream Link</h3>
        <p className="section-subtitle">Paste the live URL so viewers can watch the match on the Live Match Center.</p>
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={submitStream}>
          <div>
            <label className="label">Platform</label>
            <select
              className="input"
              value={streamForm.stream_platform}
              onChange={(e) => setStreamForm((prev) => ({ ...prev, stream_platform: e.target.value }))}
            >
              <option value="youtube">YouTube</option>
              <option value="twitch">Twitch</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Stream Link</label>
            <input
              className="input"
              value={streamForm.stream_link}
              onChange={(e) => setStreamForm((prev) => ({ ...prev, stream_link: e.target.value }))}
              placeholder="https://youtube.com/watch?v=VIDEO_ID"
              required
            />
          </div>
          <div>
            <label className="label">HD Link (optional)</label>
            <input
              className="input"
              value={streamForm.stream_link_hd}
              onChange={(e) => setStreamForm((prev) => ({ ...prev, stream_link_hd: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">SD Link (optional)</label>
            <input
              className="input"
              value={streamForm.stream_link_sd}
              onChange={(e) => setStreamForm((prev) => ({ ...prev, stream_link_sd: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Audio Link (optional)</label>
            <input
              className="input"
              value={streamForm.stream_link_audio}
              onChange={(e) => setStreamForm((prev) => ({ ...prev, stream_link_audio: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Access Level</label>
            <select
              className="input"
              value={streamForm.access_level}
              onChange={(e) => setStreamForm((prev) => ({ ...prev, access_level: e.target.value }))}
            >
              <option value="public">Public</option>
              <option value="registered">Registered</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <button className="btn-secondary" type="submit">Save Live Link</button>
            {selectedMatchId && (
              <a className="btn-ghost ml-3" href={`/streams?match=${selectedMatchId}`}>
                Open Viewer Page
              </a>
            )}
          </div>
        </form>
        {activeStream && (
          <div className="mt-4 rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm">
            <p className="font-semibold text-ink-900">Current Stream</p>
            <p className="text-xs text-ink-500">Platform: {activeStream.stream_platform}</p>
            <p className="text-xs text-ink-500">Status: {activeStream.status}</p>
            <p className="text-xs text-ink-500">Access: {activeStream.access_level}</p>
          </div>
        )}
      </section>

      <section className="card p-6">
        <h3 className="section-title">Betting Safety Controls</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <select className="input" value={bettingStatus} onChange={(e) => setBettingStatus(e.target.value)}>
            <option value="open">Open Betting</option>
            <option value="closed">Close Betting</option>
            <option value="suspended">Suspend Betting</option>
            <option value="voided">Void Bets</option>
          </select>
          <button className="btn-secondary" type="button" onClick={updateBettingStatus}>Apply</button>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Add Match Events</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-4" onSubmit={addEvent}>
          <div>
            <label className="label">Event</label>
            <select className="input" value={eventForm.event_type} onChange={(e) => setEventForm((prev) => ({ ...prev, event_type: e.target.value }))}>
              <option value="goal">Goal</option>
              <option value="red_card">Red Card</option>
              <option value="yellow_card">Yellow Card</option>
              <option value="penalty">Penalty</option>
              <option value="kickoff">Kickoff</option>
              <option value="half_time">Half Time</option>
              <option value="full_time">Full Time</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Side</label>
            <select className="input" value={eventForm.side} onChange={(e) => setEventForm((prev) => ({ ...prev, side: e.target.value }))}>
              <option value="home">Home</option>
              <option value="away">Away</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <div>
            <label className="label">Minute</label>
            <input className="input" type="number" value={eventForm.minute} onChange={(e) => setEventForm((prev) => ({ ...prev, minute: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={eventForm.description} onChange={(e) => setEventForm((prev) => ({ ...prev, description: e.target.value }))} />
          </div>
          <div className="md:col-span-4">
            <button className="btn-secondary" type="submit">Add Event</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Live Stats Panel</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={updateStats}>
          {Object.keys(statsForm).map((key) => (
            <div key={key}>
              <label className="label">{key.replace('_', ' ')}</label>
              <input
                className="input"
                type="number"
                value={statsForm[key]}
                onChange={(e) => setStatsForm((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="md:col-span-3">
            <button className="btn-secondary" type="submit">Update Live Stats</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Replay & Highlights</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={updateReplay}>
          <div>
            <label className="label">Replay URL</label>
            <input className="input" value={replayForm.replay_url} onChange={(e) => setReplayForm((prev) => ({ ...prev, replay_url: e.target.value }))} />
          </div>
          <div>
            <label className="label">Highlights URL</label>
            <input className="input" value={replayForm.highlights_url} onChange={(e) => setReplayForm((prev) => ({ ...prev, highlights_url: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Save Links</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Chat Moderation</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={updateChatSettings}>
          <div>
            <label className="label">Chat Enabled</label>
            <select className="input" value={chatSettings.enabled ? 'yes' : 'no'} onChange={(e) => setChatSettings((prev) => ({ ...prev, enabled: e.target.value === 'yes' }))}>
              <option value="yes">Enabled</option>
              <option value="no">Disabled</option>
            </select>
          </div>
          <div>
            <label className="label">Slow Mode (sec)</label>
            <input className="input" type="number" value={chatSettings.slow_mode_seconds} onChange={(e) => setChatSettings((prev) => ({ ...prev, slow_mode_seconds: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <button className="btn-secondary" type="submit">Update Chat Settings</button>
          </div>
        </form>

        <form className="mt-6 grid gap-4 md:grid-cols-4" onSubmit={muteChat}>
          <div>
            <label className="label">User ID</label>
            <input className="input" value={chatMute.user_id} onChange={(e) => setChatMute((prev) => ({ ...prev, user_id: e.target.value }))} />
          </div>
          <div>
            <label className="label">IP Address</label>
            <input className="input" value={chatMute.ip} onChange={(e) => setChatMute((prev) => ({ ...prev, ip: e.target.value }))} />
          </div>
          <div>
            <label className="label">Minutes</label>
            <input className="input" type="number" value={chatMute.minutes} onChange={(e) => setChatMute((prev) => ({ ...prev, minutes: e.target.value }))} />
          </div>
          <div>
            <label className="label">Reason</label>
            <input className="input" value={chatMute.reason} onChange={(e) => setChatMute((prev) => ({ ...prev, reason: e.target.value }))} />
          </div>
          <div className="md:col-span-4">
            <button className="btn-secondary" type="submit">Mute / Ban</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Featured Match</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input className="input" value={featured} onChange={(e) => setFeatured(e.target.value)} placeholder="Match ID" />
          <button className="btn-secondary" type="button" onClick={updateFeatured}>Set Featured</button>
        </div>
      </section>

      {status.message && (
        <p className={`text-sm ${status.state === 'error' ? 'text-red-400' : 'text-ink-500'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
