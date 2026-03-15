import { useEffect, useState } from 'react';
import { api, clearToken } from '../lib/api.js';

export default function Settings() {
  const [status, setStatus] = useState('');
  const [privacy, setPrivacy] = useState({
    privacy_profile: 'public',
    privacy_presence: true,
    privacy_friend_requests: true,
    privacy_follow: true
  });

  useEffect(() => {
    api('/api/social/privacy')
      .then((data) => {
        if (data?.privacy) {
          setPrivacy({
            privacy_profile: data.privacy.privacy_profile || 'public',
            privacy_presence: Boolean(data.privacy.privacy_presence),
            privacy_friend_requests: Boolean(data.privacy.privacy_friend_requests),
            privacy_follow: Boolean(data.privacy.privacy_follow)
          });
        }
      })
      .catch(() => {});
  }, []);

  const onLogout = () => {
    clearToken();
    setStatus('Token cleared.');
  };

  const savePrivacy = async (event) => {
    event.preventDefault();
    setStatus('');
    try {
      await api('/api/social/privacy', { method: 'PUT', body: privacy });
      setStatus('Privacy settings updated.');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Privacy Controls</h3>
        <p className="section-subtitle">Decide who can see and contact you.</p>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={savePrivacy}>
          <div>
            <label className="label">Profile Visibility</label>
            <select
              className="input"
              value={privacy.privacy_profile}
              onChange={(e) => setPrivacy((prev) => ({ ...prev, privacy_profile: e.target.value }))}
            >
              <option value="public">Public</option>
              <option value="friends">Friends only</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div>
            <label className="label">Show Online Status</label>
            <select
              className="input"
              value={privacy.privacy_presence ? 'yes' : 'no'}
              onChange={(e) => setPrivacy((prev) => ({ ...prev, privacy_presence: e.target.value === 'yes' }))}
            >
              <option value="yes">Visible</option>
              <option value="no">Hidden</option>
            </select>
          </div>
          <div>
            <label className="label">Friend Requests</label>
            <select
              className="input"
              value={privacy.privacy_friend_requests ? 'yes' : 'no'}
              onChange={(e) => setPrivacy((prev) => ({ ...prev, privacy_friend_requests: e.target.value === 'yes' }))}
            >
              <option value="yes">Allow</option>
              <option value="no">Block</option>
            </select>
          </div>
          <div>
            <label className="label">Followers</label>
            <select
              className="input"
              value={privacy.privacy_follow ? 'yes' : 'no'}
              onChange={(e) => setPrivacy((prev) => ({ ...prev, privacy_follow: e.target.value === 'yes' }))}
            >
              <option value="yes">Allow</option>
              <option value="no">Block</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button className="btn-primary" type="submit">Save Privacy</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Settings & Support</h3>
        <p className="section-subtitle">Manage your session and support options.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <button className="btn-secondary" type="button" onClick={onLogout}>Logout</button>
          <a className="btn-secondary" href="mailto:support@neefl.local">Contact Support</a>
        </div>
        {status && <p className="mt-3 text-sm text-ink-700">{status}</p>}
      </section>
    </div>
  );
}
