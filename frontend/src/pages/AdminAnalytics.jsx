import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Chart } from 'chart.js/auto';
import { useRef } from 'react';

export default function AdminAnalytics() {
  const [summary, setSummary] = useState(null);
  const [range, setRange] = useState({ from: '', to: '' });
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const chartRef = useRef(null);
  const canvasRef = useRef(null);

  const load = () => {
    const params = range.from && range.to ? `?from=${range.from}&to=${range.to}` : '';
    api(`/api/admin/reports/summary${params}`)
      .then((data) => setSummary(data))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
    api('/api/admin/fraud/alerts')
      .then((data) => setFraudAlerts(data.alerts || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!summary) return;
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: ['Players', 'Tournaments', 'Matches', 'Revenue'],
        datasets: [
          {
            label: 'Summary',
            data: [summary.players, summary.tournaments, summary.matches, summary.revenue],
            backgroundColor: ['#0ea5a4', '#f97316', '#38bdf8', '#1f2a44']
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  }, [summary]);

  const onFilter = (event) => {
    event.preventDefault();
    load();
  };

  const downloadReport = () => {
    if (!summary) return;
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'neefl-report.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const runFraudScan = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/admin/fraud/scan', { method: 'POST' });
      setStatus({ state: 'success', message: 'Fraud scan completed.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const resolveAlert = async (id) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/fraud/alerts/${id}/resolve`, { method: 'POST' });
      setStatus({ state: 'success', message: 'Alert resolved.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Analytics & Reports</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={onFilter}>
          <div>
            <label className="label">From</label>
            <input className="input" type="date" value={range.from} onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))} />
          </div>
          <div>
            <label className="label">To</label>
            <input className="input" type="date" value={range.to} onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <button className="btn-secondary" type="submit">Filter</button>
          </div>
        </form>
        <div className="mt-4">
          <button className="btn-secondary" type="button" onClick={downloadReport}>Download Report</button>
        </div>
        {summary && (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Players</p>
              <p className="mt-2 text-lg font-semibold">{summary.players}</p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Tournaments</p>
              <p className="mt-2 text-lg font-semibold">{summary.tournaments}</p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Matches</p>
              <p className="mt-2 text-lg font-semibold">{summary.matches}</p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Revenue</p>
              <p className="mt-2 text-lg font-semibold">KES {summary.revenue}</p>
            </div>
          </div>
        )}
        <div className="mt-6 rounded-2xl border border-sand-200 bg-sand-50 p-4">
          <canvas ref={canvasRef} height="120"></canvas>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="section-title">Fraud & Integrity Alerts</h3>
          <button className="btn-secondary" type="button" onClick={runFraudScan}>Run Scan</button>
        </div>
        <div className="mt-4 grid gap-3">
          {fraudAlerts.map((alert) => (
            <div key={alert.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm">
              <div>
                <p className="font-semibold text-ink-900">{alert.alert_type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-ink-500">Match {alert.match_id || 'N/A'} · User {alert.user_id || 'N/A'} · {alert.severity}</p>
              </div>
              <button className="btn-secondary" type="button" onClick={() => resolveAlert(alert.id)}>Resolve</button>
            </div>
          ))}
          {!fraudAlerts.length && (
            <p className="text-sm text-ink-500">No active alerts.</p>
          )}
        </div>
      </section>

      {status.message && (
        <p className="text-sm text-red-600">{status.message}</p>
      )}
    </div>
  );
}
