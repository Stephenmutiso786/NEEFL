import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import TopNav from './TopNav.jsx';
import { api, getToken, getUserRole } from '../lib/api.js';
import MaintenancePage from '../pages/MaintenancePage.jsx';
import { PermissionsProvider } from '../context/PermissionsContext.jsx';

export default function Layout() {
  const token = getToken();
  const role = getUserRole();
  const location = useLocation();
  const [maintenance, setMaintenance] = useState({ checked: false, enabled: false, message: '', end_time: null });

  useEffect(() => {
    if (!token) return;
    api('/api/social/presence/ping', { method: 'POST' }).catch(() => {});
    const interval = setInterval(() => {
      api('/api/social/presence/ping', { method: 'POST' }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    let mounted = true;
    api('/api/public/maintenance', { auth: false })
      .then((data) => {
        if (!mounted) return;
        setMaintenance({
          checked: true,
          enabled: Boolean(data.enabled),
          message: data.message || '',
          end_time: data.end_time || null
        });
      })
      .catch(() => {
        if (!mounted) return;
        setMaintenance((prev) => ({ ...prev, checked: true }));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const maintenanceBypass = ['/admin/login', '/login', '/auth/login', '/auth/reset'].includes(location.pathname);
  if (maintenance.checked && maintenance.enabled && role !== 'admin' && !maintenanceBypass) {
    return <MaintenancePage message={maintenance.message} endTime={maintenance.end_time} />;
  }

  return (
    <PermissionsProvider>
      <div className={`min-h-screen ${token ? 'lg:grid lg:grid-cols-[280px_1fr]' : ''}`}>
        {token && (
          <div className="hidden lg:block">
            <Sidebar />
          </div>
        )}
        <main className="min-h-screen">
          <header className="sticky top-0 z-20 border-b border-sand-200 bg-sand-100/85 px-6 py-4 backdrop-blur md:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-sand-200 bg-sand-50 text-lg font-semibold text-sun-500 shadow-[0_0_18px_rgba(245,197,66,0.35)]">
                  N
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-ink-500">NEEFL Arena</p>
                  <h2 className="text-3xl font-semibold text-ink-900">eFootball League Hub</h2>
                </div>
              </div>
              <TopNav />
            </div>
          </header>
          <div className="page">
            <Outlet />
          </div>
        </main>
      </div>
    </PermissionsProvider>
  );
}
