import { useState } from 'react';
import { api, setToken, getUserRole } from '../lib/api.js';
import { useNavigate } from 'react-router-dom';

export default function AuthRegister() {
  const [form, setForm] = useState({
    email: '',
    phone: '',
    password: '',
    confirm: '',
    gamer_tag: '',
    real_name: '',
    country: '',
    region: '',
    preferred_team: '',
    role: 'player'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const navigate = useNavigate();

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirm) {
      setStatus({ state: 'error', message: 'Passwords do not match.' });
      return;
    }
    setStatus({ state: 'loading', message: '' });
    try {
      const payload = {
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
        gamer_tag: form.gamer_tag,
        real_name: form.real_name || undefined,
        country: form.country || undefined,
        region: form.region || undefined,
        preferred_team: form.preferred_team || undefined,
        role: form.role
      };
      const data = await api('/api/auth/register', { method: 'POST', body: payload, auth: false });
      if (data?.token) {
        setToken(data.token);
      }
      setStatus({ state: 'success', message: 'Registration complete. Token saved.' });
      const role = getUserRole();
      if (role === 'fan') {
        navigate('/fan/dashboard');
      } else if (role === 'bettor') {
        navigate('/bettor/dashboard');
      } else if (role === 'supervisor' || role === 'referee') {
        navigate('/staff');
      } else {
        navigate('/player/dashboard');
      }
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="card p-6">
      <h3 className="section-title">Register</h3>
      <p className="section-subtitle">Create a player, fan, bettor, supervisor, or referee account. Approval required.</p>
      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <div>
          <label className="label">Gamer Tag</label>
          <input className="input" value={form.gamer_tag} onChange={onChange('gamer_tag')} required />
        </div>
        <div>
          <label className="label">Real Name (optional)</label>
          <input className="input" value={form.real_name} onChange={onChange('real_name')} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={onChange('email')} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" type="tel" value={form.phone} onChange={onChange('phone')} />
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
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={onChange('role')}>
            <option value="player">Player</option>
            <option value="fan">Fan</option>
            <option value="bettor">Bettor</option>
            <option value="supervisor">Supervisor</option>
            <option value="referee">Referee</option>
          </select>
          <p className="mt-1 text-xs text-ink-500">Moderator and broadcaster roles are assigned by admins.</p>
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              className="input pr-12"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={onChange('password')}
              required
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-500"
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-500">Use upper/lowercase, number, and symbol.</p>
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <div className="relative">
            <input
              className="input pr-12"
              type={showConfirm ? 'text' : 'password'}
              value={form.confirm}
              onChange={onChange('confirm')}
              required
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-500"
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
            >
              {showConfirm ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className="md:col-span-2">
          <button className="btn-primary" type="submit" disabled={status.state === 'loading'}>
            {status.state === 'loading' ? 'Creating...' : 'Register'}
          </button>
        </div>
        {status.message && (
          <p className={`text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'} md:col-span-2`}>
            {status.message}
          </p>
        )}
      </form>
    </div>
  );
}
