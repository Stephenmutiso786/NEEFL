import { useEffect, useMemo, useState } from 'react';

function formatCountdown(targetMs, nowMs) {
  if (!targetMs || Number.isNaN(targetMs)) return '';
  const diff = targetMs - nowMs;
  if (diff <= 0) return 'Service resuming soon';
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function MaintenancePage({ message, endTime }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const targetMs = useMemo(() => {
    if (!endTime) return null;
    const normalized = endTime.includes(' ') && !endTime.includes('T')
      ? endTime.replace(' ', 'T')
      : endTime;
    const parsed = new Date(normalized);
    const ms = parsed.getTime();
    if (Number.isNaN(ms)) return null;
    return ms;
  }, [endTime]);

  const countdown = useMemo(() => formatCountdown(targetMs, now), [targetMs, now]);

  return (
    <div className="min-h-screen px-6 py-12 md:px-10">
      <div className="card mx-auto max-w-3xl p-8 text-center">
        <p className="label">NEEFL Arena</p>
        <h1 className="mt-4 text-4xl font-semibold text-ink-900">Platform Under Maintenance</h1>
        <p className="mt-4 text-base text-ink-500">
          {message || 'We are upgrading the league experience. Please check back soon.'}
        </p>
        {countdown && (
          <div className="mt-6 grid place-items-center">
            <div className="scoreboard inline-flex items-center gap-3 px-6 py-4 text-lg font-semibold text-ink-900">
              <span className="score-pill glow-ring">TIME</span>
              <span>{countdown}</span>
            </div>
          </div>
        )}
        <p className="mt-6 text-sm text-ink-500">Admins can still log in to manage the platform.</p>
      </div>
    </div>
  );
}
