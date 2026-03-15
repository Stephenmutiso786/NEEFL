import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  const [form, setForm] = useState({ name: '', slug: '', description: '', logo_url: '', region: '' });
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const load = () => {
    api('/api/clubs', { auth: false })
      .then((data) => setClubs(data.clubs || []))
      .catch(() => {});
    api('/api/clubs/me')
      .then((data) => setMyClubs(data.clubs || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const createClub = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/clubs', {
        method: 'POST',
        body: {
          name: form.name,
          slug: form.slug || undefined,
          description: form.description || undefined,
          logo_url: form.logo_url || undefined,
          region: form.region || undefined
        }
      });
      setStatus({ state: 'success', message: 'Club created.' });
      setForm({ name: '', slug: '', description: '', logo_url: '', region: '' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const joinClub = async (clubId) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/clubs/${clubId}/join`, { method: 'POST' });
      setStatus({ state: 'success', message: 'Join request sent.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Create Club</h3>
        <p className="section-subtitle">Build teams, rosters, and club rivalries.</p>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={createClub}>
          <div>
            <label className="label">Club Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Slug (optional)</label>
            <input className="input" value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} />
          </div>
          <div>
            <label className="label">Region</label>
            <input className="input" value={form.region} onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))} />
          </div>
          <div>
            <label className="label">Logo URL</label>
            <input className="input" value={form.logo_url} onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea className="input min-h-[120px]" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <button className="btn-primary" type="submit">Create Club</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">My Clubs</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {myClubs.map((club) => (
            <div key={club.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm">
              <p className="font-semibold text-ink-900">{club.name}</p>
              <p className="text-xs text-ink-500">Role: {club.role} · {club.status}</p>
            </div>
          ))}
          {!myClubs.length && (
            <p className="text-sm text-ink-500">You are not part of a club yet.</p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">All Clubs</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {clubs.map((club) => (
            <div key={club.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm">
              <p className="font-semibold text-ink-900">{club.name}</p>
              <p className="text-xs text-ink-500">{club.region || 'Global'} · {club.member_count} members</p>
              <p className="mt-2 text-xs text-ink-500">{club.description || 'No description yet.'}</p>
              <div className="mt-3">
                <button className="btn-secondary" type="button" onClick={() => joinClub(club.id)}>Request to Join</button>
              </div>
            </div>
          ))}
          {!clubs.length && (
            <p className="text-sm text-ink-500">No clubs created yet.</p>
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
