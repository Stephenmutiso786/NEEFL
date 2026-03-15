import { useEffect, useState } from 'react';
import { api, getToken } from '../lib/api.js';

export default function AdminSettings() {
  const [settings, setSettings] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [settingForm, setSettingForm] = useState({ key: '', value: '' });
  const [paymentForm, setPaymentForm] = useState({
    paybill: '',
    till: '',
    account_name: '',
    instructions: '',
    manual_only: true
  });
  const [roleForm, setRoleForm] = useState({ user_id: '', role: 'player' });
  const [backupFile, setBackupFile] = useState('');
  const [sponsors, setSponsors] = useState([]);
  const [sponsorForm, setSponsorForm] = useState({ name: '', logo_url: '', website_url: '', position: 0, active: true });
  const [policies, setPolicies] = useState([]);
  const [policyForm, setPolicyForm] = useState({ id: '', slug: '', title: '', category: 'policy', status: 'draft', body: '' });
  const [verifications, setVerifications] = useState([]);
  const [maintenanceForm, setMaintenanceForm] = useState({ enabled: false, end_time: '', message: '' });
  const openSecureFile = async (url) => {
    if (!url) return;
    const token = getToken();
    const base = import.meta.env.VITE_API_BASE || '';
    const targetUrl = url.startsWith('http') ? url : `${base}${url}`;
    try {
      const response = await fetch(targetUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        throw new Error('download_failed');
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      window.open(targetUrl, '_blank', 'noopener');
    }
  };
  const defaultRolePermissions = {
    admin: {
      admin: true,
      staff: true,
      matches: true,
      tournaments: true,
      streams: true,
      betting: true,
      wallet: true,
      community: true,
      messages: true,
      clubs: true,
      disputes: true,
      support: true,
      notifications: true,
      policies: true,
      seasons: true
    },
    player: {
      matches: true,
      tournaments: true,
      streams: true,
      betting: true,
      wallet: true,
      community: true,
      messages: true,
      clubs: true,
      disputes: true,
      support: true,
      notifications: true,
      policies: true,
      seasons: true
    },
    fan: {
      matches: true,
      tournaments: true,
      streams: true,
      betting: true,
      wallet: true,
      community: true,
      messages: true,
      support: true,
      notifications: true,
      policies: true,
      seasons: true
    },
    bettor: {
      matches: true,
      tournaments: true,
      streams: true,
      betting: true,
      wallet: true,
      community: true,
      messages: true,
      support: true,
      notifications: true,
      policies: true,
      seasons: true
    },
    supervisor: {
      staff: true,
      matches: true,
      tournaments: true,
      streams: true,
      disputes: true,
      community: true,
      messages: true,
      support: true,
      notifications: true,
      policies: true,
      seasons: true
    },
    referee: {
      staff: true,
      matches: true,
      streams: true,
      disputes: true,
      community: true,
      messages: true,
      support: true,
      notifications: true,
      policies: true,
      seasons: true
    },
    moderator: {
      staff: true,
      matches: true,
      streams: true,
      disputes: true,
      community: true,
      messages: true,
      support: true,
      notifications: true,
      policies: true,
      seasons: true
    },
    broadcaster: {
      streams: true,
      matches: true,
      tournaments: true,
      messages: true,
      support: true,
      notifications: true,
      policies: true,
      seasons: true
    }
  };
  const permissionModules = [
    { key: 'matches', label: 'Matches' },
    { key: 'tournaments', label: 'Tournaments' },
    { key: 'streams', label: 'Streaming' },
    { key: 'betting', label: 'Betting' },
    { key: 'wallet', label: 'Wallet/Payments' },
    { key: 'community', label: 'Community' },
    { key: 'messages', label: 'Messages' },
    { key: 'clubs', label: 'Clubs' },
    { key: 'disputes', label: 'Disputes' },
    { key: 'staff', label: 'Staff Tools' },
    { key: 'support', label: 'Support' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'policies', label: 'Policies' },
    { key: 'seasons', label: 'Seasons' },
    { key: 'admin', label: 'Admin Center' }
  ];
  const permissionRoles = [
    { key: 'player', label: 'Player' },
    { key: 'fan', label: 'Fan' },
    { key: 'bettor', label: 'Bettor' },
    { key: 'supervisor', label: 'Supervisor' },
    { key: 'referee', label: 'Referee' },
    { key: 'moderator', label: 'Moderator' },
    { key: 'broadcaster', label: 'Broadcaster' },
    { key: 'admin', label: 'Admin' }
  ];
  const [rolePermissions, setRolePermissions] = useState(defaultRolePermissions);

  const load = () => {
    api('/api/admin/settings')
      .then((data) => setSettings(data.settings || []))
      .catch(() => {});
    api('/api/admin/sponsors')
      .then((data) => setSponsors(data.sponsors || []))
      .catch(() => {});
    api('/api/policies')
      .then((data) => setPolicies(data.policies || []))
      .catch(() => {});
    api('/api/verification/admin')
      .then((data) => setVerifications(data.verifications || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!settings.length) return;
    const map = settings.reduce((acc, item) => {
      acc[item.setting_key] = item.setting_value;
      return acc;
    }, {});
    const normalizeDateTime = (value) => {
      if (!value) return '';
      if (value.includes('T')) return value.slice(0, 16);
      if (value.includes(' ')) return value.replace(' ', 'T').slice(0, 16);
      return value;
    };
    setMaintenanceForm({
      enabled: ['1', 'true', 'yes', 'on', 'enabled'].includes(String(map.maintenance_mode || '').toLowerCase()),
      end_time: normalizeDateTime(map.maintenance_end_time || ''),
      message: map.maintenance_message || ''
    });

    const manualRaw = String(map.payment_manual_only || '').toLowerCase();
    const manualOnly = manualRaw ? ['1', 'true', 'yes', 'on', 'enabled'].includes(manualRaw) : true;
    setPaymentForm({
      paybill: map.payment_paybill || '',
      till: map.payment_till || '',
      account_name: map.payment_account_name || '',
      instructions: map.payment_instructions || '',
      manual_only: manualOnly
    });

    if (map.role_permissions) {
      try {
        const parsed = JSON.parse(map.role_permissions);
        const merged = {};
        Object.entries(defaultRolePermissions).forEach(([roleKey, defaults]) => {
          merged[roleKey] = { ...defaults, ...(parsed?.[roleKey] || {}) };
        });
        setRolePermissions(merged);
      } catch {
        setRolePermissions(defaultRolePermissions);
      }
    } else {
      setRolePermissions(defaultRolePermissions);
    }
  }, [settings]);

  const saveSetting = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/admin/settings', {
        method: 'POST',
        body: { key: settingForm.key, value: settingForm.value }
      });
      setStatus({ state: 'success', message: 'Setting saved.' });
      setSettingForm({ key: '', value: '' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const savePaymentSettings = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      const updates = [
        { key: 'payment_paybill', value: paymentForm.paybill || '' },
        { key: 'payment_till', value: paymentForm.till || '' },
        { key: 'payment_account_name', value: paymentForm.account_name || '' },
        { key: 'payment_instructions', value: paymentForm.instructions || '' },
        { key: 'payment_manual_only', value: paymentForm.manual_only ? 'true' : 'false' }
      ];
      await Promise.all(
        updates.map((item) =>
          api('/api/admin/settings', {
            method: 'POST',
            body: item
          })
        )
      );
      setStatus({ state: 'success', message: 'Payment instructions updated.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updateRole = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/users/${roleForm.user_id}/role`, {
        method: 'POST',
        body: { role: roleForm.role }
      });
      setStatus({ state: 'success', message: 'Role updated.' });
      setRoleForm({ user_id: '', role: 'player' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const runBackup = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      const data = await api('/api/admin/backup', { method: 'POST' });
      setBackupFile(data.file);
      setStatus({ state: 'success', message: 'Backup created.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const addSponsor = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/admin/sponsors', {
        method: 'POST',
        body: {
          name: sponsorForm.name,
          logo_url: sponsorForm.logo_url || undefined,
          website_url: sponsorForm.website_url || undefined,
          position: Number(sponsorForm.position || 0),
          active: Boolean(sponsorForm.active)
        }
      });
      setStatus({ state: 'success', message: 'Sponsor added.' });
      setSponsorForm({ name: '', logo_url: '', website_url: '', position: 0, active: true });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const removeSponsor = async (id) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/admin/sponsors/${id}`, { method: 'DELETE' });
      setStatus({ state: 'success', message: 'Sponsor removed.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const savePolicy = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      if (policyForm.id) {
        await api(`/api/policies/${policyForm.id}`, {
          method: 'PUT',
          body: {
            title: policyForm.title,
            category: policyForm.category,
            body: policyForm.body,
            status: policyForm.status
          }
        });
      } else {
        await api('/api/policies', {
          method: 'POST',
          body: {
            slug: policyForm.slug,
            title: policyForm.title,
            category: policyForm.category,
            body: policyForm.body,
            status: policyForm.status
          }
        });
      }
      setStatus({ state: 'success', message: 'Policy saved.' });
      setPolicyForm({ id: '', slug: '', title: '', category: 'policy', status: 'draft', body: '' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const editPolicy = async (id) => {
    setStatus({ state: 'loading', message: '' });
    try {
      const data = await api(`/api/policies/${id}`);
      setPolicyForm({
        id: data.policy.id,
        slug: data.policy.slug,
        title: data.policy.title,
        category: data.policy.category || 'policy',
        status: data.policy.status || 'draft',
        body: data.policy.body || ''
      });
      setStatus({ state: 'success', message: 'Policy loaded for editing.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const deletePolicy = async (id) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/policies/${id}`, { method: 'DELETE' });
      setStatus({ state: 'success', message: 'Policy deleted.' });
      if (String(policyForm.id) === String(id)) {
        setPolicyForm({ id: '', slug: '', title: '', category: 'policy', status: 'draft', body: '' });
      }
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const saveMaintenance = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await Promise.all([
        api('/api/admin/settings', {
          method: 'POST',
          body: { key: 'maintenance_mode', value: maintenanceForm.enabled ? 'true' : 'false' }
        }),
        api('/api/admin/settings', {
          method: 'POST',
          body: { key: 'maintenance_message', value: maintenanceForm.message || '' }
        }),
        api('/api/admin/settings', {
          method: 'POST',
          body: { key: 'maintenance_end_time', value: maintenanceForm.end_time || '' }
        })
      ]);
      setStatus({ state: 'success', message: 'Maintenance settings updated.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const togglePermission = (roleKey, moduleKey) => {
    setRolePermissions((prev) => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey],
        [moduleKey]: !prev[roleKey]?.[moduleKey]
      }
    }));
  };

  const saveRolePermissions = async () => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api('/api/admin/settings', {
        method: 'POST',
        body: {
          key: 'role_permissions',
          value: JSON.stringify(rolePermissions)
        }
      });
      setStatus({ state: 'success', message: 'Role permissions updated.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const reviewVerification = async (id, action) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/verification/admin/${id}/review`, {
        method: 'POST',
        body: { status: action }
      });
      setStatus({ state: 'success', message: 'Verification updated.' });
      load();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h3 className="section-title">Platform Settings</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={saveSetting}>
          <div>
            <label className="label">Key</label>
            <input className="input" value={settingForm.key} onChange={(e) => setSettingForm((prev) => ({ ...prev, key: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Value</label>
            <input className="input" value={settingForm.value} onChange={(e) => setSettingForm((prev) => ({ ...prev, value: e.target.value }))} required />
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Save Setting</button>
          </div>
        </form>
        <div className="mt-4 grid gap-2">
          {settings.map((item) => (
            <div key={item.setting_key} className="rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm">
              <p className="font-semibold text-ink-900">{item.setting_key}</p>
              <p className="text-xs text-ink-500">{item.setting_value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Manual Payment Instructions</h3>
        <p className="section-subtitle">Show players how to pay entry fees manually while you approve entries.</p>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={savePaymentSettings}>
          <div>
            <label className="label">Paybill Number</label>
            <input
              className="input"
              value={paymentForm.paybill}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, paybill: e.target.value }))}
              placeholder="e.g. 123456"
            />
          </div>
          <div>
            <label className="label">Till Number</label>
            <input
              className="input"
              value={paymentForm.till}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, till: e.target.value }))}
              placeholder="e.g. 654321"
            />
          </div>
          <div>
            <label className="label">Account Name / Reference</label>
            <input
              className="input"
              value={paymentForm.account_name}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, account_name: e.target.value }))}
              placeholder="NEEFL Entry Fee"
            />
          </div>
          <div>
            <label className="label">Manual Payments Only</label>
            <select
              className="input"
              value={paymentForm.manual_only ? 'yes' : 'no'}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, manual_only: e.target.value === 'yes' }))}
            >
              <option value="yes">Yes (disable online pay)</option>
              <option value="no">No (allow online pay)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Instructions</label>
            <textarea
              className="input min-h-[120px]"
              value={paymentForm.instructions}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, instructions: e.target.value }))}
              placeholder="Ask players to send the entry fee to your Paybill/Till and include their gamer tag or tournament ID."
            />
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Save Payment Info</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Maintenance Mode</h3>
        <p className="section-subtitle">Pause the platform for upgrades while keeping admin access available.</p>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={saveMaintenance}>
          <div>
            <label className="label">Maintenance Status</label>
            <select
              className="input"
              value={maintenanceForm.enabled ? 'on' : 'off'}
              onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, enabled: e.target.value === 'on' }))}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </div>
          <div>
            <label className="label">End Time</label>
            <input
              className="input"
              type="datetime-local"
              value={maintenanceForm.end_time}
              onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, end_time: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Message</label>
            <textarea
              className="input min-h-[120px]"
              value={maintenanceForm.message}
              onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Upgrading the league experience. Check back soon."
            />
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Save Maintenance</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Role Permissions</h3>
        <p className="section-subtitle">Toggle access by role without code changes. Admin access is always allowed.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="uppercase text-ink-500">
                <th className="py-2 pr-4">Role</th>
                {permissionModules.map((module) => (
                  <th key={module.key} className="py-2 pr-4">{module.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionRoles.map((role) => (
                <tr key={role.key} className="border-t border-sand-200">
                  <td className="py-2 pr-4 text-ink-700">{role.label}</td>
                  {permissionModules.map((module) => (
                    <td key={`${role.key}-${module.key}`} className="py-2 pr-4">
                      <input
                        type="checkbox"
                        checked={Boolean(rolePermissions?.[role.key]?.[module.key])}
                        onChange={() => togglePermission(role.key, module.key)}
                        disabled={role.key === 'admin'}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-secondary" type="button" onClick={saveRolePermissions}>Save Permissions</button>
          <button className="btn-ghost" type="button" onClick={() => setRolePermissions(defaultRolePermissions)}>Reset Defaults</button>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Admin & Staff Roles</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={updateRole}>
          <div>
            <label className="label">User ID</label>
            <input className="input" value={roleForm.user_id} onChange={(e) => setRoleForm((prev) => ({ ...prev, user_id: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={roleForm.role} onChange={(e) => setRoleForm((prev) => ({ ...prev, role: e.target.value }))}>
              <option value="player">Player</option>
              <option value="fan">Fan</option>
              <option value="bettor">Bettor</option>
              <option value="supervisor">Supervisor</option>
              <option value="referee">Referee</option>
              <option value="moderator">Moderator</option>
              <option value="broadcaster">Broadcaster</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-secondary" type="submit">Update Role</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Backup Database</h3>
        <p className="section-subtitle">Creates a SQL dump in the server backups folder.</p>
        <button className="btn-primary mt-4" type="button" onClick={runBackup}>Run Backup</button>
        {backupFile && (
          <p className="mt-3 text-sm text-ink-700">Backup file: {backupFile}</p>
        )}
      </section>

      <section className="card p-6">
        <h3 className="section-title">Sponsors & Ads</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={addSponsor}>
          <div>
            <label className="label">Sponsor Name</label>
            <input className="input" value={sponsorForm.name} onChange={(e) => setSponsorForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Logo URL</label>
            <input className="input" value={sponsorForm.logo_url} onChange={(e) => setSponsorForm((prev) => ({ ...prev, logo_url: e.target.value }))} />
          </div>
          <div>
            <label className="label">Website URL</label>
            <input className="input" value={sponsorForm.website_url} onChange={(e) => setSponsorForm((prev) => ({ ...prev, website_url: e.target.value }))} />
          </div>
          <div>
            <label className="label">Position</label>
            <input className="input" type="number" value={sponsorForm.position} onChange={(e) => setSponsorForm((prev) => ({ ...prev, position: e.target.value }))} />
          </div>
          <div>
            <label className="label">Active</label>
            <select
              className="input"
              value={sponsorForm.active ? 'yes' : 'no'}
              onChange={(e) => setSponsorForm((prev) => ({ ...prev, active: e.target.value === 'yes' }))}
            >
              <option value="yes">Active</option>
              <option value="no">Inactive</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button className="btn-secondary" type="submit">Add Sponsor</button>
          </div>
        </form>
        <div className="mt-4 grid gap-2">
          {sponsors.map((sponsor) => (
            <div key={sponsor.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm">
              <div>
                <p className="font-semibold text-ink-900">{sponsor.name}</p>
                <p className="text-xs text-ink-500">{sponsor.website_url || 'No website'} · {sponsor.active ? 'Active' : 'Inactive'}</p>
              </div>
              <button className="btn-secondary" type="button" onClick={() => removeSponsor(sponsor.id)}>Remove</button>
            </div>
          ))}
          {!sponsors.length && (
            <p className="text-sm text-ink-500">No sponsors added yet.</p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Policy Documents</h3>
        <p className="section-subtitle">Publish the rulebook, terms, privacy, and compliance docs.</p>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={savePolicy}>
          <div>
            <label className="label">Policy ID (leave empty for new)</label>
            <input className="input" value={policyForm.id} onChange={(e) => setPolicyForm((prev) => ({ ...prev, id: e.target.value }))} />
          </div>
          <div>
            <label className="label">Slug</label>
            <input
              className="input"
              value={policyForm.slug}
              onChange={(e) => setPolicyForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="rulebook"
              readOnly={Boolean(policyForm.id)}
            />
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" value={policyForm.title} onChange={(e) => setPolicyForm((prev) => ({ ...prev, title: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={policyForm.category} onChange={(e) => setPolicyForm((prev) => ({ ...prev, category: e.target.value }))} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={policyForm.status} onChange={(e) => setPolicyForm((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Body</label>
            <textarea className="input min-h-[180px]" value={policyForm.body} onChange={(e) => setPolicyForm((prev) => ({ ...prev, body: e.target.value }))} required />
          </div>
          <div className="md:col-span-2">
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" type="submit">Save Policy</button>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => setPolicyForm({ id: '', slug: '', title: '', category: 'policy', status: 'draft', body: '' })}
              >
                Clear
              </button>
            </div>
          </div>
        </form>
        <div className="mt-4 grid gap-2">
          {policies.map((policy) => (
            <div key={policy.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm">
              <div>
                <p className="font-semibold text-ink-900">{policy.title}</p>
                <p className="text-xs text-ink-500">ID {policy.id} · {policy.slug} · {policy.status}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" type="button" onClick={() => editPolicy(policy.id)}>Edit</button>
                <button className="btn-ghost" type="button" onClick={() => deletePolicy(policy.id)}>Delete</button>
              </div>
            </div>
          ))}
          {!policies.length && (
            <p className="text-sm text-ink-500">No policies added yet.</p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">KYC Verifications</h3>
        <p className="section-subtitle">Review identity submissions for payouts and betting compliance.</p>
        <div className="mt-4 grid gap-3">
          {verifications.map((item) => (
            <div key={item.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm">
              <p className="font-semibold text-ink-900">{item.full_name} · {item.gamer_tag || `User ${item.user_id}`}</p>
              <p className="text-xs text-ink-500">{item.id_type} · {item.id_number} · {item.country}</p>
              <p className="text-xs text-ink-500">Status: {item.status}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-mint-700">
                {item.document_front_url && (
                  <button type="button" className="underline" onClick={() => openSecureFile(item.document_front_url)}>Front Scan</button>
                )}
                {item.document_back_url && (
                  <button type="button" className="underline" onClick={() => openSecureFile(item.document_back_url)}>Back Scan</button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-secondary" type="button" onClick={() => reviewVerification(item.id, 'approved')}>Approve</button>
                <button className="btn-secondary" type="button" onClick={() => reviewVerification(item.id, 'rejected')}>Reject</button>
              </div>
            </div>
          ))}
          {!verifications.length && (
            <p className="text-sm text-ink-500">No pending verifications.</p>
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
