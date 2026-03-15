import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, getToken } from '../lib/api.js';

export default function PlayerProfileView() {
  const { id } = useParams();
  const token = getToken();
  const [profile, setProfile] = useState(null);
  const [relation, setRelation] = useState({ is_friend: false, is_following: false, friend_status: null });
  const [achievements, setAchievements] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const load = () => {
    if (!id) return;
    api(`/api/public/players/${id}`, { auth: Boolean(token) })
      .then((data) => {
        setProfile(data.player);
        setRelation(data.relation || { is_friend: false, is_following: false, friend_status: null });
      })
      .catch((err) => setStatus({ state: 'error', message: err.message }));
    api(`/api/achievements/players/${id}`, { auth: false })
      .then((data) => setAchievements(data.achievements || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, [id]);

  const addFriend = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/social/friends/request', { method: 'POST', body: { user_id: Number(id) } });
      setStatus({ state: 'success', message: 'Friend request sent.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const follow = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/social/follow', { method: 'POST', body: { user_id: Number(id) } });
      setStatus({ state: 'success', message: 'Now following.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  if (!profile) {
    return (
      <div className="card p-6">
        <h3 className="section-title">Player Profile</h3>
        <p className="section-subtitle">Loading player details.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">{profile.gamer_tag || 'Player'}</h3>
        <p className="section-subtitle">Public player card.</p>
        {profile.privacy === 'private' && (
          <p className="mt-4 text-sm text-ink-500">This profile is private.</p>
        )}
        {profile.privacy !== 'private' && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
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
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Followers</p>
              <p className="mt-2 text-lg font-semibold">{profile.followers_count}</p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Following</p>
              <p className="mt-2 text-lg font-semibold">{profile.following_count}</p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Friends</p>
              <p className="mt-2 text-lg font-semibold">{profile.friends_count}</p>
            </div>
          </div>
        )}
        {token && profile.privacy !== 'private' && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn-secondary" type="button" onClick={addFriend}>
              {relation.friend_status === 'pending' ? 'Request Sent' : 'Add Friend'}
            </button>
            <button className="btn-secondary" type="button" onClick={follow}>
              {relation.is_following ? 'Following' : 'Follow'}
            </button>
          </div>
        )}
      </section>

      <section className="card p-6">
        <h3 className="card-title">Achievements</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {achievements.map((item) => (
            <div key={item.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm">
              <p className="font-semibold text-ink-900">{item.name}</p>
              <p className="text-xs text-ink-500">{item.description || 'Achievement unlocked.'}</p>
            </div>
          ))}
          {!achievements.length && (
            <p className="text-sm text-ink-500">No achievements yet.</p>
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
