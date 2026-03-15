import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const load = () => {
    api('/api/admin/payments')
      .then((data) => setPayments(data.payments || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
    api('/api/wallet/admin/withdrawals')
      .then((data) => setWithdrawals(data.withdrawals || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-6">
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
            </div>
          ))}
          {!withdrawals.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No withdrawal requests.
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
