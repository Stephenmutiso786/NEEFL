import { useState } from 'react';
import { api, setToken, getUserRole } from '../lib/api.js';
import { Link, useNavigate } from 'react-router-dom';

export default function AuthLogin() {
  const [form, setForm] = useState({ email: '', phone: '', password: '', remember_me: false });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const navigate = useNavigate();

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      const payload = {
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
        remember_me: Boolean(form.remember_me)
      };
      const data = await api('/api/auth/login', { method: 'POST', body: payload, auth: false });
      if (data?.token) {
        setToken(data.token, { persist: Boolean(form.remember_me) });
      }
      setForm((prev) => ({ ...prev, password: '' }));
      setStatus({ state: 'success', message: 'Login successful. Token saved.' });
      const role = getUserRole();
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'supervisor' || role === 'referee' || role === 'moderator') {
        navigate('/staff');
      } else if (role === 'broadcaster') {
        navigate('/broadcaster');
      } else if (role === 'fan') {
        navigate('/fan/dashboard');
      } else if (role === 'bettor') {
        navigate('/bettor/dashboard');
      } else {
        navigate('/player/dashboard');
      }
    } catch (err) {
      setForm((prev) => ({ ...prev, password: '' }));
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="card p-6">
        <h3 className="section-title">Login</h3>
        <p className="section-subtitle">Players, fans, bettors, moderators, broadcasters, and referees sign in here.</p>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit} autoComplete="off">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={onChange('email')} placeholder="player@email.com" autoComplete="off" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" type="tel" value={form.phone} onChange={onChange('phone')} placeholder="2547XXXXXXXX" autoComplete="off" />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                className="input pr-12"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={onChange('password')}
                placeholder="********"
                autoComplete="new-password"
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
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-mint-500"
              checked={Boolean(form.remember_me)}
              onChange={(event) => setForm((prev) => ({ ...prev, remember_me: event.target.checked }))}
            />
            Remember me for 30 days
          </label>
          <button className="btn-primary" type="submit" disabled={status.state === 'loading'}>
            {status.state === 'loading' ? 'Signing in...' : 'Login'}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link className="text-ink-500 hover:text-ink-700" to="/auth/reset">Forgot Password?</Link>
            <Link className="text-ink-500 hover:text-ink-700" to="/admin/login">Admin Login</Link>
          </div>
          {status.message && (
            <p className={`text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
              {status.message}
            </p>
          )}
        </form>
      </div>
      <div className="card p-6">
        <h3 className="card-title">Login Requirements</h3>
        <ul className="mt-4 space-y-2 text-sm text-ink-700">
          <li>1. Use email or phone with your password.</li>
          <li>2. Accounts are approved by an admin before access.</li>
          <li>3. Admins sign in on the admin login page.</li>
        </ul>
      </div>
    </div>
  );
}
