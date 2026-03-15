import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [topups, setTopups] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [creditForm, setCreditForm] = useState({
    user_id: '',
    email: '',
    gamer_tag: '',
    amount: '',
    reference: '',
    sender_name: '',
    phone: '',
    notes: ''
  });

  const load = () => {
    api('/api/admin/payments')
      .then((data) => setPayments(data.payments || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
    api('/api/wallet/admin/withdrawals')
      .then((data) => setWithdrawals(data.withdrawals || []))
      .catch(() => {});
    api('/api/wallet/admin/topups')
      .then((data) => setTopups(data.topups || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const reviewWithdrawal = async (id, nextStatus) => {
    if (!id) return;
    setStatus({ state: 'loading', message: '' });
    try {
      const notes = nextStatus === 'rejected'
        ? window.prompt('Reject reason / notes (optional):', '') || undefined
        : undefined;
      await api(`/api/wallet/admin/withdrawals/${id}/review`, {
        method: 'POST',
        body: { status: nextStatus, notes }
      });
      setStatus({ state: 'success', message: `Withdrawal ${nextStatus}.` });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const payoutWithdrawal = async (id) => {
    if (!id) return;
    if (!window.confirm(`Send M-Pesa payout for withdrawal #${id}?`)) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/wallet/admin/withdrawals/${id}/payout`, { method: 'POST' });
      setStatus({ state: 'success', message: 'Payout sent.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const reviewTopup = async (id, nextStatus) => {
    if (!id) return;
    setStatus({ state: 'loading', message: '' });
    try {
      const notes = nextStatus === 'rejected'
        ? window.prompt('Reject reason / notes (optional):', '') || undefined
        : undefined;
      await api(`/api/wallet/admin/topups/${id}/review`, {
        method: 'POST',
        body: { status: nextStatus, notes }
      });
      setStatus({ state: 'success', message: `Top-up ${nextStatus}.` });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const submitManualCredit = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      if (!creditForm.user_id && !creditForm.email && !creditForm.gamer_tag) {
        setStatus({ state: 'error', message: 'Provide a User ID, Email, or Gamer Tag.' });
        return;
      }
      const payload = {
        amount: Number(creditForm.amount),
        reference: creditForm.reference || undefined,
        sender_name: creditForm.sender_name || undefined,
        phone: creditForm.phone || undefined,
        notes: creditForm.notes || undefined
      };
      if (creditForm.user_id) payload.user_id = Number(creditForm.user_id);
      if (creditForm.email) payload.email = creditForm.email;
      if (creditForm.gamer_tag) payload.gamer_tag = creditForm.gamer_tag;

      await api('/api/wallet/admin/credit', { method: 'POST', body: payload });
      setStatus({ state: 'success', message: 'Wallet credited.' });
      setCreditForm({
        user_id: '',
        email: '',
        gamer_tag: '',
        amount: '',
        reference: '',
        sender_name: '',
        phone: '',
        notes: ''
      });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Manual Wallet Credit</h3>
        <p className="section-subtitle">Use when a player has paid via till or paybill. Provide at least one identifier.</p>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submitManualCredit}>
          <div>
            <label className="label">User ID (optional)</label>
            <input
              className="input"
              value={creditForm.user_id}
              onChange={(e) => setCreditForm((prev) => ({ ...prev, user_id: e.target.value }))}
              placeholder="123"
            />
          </div>
          <div>
            <label className="label">Email (optional)</label>
            <input
              className="input"
              value={creditForm.email}
              onChange={(e) => setCreditForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="player@example.com"
            />
          </div>
          <div>
            <label className="label">Gamer Tag (optional)</label>
            <input
              className="input"
              value={creditForm.gamer_tag}
              onChange={(e) => setCreditForm((prev) => ({ ...prev, gamer_tag: e.target.value }))}
              placeholder="NEEFL_Pro"
            />
          </div>
          <div>
            <label className="label">Amount (KES)</label>
            <input
              className="input"
              type="number"
              min="1"
              value={creditForm.amount}
              onChange={(e) => setCreditForm((prev) => ({ ...prev, amount: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Reference / M-Pesa Code</label>
            <input
              className="input"
              value={creditForm.reference}
              onChange={(e) => setCreditForm((prev) => ({ ...prev, reference: e.target.value }))}
              placeholder="e.g. QH37K..."
            />
          </div>
          <div>
            <label className="label">Sender Name</label>
            <input
              className="input"
              value={creditForm.sender_name}
              onChange={(e) => setCreditForm((prev) => ({ ...prev, sender_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              value={creditForm.phone}
              onChange={(e) => setCreditForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Notes (till/paybill number, etc.)</label>
            <textarea
              className="input min-h-[100px]"
              value={creditForm.notes}
              onChange={(e) => setCreditForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <button className="btn-primary" type="submit" disabled={status.state === 'loading'}>
              {status.state === 'loading' ? 'Saving...' : 'Credit Wallet'}
            </button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Transactions</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-ink-500">
                <th className="py-2">ID</th>
                <th className="py-2">User</th>
                <th className="py-2">Type</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Ref</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-sand-200">
                  <td className="py-2 text-ink-700">{payment.id}</td>
                  <td className="py-2 text-ink-700">{payment.user_id}</td>
                  <td className="py-2 text-ink-700">{payment.type}</td>
                  <td className="py-2 text-ink-700">KES {payment.amount}</td>
                  <td className="py-2 text-ink-700">{payment.status}</td>
                  <td className="py-2 text-ink-500">{payment.provider_ref || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!payments.length && (
            <p className="mt-4 text-sm text-ink-500">No payments yet.</p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Withdrawal Requests</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {withdrawals.map((item) => (
            <div key={item.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm">
              <p className="font-semibold text-ink-900">#{item.id} KES {item.amount}</p>
              <p className="text-xs text-ink-500">User {item.user_id} | {item.phone}</p>
              <p className="text-xs text-ink-500">Status: {item.status}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="btn-secondary"
                  type="button"
                  disabled={item.status !== 'pending'}
                  onClick={() => reviewWithdrawal(item.id, 'approved')}
                >
                  Approve
                </button>
                <button
                  className="btn-secondary"
                  type="button"
                  disabled={item.status !== 'pending'}
                  onClick={() => reviewWithdrawal(item.id, 'rejected')}
                >
                  Reject
                </button>
                <button
                  className="btn-primary"
                  type="button"
                  disabled={item.status !== 'approved'}
                  onClick={() => payoutWithdrawal(item.id)}
                >
                  Pay Out
                </button>
              </div>
            </div>
          ))}
          {!withdrawals.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No withdrawal requests.
            </div>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Wallet Top-up Requests</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {topups.map((item) => (
            <div key={item.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm">
              <p className="font-semibold text-ink-900">#{item.id} KES {item.amount}</p>
              <p className="text-xs text-ink-500">User {item.user_id} · {item.method}</p>
              <p className="text-xs text-ink-500">Ref: {item.reference || '-'}</p>
              <p className="text-xs text-ink-500">Status: {item.status}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="btn-secondary"
                  type="button"
                  disabled={item.status !== 'pending'}
                  onClick={() => reviewTopup(item.id, 'approved')}
                >
                  Approve
                </button>
                <button
                  className="btn-secondary"
                  type="button"
                  disabled={item.status !== 'pending'}
                  onClick={() => reviewTopup(item.id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          {!topups.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No wallet top-up requests.
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
