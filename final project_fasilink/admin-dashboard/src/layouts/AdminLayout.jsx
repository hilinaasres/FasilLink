import { useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/ui/Sidebar';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(true);
  const navigate = useNavigate();

  const profileLabel = useMemo(() => {
    if (!user) return 'Admin';
    return `${user.name} • ${user.adminRole || user.admin_role || 'ADMIN'}`;
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="lg:flex">
        <Sidebar
          collapsed={collapsed}
          hidden={sidebarHidden}
          onToggle={() => setCollapsed((value) => !value)}
          onClose={() => setSidebarHidden(true)}
          onLogout={() => { logout(); navigate('/login'); }}
        />
        {!sidebarHidden && (
          <div
            className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarHidden(true)}
          />
        )}
        <main className="flex-1 p-4 sm:p-5 lg:p-6 transition-all duration-300">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-6 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setSidebarHidden(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-3xl border border-slate-800/90 bg-slate-950/80 text-slate-300 transition hover:border-sky-400/30 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/notifications')}
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-3xl border border-slate-800/90 bg-slate-950/80 text-slate-300 transition hover:border-sky-400/30 hover:text-white"
                >
                  <span className="absolute -right-1 top-1 inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 shadow-glow" />
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 1 1-6 0h6z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-3 rounded-3xl border border-slate-800/90 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 transition hover:border-sky-400/30"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800/90 text-sky-300">F</span>
                  <span className="text-left">
                    <span className="block text-sm font-semibold text-white">Admin User</span>
                    <span className="block text-xs text-slate-500">Super Admin</span>
                  </span>
                </button>
              </div>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
