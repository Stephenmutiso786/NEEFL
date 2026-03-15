import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useSearchParams } from 'react-router-dom';

export default function Payments() {
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, withdrawals: [], transactions: [] });
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [stkForm, setStkForm] = useState({
    amount: '',
    phone: '',
    tournament_id: '',
    season_id: '',
    match_id: '',
    account_reference: '',
    transaction_desc: '',
    type: 'entry_fee'
  });
  const [payoutForm, setPayoutForm] = useState({
    user_id: '',
    amount: '',
    phone: '',
    remarks: '',
    occasion: ''
  });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', phone: '', notes: '' });

  const load = () => {
    api('/api/payments/me')
      .then((data) => setPayments(data.payments || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
    api('/api/wallet/me')
      .then((data) => setWallet({ balance: data.balance, withdrawals: data.withdrawals || [], transactions: data.transactions || [] }))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const tournamentId = searchParams.get('tournament_id');
    const seasonId = searchParams.get('season_id');
    const matchId = searchParams.get('match_id');
    const amount = searchParams.get('amount');
    if (tournamentId || seasonId || matchId || amount) {
      setStkForm((prev) => ({
        ...prev,
        type: 'entry_fee',
        tournament_id: tournamentId || '',
        season_id: seasonId || '',
        match_id: matchId || '',
        amount: amount || prev.amount
      }));
    }
  }, [searchParams]);

  const sendStk = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      const payload = {
        amount: Number(stkForm.amount),
        phone: stkForm.phone,
        type: stkForm.type,
        tournament_id: stkForm.type === 'entry_fee' && stkForm.tournament_id
          ? Number(stkForm.tournament_id)
          : undefined,
        season_id: stkForm.type === 'entry_fee' && stkForm.season_id
          ? Number(stkForm.season_id)
          : undefined,
        match_id: stkForm.type === 'entry_fee' && stkForm.match_id
          ? Number(stkForm.match_id)
          : undefined,
        account_reference: stkForm.account_reference || undefined,
        transaction_desc: stkForm.transaction_desc || undefined
      };
      await api('/api/payments/mpesa/stk-push', { method: 'POST', body: payload });
      setStatus({ state: 'success', message: 'STK push initiated.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const sendPayout = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      const payload = {
        user_id: Number(payoutForm.user_id),
        amount: Number(payoutForm.amount),
        phone: payoutForm.phone,
        remarks: payoutForm.remarks || undefined,
        occasion: payoutForm.occasion || undefined
      };
      await api('/api/payments/payouts', { method: 'POST', body: payload });
      setStatus({ state: 'success', message: 'Payout sent.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const requestWithdraw = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/wallet/withdraw', {
        method: 'POST',
        body: {
          amount: Number(withdrawForm.amount),
          phone: withdrawForm.phone,
          notes: withdrawForm.notes || undefined
        }
      });
      setStatus({ state: 'success', message: 'Withdrawal request submitted.' });
      setWithdrawForm({ amount: '', phone: '', notes: '' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Wallet & Payments</h3>
        <p className="section-subtitle">Real M-Pesa transactions and reconciliation.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <p className="label">Wallet Balance</p>
            <p className="mt-2 text-lg font-semibold">KES {wallet.balance}</p>
          </div>
          <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <p className="label">Withdrawals</p>
            <p className="mt-2 text-sm text-ink-700">{wallet.withdrawals.length} requests</p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-ink-500">
                <th className="py-2">Type</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Ref</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-sand-200">
                  <td className="py-2 font-semibold text-ink-900">{payment.type}</td>
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
        <h3 className="section-title">Wallet Transactions</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-ink-500">
                <th className="py-2">Type</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {wallet.transactions.map((tx) => (
                <tr key={tx.id} className="border-t border-sand-200">
                  <td className="py-2 text-ink-700">{tx.type}</td>
                  <td className="py-2 text-ink-700">KES {tx.amount}</td>
                  <td className="py-2 text-ink-500">{tx.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!wallet.transactions.length && (
            <p className="mt-4 text-sm text-ink-500">No wallet transactions yet.</p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Request Withdrawal</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={requestWithdraw}>
          <div>
            <label className="label">Amount (KES)</label>
            <input className="input" type="number" value={withdrawForm.amount} onChange={(e) => setWithdrawForm((prev) => ({ ...prev, amount: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={withdrawForm.phone} onChange={(e) => setWithdrawForm((prev) => ({ ...prev, phone: e.target.value }))} required />
          </div>
          <div className="md:col-span-2">
            <label className="label">Notes (optional)</label>
            <textarea className="input min-h-[90px]" value={withdrawForm.notes} onChange={(e) => setWithdrawForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Submit Withdrawal</button>
          </div>
        </form>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {wallet.withdrawals.map((item) => (
            <div key={item.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm">
              <p className="font-semibold text-ink-900">KES {item.amount}</p>
              <p className="text-xs text-ink-500">Status: {item.status}</p>
              <p className="text-xs text-ink-500">Phone: {item.phone}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">M-Pesa STK Push</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={sendStk}>
          <div>
            <label className="label">Payment Type</label>
            <select
              className="input"
              value={stkForm.type}
              onChange={(e) => setStkForm((prev) => ({ ...prev, type: e.target.value }))}
            >
              <option value="entry_fee">Tournament Entry</option>
              <option value="wallet_topup">Wallet Top Up</option>
            </select>
          </div>
          <div>
            <label className="label">Amount (KES)</label>
            <input className="input" type="number" value={stkForm.amount} onChange={(e) => setStkForm((prev) => ({ ...prev, amount: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={stkForm.phone} onChange={(e) => setStkForm((prev) => ({ ...prev, phone: e.target.value }))} required />
          </div>
          {stkForm.type === 'entry_fee' && (
            <>
              <div>
                <label className="label">Tournament ID</label>
                <input className="input" value={stkForm.tournament_id} onChange={(e) => setStkForm((prev) => ({ ...prev, tournament_id: e.target.value }))} />
              </div>
              <div>
                <label className="label">Season ID</label>
                <input className="input" value={stkForm.season_id} onChange={(e) => setStkForm((prev) => ({ ...prev, season_id: e.target.value }))} />
              </div>
              <div>
                <label className="label">Match ID</label>
                <input className="input" value={stkForm.match_id} onChange={(e) => setStkForm((prev) => ({ ...prev, match_id: e.target.value }))} />
              </div>
            </>
          )}
          <div>
            <label className="label">Account Reference</label>
            <input className="input" value={stkForm.account_reference} onChange={(e) => setStkForm((prev) => ({ ...prev, account_reference: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Transaction Description</label>
            <input className="input" value={stkForm.transaction_desc} onChange={(e) => setStkForm((prev) => ({ ...prev, transaction_desc: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <button className="btn-primary" type="submit">
              {stkForm.type === 'entry_fee' ? 'Pay Entry Fee' : 'Top Up Wallet'}
            </button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Prize Payout (Admin)</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={sendPayout}>
          <div>
            <label className="label">User ID</label>
            <input className="input" value={payoutForm.user_id} onChange={(e) => setPayoutForm((prev) => ({ ...prev, user_id: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Amount (KES)</label>
            <input className="input" type="number" value={payoutForm.amount} onChange={(e) => setPayoutForm((prev) => ({ ...prev, amount: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={payoutForm.phone} onChange={(e) => setPayoutForm((prev) => ({ ...prev, phone: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Remarks</label>
            <input className="input" value={payoutForm.remarks} onChange={(e) => setPayoutForm((prev) => ({ ...prev, remarks: e.target.value }))} />
          </div>
          <div>
            <label className="label">Occasion</label>
            <input className="input" value={payoutForm.occasion} onChange={(e) => setPayoutForm((prev) => ({ ...prev, occasion: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <button className="btn-secondary" type="submit">Send Payout</button>
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
