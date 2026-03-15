import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function AdminPlayers() {
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [roleUpdate, setRoleUpdate] = useState({ id: '', role: 'player' });
  const [editForm, setEditForm] = useState({ id: '', gamer_tag: '', real_name: '', country: '', region: '', preferred_team: '' });
  const [premiumForm, setPremiumForm] = useState({ id: '', is_premium: false });

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
                      <button className="btn-secondary" type="button" onClick={() => approve(player.id)}>Approve</button>
                      <button className="btn-secondary" type="button" onClick={() => ban(player.id)}>Ban</button>
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

      {status.message && (
        <p className={`text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
