import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    gamer_tag: '',
    real_name: '',
    country: '',
    region: '',
    preferred_team: ''
  });
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [verify, setVerify] = useState({ type: 'email', token: '' });
  const [verifyStatus, setVerifyStatus] = useState({ state: 'idle', message: '' });
  const [kyc, setKyc] = useState(null);
  const [kycForm, setKycForm] = useState({
    full_name: '',
    id_type: 'national_id',
    id_number: '',
    country: '',
    date_of_birth: '',
    phone: '',
    document_url: ''
  });
  const [kycStatus, setKycStatus] = useState({ state: 'idle', message: '' });
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    api('/api/players/me')
      .then((data) => {
        setProfile(data.player);
        setForm({
          gamer_tag: data.player.gamer_tag || '',
          real_name: data.player.real_name || '',
          country: data.player.country || '',
          region: data.player.region || '',
          preferred_team: data.player.preferred_team || ''
        });
      })
      .catch((err) => {
        setStatus({ state: 'error', message: err.message });
      });

    api('/api/verification/me')
      .then((data) => {
        setKyc(data.verification);
        if (data.verification) {
          setKycForm({
            full_name: data.verification.full_name || '',
            id_type: data.verification.id_type || 'national_id',
            id_number: data.verification.id_number || '',
            country: data.verification.country || '',
            date_of_birth: data.verification.date_of_birth || '',
            phone: data.verification.phone || '',
            document_url: data.verification.document_url || ''
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    api(`/api/achievements/players/${profile.id}`, { auth: false })
      .then((data) => setAchievements(data.achievements || []))
      .catch(() => {});
  }, [profile?.id]);

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onUpdate = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/players/me', { method: 'PUT', body: form });
      setStatus({ state: 'success', message: 'Profile updated.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const requestVerification = async () => {
    setVerifyStatus({ state: 'loading', message: '' });
    try {
      await api('/api/auth/request-verification', { method: 'POST', body: { type: verify.type } });
      setVerifyStatus({ state: 'success', message: 'Verification code sent.' });
    } catch (err) {
      setVerifyStatus({ state: 'error', message: err.message });
    }
  };

  const confirmVerification = async (event) => {
    event.preventDefault();
    setVerifyStatus({ state: 'loading', message: '' });
    try {
      await api('/api/auth/confirm-verification', {
        method: 'POST',
        body: { type: verify.type, token: verify.token }
      });
      setVerifyStatus({ state: 'success', message: 'Verification confirmed.' });
    } catch (err) {
      setVerifyStatus({ state: 'error', message: err.message });
    }
  };

  const submitKyc = async (event) => {
    event.preventDefault();
    setKycStatus({ state: 'loading', message: '' });
    try {
      await api('/api/verification/me', { method: 'POST', body: kycForm });
      setKycStatus({ state: 'success', message: 'Verification submitted. Awaiting approval.' });
      const data = await api('/api/verification/me');
      setKyc(data.verification);
      const profileData = await api('/api/players/me');
      setProfile(profileData.player);
    } catch (err) {
      setKycStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Player Profile</h3>
        <p className="section-subtitle">Manage your public profile and stats.</p>
        {profile && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Rank Points</p>
              <p className="mt-2 text-lg font-semibold">{profile.rank_points}</p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Record</p>
              <p className="mt-2 text-sm text-ink-700">
                {profile.wins} wins / {profile.losses} losses
              </p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="label">Goals</p>
              <p className="mt-2 text-lg font-semibold">{profile.goals_scored}</p>
            </div>
          </div>
        )}
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onUpdate}>
          <div>
            <label className="label">Gamer Tag</label>
            <input className="input" value={form.gamer_tag} onChange={onChange('gamer_tag')} />
          </div>
          <div>
            <label className="label">Real Name</label>
            <input className="input" value={form.real_name} onChange={onChange('real_name')} />
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input" value={form.country} onChange={onChange('country')} />
          </div>
          <div>
            <label className="label">Region</label>
            <input className="input" value={form.region} onChange={onChange('region')} />
          </div>
          <div>
            <label className="label">Preferred Team</label>
            <input className="input" value={form.preferred_team} onChange={onChange('preferred_team')} />
          </div>
          <div className="flex items-end">
            <button className="btn-primary" type="submit" disabled={status.state === 'loading'}>
              {status.state === 'loading' ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
        {status.message && (
          <p className={`mt-2 text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
            {status.message}
          </p>
        )}
      </section>

      <section className="card p-6">
        <h3 className="section-title">Verification</h3>
        <p className="section-subtitle">Send and confirm verification codes.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={verify.type}
              onChange={(event) => setVerify((prev) => ({ ...prev, type: event.target.value }))}
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-secondary" type="button" onClick={requestVerification}>
              Send Code
            </button>
          </div>
        </div>
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={confirmVerification}>
          <div>
            <label className="label">Code</label>
            <input
              className="input"
              value={verify.token}
              onChange={(event) => setVerify((prev) => ({ ...prev, token: event.target.value }))}
              placeholder="Enter code"
            />
          </div>
          <div className="flex items-end">
            <button className="btn-primary" type="submit">Confirm</button>
          </div>
        </form>
        {verifyStatus.message && (
          <p className={`mt-2 text-sm ${verifyStatus.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
            {verifyStatus.message}
          </p>
        )}
      </section>

      <section className="card p-6">
        <h3 className="section-title">Identity Verification (KYC)</h3>
        <p className="section-subtitle">Required for withdrawals and prize payouts.</p>
        {profile?.kyc_status && (
          <p className="mt-2 text-xs text-ink-500">Status: {profile.kyc_status}</p>
        )}
        {kyc?.status && (
          <p className="mt-1 text-xs text-ink-500">Submission: {kyc.status}</p>
        )}
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submitKyc}>
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={kycForm.full_name} onChange={(e) => setKycForm((prev) => ({ ...prev, full_name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">ID Type</label>
            <select className="input" value={kycForm.id_type} onChange={(e) => setKycForm((prev) => ({ ...prev, id_type: e.target.value }))}>
              <option value="national_id">National ID</option>
              <option value="passport">Passport</option>
              <option value="drivers_license">Driver's License</option>
            </select>
          </div>
          <div>
            <label className="label">ID Number</label>
            <input className="input" value={kycForm.id_number} onChange={(e) => setKycForm((prev) => ({ ...prev, id_number: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input" value={kycForm.country} onChange={(e) => setKycForm((prev) => ({ ...prev, country: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input className="input" type="date" value={kycForm.date_of_birth} onChange={(e) => setKycForm((prev) => ({ ...prev, date_of_birth: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={kycForm.phone} onChange={(e) => setKycForm((prev) => ({ ...prev, phone: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Document URL (scan/photo)</label>
            <input className="input" value={kycForm.document_url} onChange={(e) => setKycForm((prev) => ({ ...prev, document_url: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <button className="btn-primary" type="submit" disabled={kycStatus.state === 'loading'}>
              {kycStatus.state === 'loading' ? 'Submitting...' : 'Submit Verification'}
            </button>
          </div>
        </form>
        {kycStatus.message && (
          <p className={`mt-2 text-sm ${kycStatus.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
            {kycStatus.message}
          </p>
        )}
      </section>

      <section className="card p-6">
        <h3 className="section-title">Achievements & Badges</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {achievements.map((item) => (
            <div key={item.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm">
              <p className="font-semibold text-ink-900">{item.name}</p>
              <p className="text-xs text-ink-500">{item.description || 'Achievement unlocked.'}</p>
            </div>
          ))}
          {!achievements.length && (
            <p className="text-sm text-ink-500">No achievements yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
