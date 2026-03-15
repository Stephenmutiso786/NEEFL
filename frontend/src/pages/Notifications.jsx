import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

function parsePayload(payload) {
  if (!payload) return {};
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch (err) {
      return { message: payload };
    }
  }
  return payload;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const load = () => {
    api('/api/notifications/me')
      .then((data) => setNotifications(data.notifications || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async () => {
    const unread = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (!unread.length) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/notifications/mark-read', { method: 'POST', body: { ids: unread } });
      setStatus({ state: 'success', message: 'Notifications marked as read.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="section-title">Notifications</h3>
            <p className="section-subtitle">System alerts for matches, payments, and admin actions.</p>
          </div>
          <button className="btn-secondary" type="button" onClick={markRead}>Mark All Read</button>
        </div>
        <div className="mt-4 grid gap-3">
          {notifications.map((note) => {
            const payload = parsePayload(note.payload);
            return (
              <div key={note.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink-900">{note.type}</span>
                  <span className="text-xs text-ink-500">{note.created_at}</span>
                </div>
                <p className="mt-2 text-sm text-ink-700">
                  {payload.message || JSON.stringify(payload)}
                </p>
                {!note.read_at && <span className="mt-2 inline-flex text-xs font-semibold text-sun-600">Unread</span>}
              </div>
            );
          })}
          {!notifications.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No notifications yet.
            </div>
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
