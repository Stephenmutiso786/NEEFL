import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function StaffDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [form, setForm] = useState({ id: '', status: 'resolved', resolution: '' });
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const load = () => {
    api('/api/staff/disputes')
      .then((data) => setDisputes(data.disputes || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
  };

  useEffect(() => {
    load();
  }, []);

  const resolve = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/staff/disputes/${form.id}/resolve`, {
        method: 'POST',
        body: { status: form.status, resolution: form.resolution }
      });
      setStatus({ state: 'success', message: 'Dispute resolved.' });
      setForm({ id: '', status: 'resolved', resolution: '' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Disputes</h3>
        <p className="section-subtitle">Resolve conflicts with clear notes.</p>
        <div className="mt-4 grid gap-3">
          {disputes.map((dispute) => (
            <div key={dispute.id} className="scoreboard">
              <p className="text-xs text-ink-500">Dispute #{dispute.id} · Match #{dispute.match_id}</p>
              <p className="text-sm font-semibold text-ink-900">
                {dispute.player1_tag || dispute.player1_id} vs {dispute.player2_tag || dispute.player2_id}
              </p>
              <p className="mt-2 text-xs text-ink-500">Reason: {dispute.reason}</p>
              <p className="mt-1 text-xs text-ink-500">Status: {dispute.status}</p>
            </div>
          ))}
          {!disputes.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No disputes reported.
            </div>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Resolve Dispute</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={resolve}>
          <div>
            <label className="label">Dispute ID</label>
            <input className="input" value={form.id} onChange={(e) => setForm((prev) => ({ ...prev, id: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Decision</label>
            <select className="input" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Resolution Notes</label>
            <textarea className="input min-h-[120px]" value={form.resolution} onChange={(e) => setForm((prev) => ({ ...prev, resolution: e.target.value }))} required />
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Resolve Dispute</button>
          </div>
        </form>
      </section>

      {status.message && (
        <p className={`text-sm ${status.state === 'error' ? 'text-red-400' : 'text-ink-500'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
