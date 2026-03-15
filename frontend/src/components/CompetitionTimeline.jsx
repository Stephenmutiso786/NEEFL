import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import Countdown from './Countdown.jsx';

const parseDate = (value) => {
  if (!value) return null;
  const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return 'TBD';
  return date.toLocaleString();
};

const getCountdownTarget = (item) => {
  const now = Date.now();
  const start = parseDate(item.start_date);
  const end = parseDate(item.end_date);
  if (start && start.getTime() > now) {
    return { label: 'Starts in', target: item.start_date };
  }
  if (end && end.getTime() > now) {
    return { label: 'Ends in', target: item.end_date };
  }
  return null;
};

function TimelineList({ title, items }) {
  return (
    <div className="card p-6">
      <h3 className="section-title">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.map((item) => {
          const countdown = getCountdownTarget(item);
          return (
            <div key={`${title}-${item.id}`} className="scoreboard">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{item.name}</p>
                  <p className="text-xs text-ink-500">Status: {item.status || 'scheduled'}</p>
                </div>
                {countdown && (
                  <div className="flex flex-col items-end gap-1 text-xs text-ink-500">
                    <span>{countdown.label}</span>
                    <Countdown target={countdown.target} />
                  </div>
                )}
              </div>
              <div className="mt-3 grid gap-1 text-xs text-ink-500">
                <span>Start: {formatDate(item.start_date)}</span>
                <span>End: {formatDate(item.end_date)}</span>
              </div>
            </div>
          );
        })}
        {!items.length && (
          <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
            No scheduled items yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompetitionTimeline({ limit = 3 }) {
  const [seasons, setSeasons] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    api('/api/seasons', { auth: false })
      .then((data) => setSeasons(data.seasons || []))
      .catch(() => {});
    api('/api/tournaments', { auth: false })
      .then((data) => setTournaments(data.tournaments || []))
      .catch(() => {});
  }, []);

  const seasonItems = useMemo(() => {
    const sorted = [...seasons].sort((a, b) => {
      const aDate = parseDate(a.start_date)?.getTime() || 0;
      const bDate = parseDate(b.start_date)?.getTime() || 0;
      return aDate - bDate;
    });
    return sorted.slice(0, limit);
  }, [seasons, limit]);

  const tournamentItems = useMemo(() => {
    const sorted = [...tournaments].sort((a, b) => {
      const aDate = parseDate(a.start_date)?.getTime() || 0;
      const bDate = parseDate(b.start_date)?.getTime() || 0;
      return aDate - bDate;
    });
    return sorted.slice(0, limit);
  }, [tournaments, limit]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TimelineList title="Season Countdown" items={seasonItems} />
      <TimelineList title="Tournament Countdown" items={tournamentItems} />
    </div>
  );
}

