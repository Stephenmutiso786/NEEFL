import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ subject: '', message: '', contact_email: '', contact_phone: '' });
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const load = () => {
    api('/api/support/me')
      .then((data) => setTickets(data.tickets || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/support', {
        method: 'POST',
        body: {
          subject: form.subject,
          message: form.message,
          contact_email: form.contact_email || undefined,
          contact_phone: form.contact_phone || undefined
        }
      });
      setStatus({ state: 'success', message: 'Support ticket submitted.' });
      setForm({ subject: '', message: '', contact_email: '', contact_phone: '' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Quick Access</h3>
        <p className="section-subtitle">Helpful links while you wait for support.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Link className="tile tile-teal" to="/community">
            <p className="text-sm font-semibold">Community</p>
            <p className="text-xs opacity-80">Players online</p>
          </Link>
          <Link className="tile tile-magenta" to="/matches">
            <p className="text-sm font-semibold">Matches</p>
            <p className="text-xs opacity-80">Schedule & results</p>
          </Link>
          <Link className="tile tile-gold" to="/streams">
            <p className="text-sm font-semibold">Live Arena</p>
            <p className="text-xs opacity-80">Watch streams</p>
          </Link>
          <Link className="tile tile-lime" to="/policies/rulebook">
            <p className="text-sm font-semibold">Rulebook</p>
            <p className="text-xs opacity-80">Official policies</p>
          </Link>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Support Tickets</h3>
        <p className="section-subtitle">Request help from the league team.</p>
        <div className="mt-4 grid gap-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm">
              <p className="font-semibold text-ink-900">{ticket.subject}</p>
              <p className="text-xs text-ink-500">Status: {ticket.status}</p>
            </div>
          ))}
          {!tickets.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No support tickets yet.
            </div>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Open New Ticket</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div>
            <label className="label">Subject</label>
            <input className="input" value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Contact Email</label>
            <input className="input" value={form.contact_email} onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Contact Phone</label>
            <input className="input" value={form.contact_phone} onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Message</label>
            <textarea className="input min-h-[140px]" value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} required />
          </div>
          <div className="md:col-span-2">
            <button className="btn-primary" type="submit">Send Ticket</button>
          </div>
          {status.message && (
            <p className={`text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'} md:col-span-2`}>
              {status.message}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
