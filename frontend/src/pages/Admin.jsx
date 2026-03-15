import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import CompetitionTimeline from '../components/CompetitionTimeline.jsx';

export default function Admin() {
  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [userAction, setUserAction] = useState({ id: '' });
  const [matchId, setMatchId] = useState('');
  const [dispute, setDispute] = useState({ id: '', status: 'resolved', resolution: '' });
  const [notice, setNotice] = useState({ user_id: '', type: 'admin_message', message: '' });
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawReview, setWithdrawReview] = useState({ id: '', status: 'approved', notes: '' });
  const [withdrawPayoutId, setWithdrawPayoutId] = useState('');
  const [tickets, setTickets] = useState([]);

  const loadDashboard = () => {
    api('/api/admin/dashboard')
      .then((data) => setDashboard(data))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
    api('/api/wallet/admin/withdrawals')
      .then((data) => setWithdrawals(data.withdrawals || []))
      .catch(() => {});
    api('/api/support/admin')
      .then((data) => setTickets(data.tickets || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const approveUser = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/users/${userAction.id}/approve`, { method: 'POST' });
      setStatus({ state: 'success', message: 'User approved.' });
      loadDashboard();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const banUser = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/users/${userAction.id}/ban`, { method: 'POST' });
      setStatus({ state: 'success', message: 'User banned.' });
      loadDashboard();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const approveResult = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/results/${matchId}/approve`, { method: 'POST', body: { approve: true } });
      setStatus({ state: 'success', message: 'Result approved.' });
      loadDashboard();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const resolveDispute = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/disputes/${dispute.id}/resolve`, {
        method: 'POST',
        body: { status: dispute.status, resolution: dispute.resolution }
      });
      setStatus({ state: 'success', message: 'Dispute resolved.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const sendNotification = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/admin/notifications/send', {
        method: 'POST',
        body: {
          user_id: Number(notice.user_id),
          type: notice.type,
          message: notice.message
        }
      });
      setStatus({ state: 'success', message: 'Notification sent.' });
      setNotice({ user_id: '', type: 'admin_message', message: '' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const reviewWithdrawal = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/wallet/admin/withdrawals/${withdrawReview.id}/review`, {
        method: 'POST',
        body: { status: withdrawReview.status, notes: withdrawReview.notes || undefined }
      });
      setStatus({ state: 'success', message: 'Withdrawal updated.' });
      setWithdrawReview({ id: '', status: 'approved', notes: '' });
      loadDashboard();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const payoutWithdrawal = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/wallet/admin/withdrawals/${withdrawPayoutId}/payout`, { method: 'POST' });
      setStatus({ state: 'success', message: 'Payout sent.' });
      setWithdrawPayoutId('');
      loadDashboard();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Admin Dashboard</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <p className="label">Players</p>
            <p className="mt-2 text-lg font-semibold">{dashboard?.players ?? '-'}</p>
          </div>
          <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <p className="label">Tournaments</p>
            <p className="mt-2 text-lg font-semibold">{dashboard?.tournaments ?? '-'}</p>
          </div>
          <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <p className="label">Pending Matches</p>
            <p className="mt-2 text-lg font-semibold">{dashboard?.pending_matches ?? '-'}</p>
          </div>
          <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <p className="label">Pending Withdrawals</p>
            <p className="mt-2 text-lg font-semibold">{dashboard?.pending_withdrawals ?? '-'}</p>
          </div>
          <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <p className="label">Revenue</p>
            <p className="mt-2 text-lg font-semibold">KES {dashboard?.revenue ?? '-'}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn-secondary" to="/admin/players">View Players</Link>
          <Link className="btn-secondary" to="/admin/tournaments">View Tournaments</Link>
          <Link className="btn-secondary" to="/admin/matches">Approve Matches</Link>
          <Link className="btn-secondary" to="/admin/payments">Approve Withdrawals</Link>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Quick Access</h3>
        <p className="section-subtitle">Control center shortcuts.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Link className="tile tile-teal" to="/admin/players">
            <p className="text-sm font-semibold">Players</p>
            <p className="text-xs opacity-80">Approve & ban</p>
          </Link>
          <Link className="tile tile-magenta" to="/admin/matches">
            <p className="text-sm font-semibold">Matches</p>
            <p className="text-xs opacity-80">Verify results</p>
          </Link>
          <Link className="tile tile-gold" to="/admin/live">
            <p className="text-sm font-semibold">Live Control</p>
            <p className="text-xs opacity-80">Broadcast tools</p>
          </Link>
          <Link className="tile tile-lime" to="/admin/settings">
            <p className="text-sm font-semibold">Settings</p>
            <p className="text-xs opacity-80">Policies & rules</p>
          </Link>
        </div>
      </section>

      <CompetitionTimeline />

      <section className="card p-6">
        <h3 className="section-title">Player Management</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_auto]">
          <input className="input" value={userAction.id} onChange={(e) => setUserAction({ id: e.target.value })} placeholder="User ID" />
          <button className="btn-secondary" type="button" onClick={approveUser}>Approve</button>
          <button className="btn-secondary" type="button" onClick={banUser}>Ban</button>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Match Verification</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <input className="input" value={matchId} onChange={(e) => setMatchId(e.target.value)} placeholder="Match ID" />
          <button className="btn-primary" type="button" onClick={approveResult}>Approve Result</button>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Dispute Resolution</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={resolveDispute}>
          <div>
            <label className="label">Dispute ID</label>
            <input className="input" value={dispute.id} onChange={(e) => setDispute((prev) => ({ ...prev, id: e.target.value }))} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={dispute.status} onChange={(e) => setDispute((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="label">Resolution</label>
            <textarea className="input min-h-[120px]" value={dispute.resolution} onChange={(e) => setDispute((prev) => ({ ...prev, resolution: e.target.value }))} />
          </div>
          <div className="md:col-span-3">
            <button className="btn-secondary" type="submit">Resolve Dispute</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Send Notification</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={sendNotification}>
          <div>
            <label className="label">User ID</label>
            <input className="input" value={notice.user_id} onChange={(e) => setNotice((prev) => ({ ...prev, user_id: e.target.value }))} />
          </div>
          <div>
            <label className="label">Type</label>
            <input className="input" value={notice.type} onChange={(e) => setNotice((prev) => ({ ...prev, type: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Message</label>
            <textarea className="input min-h-[120px]" value={notice.message} onChange={(e) => setNotice((prev) => ({ ...prev, message: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Send Message</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Withdrawal Requests</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {withdrawals.map((item) => (
            <div key={item.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm">
              <p className="font-semibold text-ink-900">#{item.id} KES {item.amount}</p>
              <p className="text-xs text-ink-500">User {item.user_id} | {item.phone}</p>
              <p className="text-xs text-ink-500">Status: {item.status}</p>
            </div>
          ))}
          {!withdrawals.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No withdrawal requests yet.
            </div>
          )}
        </div>
        <form className="mt-6 grid gap-4 md:grid-cols-3" onSubmit={reviewWithdrawal}>
          <div>
            <label className="label">Request ID</label>
            <input className="input" value={withdrawReview.id} onChange={(e) => setWithdrawReview((prev) => ({ ...prev, id: e.target.value }))} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={withdrawReview.status} onChange={(e) => setWithdrawReview((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="approved">Approve</option>
              <option value="rejected">Reject</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="label">Notes</label>
            <textarea className="input min-h-[100px]" value={withdrawReview.notes} onChange={(e) => setWithdrawReview((prev) => ({ ...prev, notes: e.target.value }))} />
          </div>
          <div className="md:col-span-3">
            <button className="btn-secondary" type="submit">Update Request</button>
          </div>
        </form>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input className="input" value={withdrawPayoutId} onChange={(e) => setWithdrawPayoutId(e.target.value)} placeholder="Approved Request ID" />
          <button className="btn-primary" type="button" onClick={payoutWithdrawal}>Send Payout</button>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Support Tickets</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm">
              <p className="font-semibold text-ink-900">{ticket.subject}</p>
              <p className="text-xs text-ink-500">Ticket #{ticket.id} | User {ticket.user_id ?? 'N/A'}</p>
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

      {status.message && (
        <p className={`text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
