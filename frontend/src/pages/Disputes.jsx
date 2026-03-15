import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [lookupId, setLookupId] = useState('');
  const [lookup, setLookup] = useState(null);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    api('/api/disputes/me')
      .then((data) => setDisputes(data.disputes || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
  }, []);

  const fetchDispute = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      const data = await api(`/api/disputes/${lookupId}`);
      setLookup(data.dispute);
      setStatus({ state: 'success', message: 'Dispute loaded.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">My Disputes</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {disputes.map((dispute) => (
            <div key={dispute.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="text-sm font-semibold text-ink-900">Match #{dispute.match_id}</p>
              <p className="text-xs text-ink-500">Status: {dispute.status}</p>
              <p className="mt-2 text-sm text-ink-700">{dispute.reason}</p>
            </div>
          ))}
          {!disputes.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No disputes logged yet.
            </div>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Lookup Dispute</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <input className="input" value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Dispute ID" />
          <button className="btn-secondary" type="button" onClick={fetchDispute}>Load</button>
        </div>
        {lookup && (
          <div className="mt-4 rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm text-ink-700">
            <p>Dispute #{lookup.id}</p>
            <p>Status: {lookup.status}</p>
            <p>Resolution: {lookup.resolution || 'Pending'}</p>
          </div>
        )}
      </section>

      {status.message && (
        <p className={`text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
