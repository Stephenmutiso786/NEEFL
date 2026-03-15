import { useState } from 'react';
import { api, clearToken, setToken } from '../lib/api.js';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '', security_code: '', remember_me: false });
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
        password: form.password,
        security_code: form.security_code || undefined,
        remember_me: Boolean(form.remember_me)
      };
      const data = await api('/api/auth/login', { method: 'POST', body: payload, auth: false });
      if (data?.token) {
        setToken(data.token, { persist: Boolean(form.remember_me) });
      }
      await api('/api/admin/dashboard');
      setForm((prev) => ({ ...prev, password: '' }));
      setStatus({ state: 'success', message: 'Admin access granted.' });
      navigate('/admin');
    } catch (err) {
      clearToken();
      setForm((prev) => ({ ...prev, password: '' }));
      setStatus({ state: 'error', message: err.message || 'Login failed.' });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="card p-6">
        <h3 className="section-title">Admin Login</h3>
        <p className="section-subtitle">Secure access to platform controls.</p>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit} autoComplete="off">
          <div>
            <label className="label">Email / Username</label>
            <input className="input" type="text" value={form.email} onChange={onChange('email')} required autoComplete="off" />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                className="input pr-12"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={onChange('password')}
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
          <div>
            <label className="label">Security Code (if enabled)</label>
            <input className="input" value={form.security_code} onChange={onChange('security_code')} placeholder="Optional" />
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
          <Link className="text-sm text-ink-500" to="/auth/reset">Forgot Password?</Link>
          {status.message && (
            <p className={`text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
              {status.message}
            </p>
          )}
        </form>
      </div>
      <div className="card p-6">
        <h3 className="card-title">Security Controls</h3>
        <ul className="mt-4 space-y-2 text-sm text-ink-700">
          <li>1. Rate limits block brute-force attempts.</li>
          <li>2. Accounts lock after repeated failed logins.</li>
          <li>3. Optional security code can be enforced.</li>
        </ul>
      </div>
    </div>
  );
}
