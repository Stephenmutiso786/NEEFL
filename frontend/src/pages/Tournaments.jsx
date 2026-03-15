import { useEffect, useState } from 'react';
import { api, getUserRole } from '../lib/api.js';
import Countdown from '../components/Countdown.jsx';

const formatDateTime = (value) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function Tournaments() {
  const role = getUserRole();
  const isAdmin = role === 'admin';
  const [tournaments, setTournaments] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [createForm, setCreateForm] = useState({
    name: '',
    format: 'league',
    entry_fee: 0,
    prize_pool: 0,
    rules: '',
    start_date: '',
    end_date: ''
  });
  const [scheduleForm, setScheduleForm] = useState({
    tournament_id: '',
    start_datetime: '',
    match_time: '18:00',
    days_between_rounds: 1
  });

  const load = () => {
    api('/api/tournaments', { auth: false })
      .then((data) => setTournaments(data.tournaments || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
    api('/api/seasons', { auth: false })
      .then((data) => setSeasons(data.seasons || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const onJoin = async (id) => {
    setStatus({ state: 'loading', message: '' });
    try {
      const data = await api(`/api/tournaments/${id}/join`, { method: 'POST' });
      setStatus({ state: 'success', message: `Joined tournament (${data.status}).` });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const onCreate = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      const payload = {
        ...createForm,
        entry_fee: Number(createForm.entry_fee),
        prize_pool: Number(createForm.prize_pool)
      };
      const data = await api('/api/tournaments', { method: 'POST', body: payload });
      setStatus({ state: 'success', message: `Tournament created (ID ${data.id}).` });
      setCreateForm({
        name: '',
        format: 'league',
        entry_fee: 0,
        prize_pool: 0,
        rules: '',
        start_date: '',
        end_date: ''
      });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const onSchedule = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      const payload = {
        start_datetime: scheduleForm.start_datetime || undefined,
        match_time: scheduleForm.match_time || undefined,
        days_between_rounds: Number(scheduleForm.days_between_rounds)
      };
      const data = await api(`/api/tournaments/${scheduleForm.tournament_id}/schedule`, {
        method: 'POST',
        body: payload
      });
      setStatus({ state: 'success', message: `Schedule generated (${data.rounds} rounds).` });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Season Timeline</h3>
        <p className="section-subtitle">Upcoming and active seasons at a glance.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {seasons.slice(0, 4).map((season) => (
            <div key={season.id} className="scoreboard">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{season.name}</p>
                  <p className="text-xs text-ink-500">Status: {season.status}</p>
                </div>
                <Countdown target={season.start_date} />
              </div>
              <div className="mt-3 grid gap-1 text-xs text-ink-500">
                <span>Start: {formatDateTime(season.start_date)}</span>
                <span>End: {formatDateTime(season.end_date)}</span>
              </div>
            </div>
          ))}
          {!seasons.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No seasons scheduled yet.
            </div>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Open Tournaments</h3>
        <p className="section-subtitle">Join active tournaments or review formats.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{tournament.name}</p>
                  <p className="text-xs text-ink-500">{tournament.format} | {tournament.status}</p>
                </div>
                <span className="chip">KES {tournament.entry_fee}</span>
              </div>
              <button className="btn-secondary mt-3" type="button" onClick={() => onJoin(tournament.id)}>
                Join Tournament
              </button>
            </div>
          ))}
          {!tournaments.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No tournaments available yet.
            </div>
          )}
        </div>
      </section>

      {isAdmin && (
        <section className="card p-6">
          <h3 className="section-title">Create Tournament (Admin)</h3>
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onCreate}>
            <div>
              <label className="label">Tournament Name</label>
              <input className="input" value={createForm.name} onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Format</label>
              <select className="input" value={createForm.format} onChange={(e) => setCreateForm((prev) => ({ ...prev, format: e.target.value }))}>
                <option value="league">League</option>
                <option value="knockout">Knockout</option>
                <option value="group">Group</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="label">Entry Fee (KES)</label>
              <input className="input" type="number" value={createForm.entry_fee} onChange={(e) => setCreateForm((prev) => ({ ...prev, entry_fee: e.target.value }))} />
            </div>
            <div>
              <label className="label">Prize Pool (KES)</label>
              <input className="input" type="number" value={createForm.prize_pool} onChange={(e) => setCreateForm((prev) => ({ ...prev, prize_pool: e.target.value }))} />
            </div>
            <div>
              <label className="label">Start Date</label>
              <input className="input" type="date" value={createForm.start_date} onChange={(e) => setCreateForm((prev) => ({ ...prev, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input className="input" type="date" value={createForm.end_date} onChange={(e) => setCreateForm((prev) => ({ ...prev, end_date: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Rules</label>
              <textarea className="input min-h-[120px]" value={createForm.rules} onChange={(e) => setCreateForm((prev) => ({ ...prev, rules: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" type="submit">Create Tournament</button>
            </div>
          </form>
        </section>
      )}

      {isAdmin && (
        <section className="card p-6">
          <h3 className="section-title">Generate Schedule (Admin)</h3>
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSchedule}>
            <div>
              <label className="label">Tournament ID</label>
              <input className="input" value={scheduleForm.tournament_id} onChange={(e) => setScheduleForm((prev) => ({ ...prev, tournament_id: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Start DateTime</label>
              <input className="input" type="datetime-local" value={scheduleForm.start_datetime} onChange={(e) => setScheduleForm((prev) => ({ ...prev, start_datetime: e.target.value }))} />
            </div>
            <div>
              <label className="label">Match Time (HH:MM)</label>
              <input className="input" value={scheduleForm.match_time} onChange={(e) => setScheduleForm((prev) => ({ ...prev, match_time: e.target.value }))} />
            </div>
            <div>
              <label className="label">Days Between Rounds</label>
              <input className="input" type="number" value={scheduleForm.days_between_rounds} onChange={(e) => setScheduleForm((prev) => ({ ...prev, days_between_rounds: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <button className="btn-secondary" type="submit">Generate Fixtures</button>
            </div>
          </form>
        </section>
      )}

      {status.message && (
        <p className={`text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
