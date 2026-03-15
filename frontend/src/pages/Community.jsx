import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Community() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [online, setOnline] = useState([]);
  const [activity, setActivity] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const load = () => {
    api('/api/social/friends').then((data) => setFriends(data.friends || [])).catch(() => {});
    api('/api/social/friends/requests').then((data) => setRequests(data)).catch(() => {});
    api('/api/social/following').then((data) => setFollowing(data.following || [])).catch(() => {});
    api('/api/social/followers').then((data) => setFollowers(data.followers || [])).catch(() => {});
    api('/api/social/presence/online').then((data) => setOnline(data.users || [])).catch(() => {});
    api('/api/social/activity').then((data) => setActivity(data.activity || [])).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const runSearch = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      const data = await api(`/api/public/players/search?q=${encodeURIComponent(search)}`, { auth: false });
      setSearchResults(data.players || []);
      setStatus({ state: 'idle', message: '' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const sendFriendRequest = async (userId) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/social/friends/request', { method: 'POST', body: { user_id: userId } });
      setStatus({ state: 'success', message: 'Friend request sent.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const followUser = async (userId) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/social/follow', { method: 'POST', body: { user_id: userId } });
      setStatus({ state: 'success', message: 'Now following.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const acceptFriend = async (id) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/social/friends/${id}/accept`, { method: 'POST' });
      setStatus({ state: 'success', message: 'Friend request accepted.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const rejectFriend = async (id) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/social/friends/${id}/reject`, { method: 'POST' });
      setStatus({ state: 'success', message: 'Friend request rejected.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const openMessage = (userId) => {
    navigate(`/messages?user=${userId}`);
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Community Hub</h3>
        <p className="section-subtitle">Find players, connect, and follow the live activity feed.</p>
        <form className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={runSearch}>
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search gamer tag" />
          <button className="btn-primary" type="submit">Search</button>
        </form>
        <div className="mt-4 grid gap-3">
          {searchResults.map((player) => (
            <div key={player.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm">
              <div>
                <p className="font-semibold text-ink-900">{player.gamer_tag}</p>
                <p className="text-xs text-ink-500">Rank {player.rank_points} · {player.wins}W/{player.losses}L</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" type="button" onClick={() => sendFriendRequest(player.user_id)}>Add Friend</button>
                <button className="btn-secondary" type="button" onClick={() => followUser(player.user_id)}>Follow</button>
                <button className="btn-ghost" type="button" onClick={() => openMessage(player.user_id)}>Message</button>
              </div>
            </div>
          ))}
          {!searchResults.length && search && (
            <p className="text-sm text-ink-500">No players found.</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="card-title">Friend Requests</h3>
          <div className="mt-4 grid gap-3">
            {requests.incoming.map((req) => (
              <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm">
                <div>
                  <p className="font-semibold text-ink-900">{req.requester_tag || `User ${req.requester_id}`}</p>
                  <p className="text-xs text-ink-500">Incoming request</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary" type="button" onClick={() => acceptFriend(req.id)}>Accept</button>
                  <button className="btn-secondary" type="button" onClick={() => rejectFriend(req.id)}>Reject</button>
                </div>
              </div>
            ))}
            {!requests.incoming.length && (
              <p className="text-sm text-ink-500">No incoming requests.</p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="card-title">Friends Online</h3>
          <div className="mt-4 grid gap-3">
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm">
                <p className="font-semibold text-ink-900">{friend.gamer_tag}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-500">{friend.status}</span>
                  <button className="btn-ghost" type="button" onClick={() => openMessage(friend.user_id)}>Message</button>
                </div>
              </div>
            ))}
            {!friends.length && (
              <p className="text-sm text-ink-500">No friends yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="card-title">Following</h3>
          <div className="mt-4 grid gap-3">
            {following.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm">
                <p className="font-semibold text-ink-900">{item.gamer_tag}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-500">{item.status}</span>
                  <button className="btn-ghost" type="button" onClick={() => openMessage(item.user_id)}>Message</button>
                </div>
              </div>
            ))}
            {!following.length && (
              <p className="text-sm text-ink-500">Not following anyone yet.</p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="card-title">Followers</h3>
          <div className="mt-4 grid gap-3">
            {followers.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm">
                <p className="font-semibold text-ink-900">{item.gamer_tag}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-500">{item.status}</span>
                  <button className="btn-ghost" type="button" onClick={() => openMessage(item.user_id)}>Message</button>
                </div>
              </div>
            ))}
            {!followers.length && (
              <p className="text-sm text-ink-500">No followers yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="card-title">Online Now</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {online.map((player) => (
            <div key={player.id} className="flex items-center justify-between rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm">
              <p className="font-semibold text-ink-900">{player.gamer_tag}</p>
              <span className="text-xs text-ink-500">{player.status}</span>
            </div>
          ))}
          {!online.length && (
            <p className="text-sm text-ink-500">No active players right now.</p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="card-title">Activity Feed</h3>
        <div className="mt-4 grid gap-3">
          {activity.map((item) => (
            <div key={item.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm">
              <p className="font-semibold text-ink-900">
                {item.actor_tag || 'System'}
              </p>
              <p className="text-xs text-ink-500">{item.verb.replace(/_/g, ' ')}</p>
              <p className="text-xs text-ink-500">{new Date(item.created_at).toLocaleString()}</p>
            </div>
          ))}
          {!activity.length && (
            <p className="text-sm text-ink-500">No activity yet.</p>
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
