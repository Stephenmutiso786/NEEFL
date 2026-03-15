import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function AdminTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [entriesTournamentId, setEntriesTournamentId] = useState('');
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [createForm, setCreateForm] = useState({
    name: '',
    format: 'league',
    entry_fee: 0,
    prize_pool: 0,
    rules: '',
    start_date: '',
    end_date: '',
    season_id: ''
  });
  const [updateForm, setUpdateForm] = useState({
    id: '',
    name: '',
    format: 'league',
    entry_fee: '',
    prize_pool: '',
    rules: '',
    start_date: '',
    end_date: '',
    status: 'open'
  });
  const [scheduleForm, setScheduleForm] = useState({ id: '', start_datetime: '', match_time: '18:00', days_between_rounds: 1 });
  const [seasonForm, setSeasonForm] = useState({ name: '', start_date: '', end_date: '', status: 'draft' });
  const [seasonUpdateForm, setSeasonUpdateForm] = useState({ id: '', name: '', start_date: '', end_date: '', status: 'draft' });

  const load = () => {
    api('/api/admin/tournaments')
      .then((data) => setTournaments(data.tournaments || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
    api('/api/seasons', { auth: false })
      .then((data) => setSeasons(data.seasons || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const createTournament = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/tournaments', {
        method: 'POST',
        body: {
          ...createForm,
          entry_fee: Number(createForm.entry_fee),
          prize_pool: Number(createForm.prize_pool),
          season_id: createForm.season_id ? Number(createForm.season_id) : undefined
        }
      });
      setStatus({ state: 'success', message: 'Tournament created.' });
      setCreateForm({ name: '', format: 'league', entry_fee: 0, prize_pool: 0, rules: '', start_date: '', end_date: '', season_id: '' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updateTournament = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/tournaments/${updateForm.id}`, {
        method: 'PUT',
        body: {
          status: updateForm.status || undefined,
          name: updateForm.name || undefined,
          format: updateForm.format || undefined,
          entry_fee: updateForm.entry_fee ? Number(updateForm.entry_fee) : undefined,
          prize_pool: updateForm.prize_pool ? Number(updateForm.prize_pool) : undefined,
          rules: updateForm.rules || undefined,
          start_date: updateForm.start_date || undefined,
          end_date: updateForm.end_date || undefined
        }
      });
      setStatus({ state: 'success', message: 'Tournament updated.' });
      setUpdateForm({ id: '', name: '', format: 'league', entry_fee: '', prize_pool: '', rules: '', start_date: '', end_date: '', status: 'open' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const deleteTournament = async (id) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/tournaments/${id}`, { method: 'DELETE' });
      setStatus({ state: 'success', message: 'Tournament deleted.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const scheduleMatches = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/tournaments/${scheduleForm.id}/schedule`, {
        method: 'POST',
        body: {
          start_datetime: scheduleForm.start_datetime || undefined,
          match_time: scheduleForm.match_time || undefined,
          days_between_rounds: Number(scheduleForm.days_between_rounds)
        }
      });
      setStatus({ state: 'success', message: 'Fixtures scheduled.' });
      setScheduleForm({ id: '', start_datetime: '', match_time: '18:00', days_between_rounds: 1 });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const loadEntries = async (tournamentId) => {
    const id = tournamentId || entriesTournamentId;
    if (!id) return;
    setStatus({ state: 'loading', message: '' });
    try {
      const data = await api(`/api/admin/tournaments/${id}/entries`);
      setEntries(data.entries || []);
      setStatus({ state: 'success', message: `Loaded ${data.entries?.length || 0} entries.` });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updateEntryStatus = async (entryId, nextStatus) => {
    if (!entryId) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/tournament-entries/${entryId}/status`, {
        method: 'POST',
        body: { status: nextStatus }
      });
      setStatus({ state: 'success', message: `Entry updated (${nextStatus}).` });
      loadEntries();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const createSeason = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/seasons', {
        method: 'POST',
        body: seasonForm
      });
      setStatus({ state: 'success', message: 'Season created.' });
      setSeasonForm({ name: '', start_date: '', end_date: '', status: 'draft' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updateSeason = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/seasons/${seasonUpdateForm.id}`, {
        method: 'PUT',
        body: {
          name: seasonUpdateForm.name || undefined,
          start_date: seasonUpdateForm.start_date || undefined,
          end_date: seasonUpdateForm.end_date || undefined,
          status: seasonUpdateForm.status || undefined
        }
      });
      setStatus({ state: 'success', message: 'Season updated.' });
      setSeasonUpdateForm({ id: '', name: '', start_date: '', end_date: '', status: 'draft' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Create Tournament</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={createTournament}>
          <div>
            <label className="label">Name</label>
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
            <label className="label">Season (optional)</label>
            <select className="input" value={createForm.season_id} onChange={(e) => setCreateForm((prev) => ({ ...prev, season_id: e.target.value }))}>
              <option value="">No season</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>{season.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Entry Fee</label>
            <input className="input" type="number" value={createForm.entry_fee} onChange={(e) => setCreateForm((prev) => ({ ...prev, entry_fee: e.target.value }))} />
          </div>
          <div>
            <label className="label">Prize Pool</label>
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

      <section className="card p-6">
        <h3 className="section-title">Season Management</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <form className="grid gap-4" onSubmit={createSeason}>
            <h4 className="card-title">Create Season</h4>
            <div>
              <label className="label">Name</label>
              <input className="input" value={seasonForm.name} onChange={(e) => setSeasonForm((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Start Date</label>
              <input className="input" type="date" value={seasonForm.start_date} onChange={(e) => setSeasonForm((prev) => ({ ...prev, start_date: e.target.value }))} required />
            </div>
            <div>
              <label className="label">End Date</label>
              <input className="input" type="date" value={seasonForm.end_date} onChange={(e) => setSeasonForm((prev) => ({ ...prev, end_date: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={seasonForm.status} onChange={(e) => setSeasonForm((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button className="btn-secondary" type="submit">Create Season</button>
          </form>

          <form className="grid gap-4" onSubmit={updateSeason}>
            <h4 className="card-title">Update Season</h4>
            <div>
              <label className="label">Season ID</label>
              <input className="input" value={seasonUpdateForm.id} onChange={(e) => setSeasonUpdateForm((prev) => ({ ...prev, id: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Name</label>
              <input className="input" value={seasonUpdateForm.name} onChange={(e) => setSeasonUpdateForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Start Date</label>
              <input className="input" type="date" value={seasonUpdateForm.start_date} onChange={(e) => setSeasonUpdateForm((prev) => ({ ...prev, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input className="input" type="date" value={seasonUpdateForm.end_date} onChange={(e) => setSeasonUpdateForm((prev) => ({ ...prev, end_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={seasonUpdateForm.status} onChange={(e) => setSeasonUpdateForm((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button className="btn-secondary" type="submit">Update Season</button>
          </form>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {seasons.map((season) => (
            <div key={season.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm">
              <p className="font-semibold text-ink-900">{season.name}</p>
              <p className="text-xs text-ink-500">{season.start_date} → {season.end_date} · {season.status}</p>
            </div>
          ))}
          {!seasons.length && (
            <p className="text-sm text-ink-500">No seasons created yet.</p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Manage Tournaments</h3>
        <div className="mt-4 grid gap-3">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink-900">{tournament.name}</p>
                  <p className="text-xs text-ink-500">
                    {tournament.format} | {tournament.status}
                    {tournament.start_date ? ` · ${tournament.start_date}` : ''}
                    {tournament.end_date ? ` → ${tournament.end_date}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => {
                      setUpdateForm({
                        id: String(tournament.id),
                        name: tournament.name || '',
                        format: tournament.format || 'league',
                        entry_fee: tournament.entry_fee ?? '',
                        prize_pool: tournament.prize_pool ?? '',
                        rules: tournament.rules || '',
                        start_date: tournament.start_date || '',
                        end_date: tournament.end_date || '',
                        status: tournament.status || 'open'
                      });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => {
                      setScheduleForm((prev) => ({ ...prev, id: String(tournament.id) }));
                      window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' });
                    }}
                  >
                    Schedule
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => {
                      setEntriesTournamentId(String(tournament.id));
                      setEntries([]);
                      loadEntries(String(tournament.id));
                    }}
                  >
                    Entries
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => deleteTournament(tournament.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!tournaments.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No tournaments yet.
            </div>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Edit Tournament</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={updateTournament}>
          <div>
            <label className="label">Tournament ID</label>
            <input className="input" value={updateForm.id} onChange={(e) => setUpdateForm((prev) => ({ ...prev, id: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={updateForm.name} onChange={(e) => setUpdateForm((prev) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Format</label>
            <select className="input" value={updateForm.format} onChange={(e) => setUpdateForm((prev) => ({ ...prev, format: e.target.value }))}>
              <option value="league">League</option>
              <option value="knockout">Knockout</option>
              <option value="group">Group</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="label">Entry Fee</label>
            <input className="input" type="number" value={updateForm.entry_fee} onChange={(e) => setUpdateForm((prev) => ({ ...prev, entry_fee: e.target.value }))} />
          </div>
          <div>
            <label className="label">Prize Pool</label>
            <input className="input" type="number" value={updateForm.prize_pool} onChange={(e) => setUpdateForm((prev) => ({ ...prev, prize_pool: e.target.value }))} />
          </div>
          <div>
            <label className="label">Start Date</label>
            <input className="input" type="date" value={updateForm.start_date} onChange={(e) => setUpdateForm((prev) => ({ ...prev, start_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input className="input" type="date" value={updateForm.end_date} onChange={(e) => setUpdateForm((prev) => ({ ...prev, end_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={updateForm.status} onChange={(e) => setUpdateForm((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="label">Rules</label>
            <textarea className="input min-h-[120px]" value={updateForm.rules} onChange={(e) => setUpdateForm((prev) => ({ ...prev, rules: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <button className="btn-secondary" type="submit">Update</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Schedule Matches</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={scheduleMatches}>
          <div>
            <label className="label">Tournament ID</label>
            <input className="input" value={scheduleForm.id} onChange={(e) => setScheduleForm((prev) => ({ ...prev, id: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Start DateTime</label>
            <input className="input" type="datetime-local" value={scheduleForm.start_datetime} onChange={(e) => setScheduleForm((prev) => ({ ...prev, start_datetime: e.target.value }))} />
          </div>
          <div>
            <label className="label">Match Time</label>
            <input className="input" value={scheduleForm.match_time} onChange={(e) => setScheduleForm((prev) => ({ ...prev, match_time: e.target.value }))} />
          </div>
          <div>
            <label className="label">Days Between Rounds</label>
            <input className="input" type="number" value={scheduleForm.days_between_rounds} onChange={(e) => setScheduleForm((prev) => ({ ...prev, days_between_rounds: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Schedule Fixtures</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Tournament Entries</h3>
        <p className="section-subtitle">Approve or mark paid entries before scheduling fixtures.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <select
            className="input"
            value={entriesTournamentId}
            onChange={(e) => {
              setEntriesTournamentId(e.target.value);
              setEntries([]);
            }}
          >
            <option value="">Select tournament</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (ID {t.id})
              </option>
            ))}
          </select>
          <button className="btn-secondary" type="button" onClick={() => loadEntries()}>
            Load Entries
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {entries.map((entry) => (
            <div key={entry.id} className="scoreboard">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink-900">{entry.gamer_tag || `User ${entry.player_id}`}</p>
                  <p className="text-xs text-ink-500">{entry.email || entry.phone || 'No contact'}</p>
                  <p className="text-xs text-ink-500">Status: {entry.status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={entry.status === 'approved'}
                    onClick={() => updateEntryStatus(entry.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={entry.status === 'paid'}
                    onClick={() => updateEntryStatus(entry.id, 'paid')}
                  >
                    Mark Paid
                  </button>
                  <button
                    className="btn-ghost"
                    type="button"
                    disabled={entry.status === 'withdrawn'}
                    onClick={() => updateEntryStatus(entry.id, 'withdrawn')}
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!entriesTournamentId && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              Select a tournament to manage entries.
            </div>
          )}
          {entriesTournamentId && !entries.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No entries found for this tournament.
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
