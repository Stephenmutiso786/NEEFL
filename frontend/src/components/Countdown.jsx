import { useEffect, useMemo, useState } from 'react';

function formatCountdown(targetMs, nowMs) {
  if (!targetMs || Number.isNaN(targetMs)) return null;
  const diff = targetMs - nowMs;
  if (diff <= 0) return 'Kickoff';
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

export default function Countdown({ target }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const targetMs = useMemo(() => {
    if (!target) return null;
    const parsed = new Date(target);
    const ms = parsed.getTime();
    if (Number.isNaN(ms)) return null;
    return ms;
  }, [target]);

  const text = useMemo(() => formatCountdown(targetMs, now), [targetMs, now]);

  if (!text) {
    return <span className="text-xs text-ink-500">TBD</span>;
  }

  return (
    <span className="inline-flex items-center rounded-full border border-mint-500/40 bg-sand-50 px-2 py-0.5 text-xs text-mint-500">
      {text}
    </span>
  );
}

