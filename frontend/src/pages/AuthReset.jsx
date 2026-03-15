import { useState } from 'react';
import { api } from '../lib/api.js';

export default function AuthReset() {
  const [form, setForm] = useState({ email: '', phone: '' });
  const [resetForm, setResetForm] = useState({ token: '', new_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/auth/request-password-reset', {
        method: 'POST',
        body: {
          email: form.email || undefined,
          phone: form.phone || undefined
        },
        auth: false
      });
      setStatus({ state: 'success', message: 'Reset code sent if the account exists.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const onResetPassword = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token: resetForm.token,
          new_password: resetForm.new_password
        },
        auth: false
      });
      setStatus({ state: 'success', message: 'Password updated successfully.' });
      setResetForm({ token: '', new_password: '' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Request Reset Code</h3>
        <p className="section-subtitle">Send a reset code to your email or phone.</p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={onChange('email')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" type="tel" value={form.phone} onChange={onChange('phone')} />
          </div>
          <div className="md:col-span-2">
            <button className="btn-primary" type="submit" disabled={status.state === 'loading'}>
              {status.state === 'loading' ? 'Sending...' : 'Send Reset Code'}
            </button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Reset Password</h3>
        <p className="section-subtitle">Enter the code you received and set a new password.</p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onResetPassword}>
          <div>
            <label className="label">Reset Code</label>
            <input className="input" value={resetForm.token} onChange={(e) => setResetForm((prev) => ({ ...prev, token: e.target.value }))} required />
          </div>
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                className="input pr-12"
                type={showPassword ? 'text' : 'password'}
                value={resetForm.new_password}
                onChange={(e) => setResetForm((prev) => ({ ...prev, new_password: e.target.value }))}
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
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Reset Password</button>
          </div>
        </form>
        {status.message && (
          <p className={`mt-2 text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
            {status.message}
          </p>
        )}
      </section>
    </div>
  );
}
