import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function AdminPlayers() {
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [roleUpdate, setRoleUpdate] = useState({ id: '', role: 'player' });
  const [editForm, setEditForm] = useState({ id: '', gamer_tag: '', real_name: '', country: '', region: '', preferred_team: '' });
  const [premiumForm, setPremiumForm] = useState({ id: '', is_premium: false });
  const [resetForm, setResetForm] = useState({ id: '', new_password: '', confirm: '', show: false });

  const load = () => {
    api('/api/admin/players')
      .then((data) => setPlayers(data.players || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/users/${id}/approve`, { method: 'POST' });
      setStatus({ state: 'success', message: 'Player approved.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const ban = async (id) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/users/${id}/ban`, { method: 'POST' });
      setStatus({ state: 'success', message: 'Player banned.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (!resetForm.id) return;
    if (resetForm.new_password !== resetForm.confirm) {
      setStatus({ state: 'error', message: 'Passwords do not match.' });
      return;
    }
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/users/${resetForm.id}/reset-password`, {
        method: 'POST',
        body: { new_password: resetForm.new_password }
      });
      setStatus({ state: 'success', message: 'Password reset.' });
      setResetForm({ id: '', new_password: '', confirm: '', show: false });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updateRole = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/users/${roleUpdate.id}/role`, {
        method: 'POST',
        body: { role: roleUpdate.role }
      });
      setStatus({ state: 'success', message: 'Role updated.' });
      setRoleUpdate({ id: '', role: 'player' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updatePlayer = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/players/${editForm.id}`, {
        method: 'PUT',
        body: {
          gamer_tag: editForm.gamer_tag || undefined,
          real_name: editForm.real_name || undefined,
          country: editForm.country || undefined,
          region: editForm.region || undefined,
          preferred_team: editForm.preferred_team || undefined
        }
      });
      setStatus({ state: 'success', message: 'Player updated.' });
      setEditForm({ id: '', gamer_tag: '', real_name: '', country: '', region: '', preferred_team: '' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updatePremium = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/users/${premiumForm.id}/premium`, {
        method: 'POST',
        body: { is_premium: Boolean(premiumForm.is_premium) }
      });
      setStatus({ state: 'success', message: 'Premium status updated.' });
      setPremiumForm({ id: '', is_premium: false });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Player Management</h3>
        <p className="section-subtitle">Approve, ban, or change roles.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-ink-500">
                <th className="py-2">ID</th>
                <th className="py-2">Gamer Tag</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Premium</th>
                <th className="py-2">KYC</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} className="border-t border-sand-200">
                  <td className="py-2 text-ink-700">{player.id}</td>
                  <td className="py-2 font-semibold text-ink-900">{player.gamer_tag || '—'}</td>
                  <td className="py-2 text-ink-700">{player.email || player.phone || '—'}</td>
                  <td className="py-2 text-ink-700">{player.role}</td>
                  <td className="py-2 text-ink-700">{player.is_premium ? 'Yes' : 'No'}</td>
                  <td className="py-2 text-ink-700">{player.kyc_status || 'unverified'}</td>
                  <td className="py-2 text-ink-700">{player.status}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {player.status !== 'active' && (
                        <button className="btn-secondary" type="button" onClick={() => approve(player.id)}>Approve</button>
                      )}
                      {player.status !== 'banned' ? (
                        <button className="btn-secondary" type="button" onClick={() => ban(player.id)}>Ban</button>
                      ) : (
                        <button className="btn-secondary" type="button" onClick={() => approve(player.id)}>Unban</button>
                      )}
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => {
                          setRoleUpdate({ id: String(player.id), role: player.role || 'player' });
                          setPremiumForm({ id: String(player.id), is_premium: Boolean(player.is_premium) });
                          setEditForm({
                            id: String(player.id),
                            gamer_tag: player.gamer_tag || '',
                            real_name: player.real_name || '',
                            country: player.country || '',
                            region: player.region || '',
                            preferred_team: player.preferred_team || ''
                          });
                          setResetForm((prev) => ({ ...prev, id: String(player.id) }));
                          window.scrollTo({ top: document.body.scrollHeight / 3, behavior: 'smooth' });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => {
                          setResetForm((prev) => ({ ...prev, id: String(player.id) }));
                          window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' });
                        }}
                      >
                        Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!players.length && (
            <p className="mt-4 text-sm text-ink-500">No players yet.</p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="card-title">Update Role</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={updateRole}>
          <div>
            <label className="label">User ID</label>
            <input className="input" value={roleUpdate.id} onChange={(e) => setRoleUpdate((prev) => ({ ...prev, id: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={roleUpdate.role} onChange={(e) => setRoleUpdate((prev) => ({ ...prev, role: e.target.value }))}>
              <option value="player">Player</option>
              <option value="fan">Fan</option>
              <option value="bettor">Bettor</option>
              <option value="supervisor">Supervisor</option>
              <option value="referee">Referee</option>
              <option value="moderator">Moderator</option>
              <option value="broadcaster">Broadcaster</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-secondary" type="submit">Update Role</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="card-title">Update Premium Access</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={updatePremium}>
          <div>
            <label className="label">User ID</label>
            <input className="input" value={premiumForm.id} onChange={(e) => setPremiumForm((prev) => ({ ...prev, id: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Premium Access</label>
            <select
              className="input"
              value={premiumForm.is_premium ? 'yes' : 'no'}
              onChange={(e) => setPremiumForm((prev) => ({ ...prev, is_premium: e.target.value === 'yes' }))}
            >
              <option value="no">Standard</option>
              <option value="yes">Premium</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-secondary" type="submit">Update Premium</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="card-title">Edit Player</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={updatePlayer}>
          <div>
            <label className="label">User ID</label>
            <input className="input" value={editForm.id} onChange={(e) => setEditForm((prev) => ({ ...prev, id: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Gamer Tag</label>
            <input className="input" value={editForm.gamer_tag} onChange={(e) => setEditForm((prev) => ({ ...prev, gamer_tag: e.target.value }))} />
          </div>
          <div>
            <label className="label">Real Name</label>
            <input className="input" value={editForm.real_name} onChange={(e) => setEditForm((prev) => ({ ...prev, real_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input" value={editForm.country} onChange={(e) => setEditForm((prev) => ({ ...prev, country: e.target.value }))} />
          </div>
          <div>
            <label className="label">Region</label>
            <input className="input" value={editForm.region} onChange={(e) => setEditForm((prev) => ({ ...prev, region: e.target.value }))} />
          </div>
          <div>
            <label className="label">Preferred Team</label>
            <input className="input" value={editForm.preferred_team} onChange={(e) => setEditForm((prev) => ({ ...prev, preferred_team: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Update Player</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="card-title">Reset User Password</h3>
        <p className="section-subtitle">Sets a new password and unlocks the account (use strong passwords).</p>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={resetPassword}>
          <div>
            <label className="label">User ID</label>
            <input className="input" value={resetForm.id} onChange={(e) => setResetForm((prev) => ({ ...prev, id: e.target.value }))} required />
          </div>
          <div className="md:col-span-2">
            <label className="label">New Password</label>
            <div className="relative">
              <input
                className="input pr-12"
                type={resetForm.show ? 'text' : 'password'}
                value={resetForm.new_password}
                onChange={(e) => setResetForm((prev) => ({ ...prev, new_password: e.target.value }))}
                required
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-500"
                type="button"
                onClick={() => setResetForm((prev) => ({ ...prev, show: !prev.show }))}
              >
                {resetForm.show ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="label">Confirm Password</label>
            <input
              className="input"
              type={resetForm.show ? 'text' : 'password'}
              value={resetForm.confirm}
              onChange={(e) => setResetForm((prev) => ({ ...prev, confirm: e.target.value }))}
              required
            />
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Reset Password</button>
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
