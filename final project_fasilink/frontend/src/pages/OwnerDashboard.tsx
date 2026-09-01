import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBadge from '../components/NotificationBadge';
import { useMessageNotifications } from '../hooks/useMessageNotifications';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Box,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  PlusCircle,
  Shield,
  User2,
} from 'lucide-react';

const DARK_MODE_STORAGE_KEY = 'app_dark_mode';

const OwnerDashboard: React.FC = () => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/seller') ? '/seller' : '/owner';

  const navItems = [
    { to: basePath, label: 'Overview', Icon: LayoutDashboard, end: true },
    { to: `${basePath}/add`, label: 'Add Item', Icon: PlusCircle },
    { to: `${basePath}/manage`, label: 'Manage Items', Icon: Box },
    { to: `${basePath}/chat`, label: 'Chat', Icon: MessageCircle },
    { to: `${basePath}/profile`, label: 'Profile', Icon: User2 },
    { to: `${basePath}/security`, label: 'Security Settings', Icon: Shield },
  ];
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(DARK_MODE_STORAGE_KEY) || 'false');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.body.classList.toggle('dark', isDarkMode);
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(isDarkMode));
  }, [isDarkMode]);

  const { user } = useAuth();
  const { unreadCount: unreadMessages } = useMessageNotifications();

  const renderNavLabel = (label: string, showBadge: boolean) => (
    <span className="flex w-full items-center justify-between gap-2">
      <span>{label}</span>
      {showBadge && unreadMessages > 0 && (
        <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {unreadMessages > 99 ? '99+' : unreadMessages}
        </span>
      )}
    </span>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 pb-5 pt-0 lg:px-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-600">
              Owner dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Owner Workspace
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Manage your listings, customer messages, and account settings in one clean dashboard.
            </p>
          </div>
            <div className="hidden items-center gap-3 sm:flex">
            <button
              type="button"
              onClick={() => navigate(`${basePath}/chat`)}
              className="relative rounded-full border border-slate-200 bg-white p-3 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              title="Messages"
            >
              <MessageCircle size={20} />
              <NotificationBadge count={unreadMessages} />
            </button>
            <button
              type="button"
              onClick={() => navigate(`${basePath}/notifications`)}
              className="relative rounded-full border border-slate-200 bg-white p-3 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              title="Notifications"
            >
              <Bell size={20} />
              <NotificationBadge count={unreadMessages} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => setIsDarkMode((value: boolean) => !value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
            >
              {isDarkMode ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 lg:hidden"
          >
            <Menu size={18} /> Menu
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-0 space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                    Seller profile
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                    {user?.name || user?.email || 'Marketplace owner'}
                  </p>
                </div>
                <div className="mt-6 space-y-3 text-sm text-slate-500 dark:text-slate-400">
                  <p>Role: {user?.role || 'Owner'}</p>
                  <p>Manage items, conversations, and security settings.</p>
                </div>
              </div>

              <nav className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                <div className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Dashboard navigation
                </div>
                <div className="space-y-2">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-semibold transition ${
                          isActive
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-950'
                        }`
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.Icon size={18} className="shrink-0" />
                      {renderNavLabel(item.label, item.label === 'Chat')}
                    </NavLink>
                  ))}
                </div>
                <div className="mt-6 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
                  <NavLink
                    to={`${basePath}/logout`}
                    className="flex items-center gap-3 rounded-3xl px-4 py-3 text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-950"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <LogOut size={18} />
                    Logout
                  </NavLink>
                </div>
              </nav>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-slate-950/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Menu</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  Close
                </button>
              </div>
              <div className="space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900'
                      }`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.Icon size={18} className="shrink-0" />
                    {renderNavLabel(item.label, item.label === 'Chat')}
                  </NavLink>
                ))}
              </div>
              <div className="mt-6 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
                <NavLink
                  to={`${basePath}/logout`}
                  className="flex items-center gap-3 rounded-3xl px-4 py-3 text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
                  onClick={() => setSidebarOpen(false)}
                >
                  <LogOut size={18} />
                  Logout
                </NavLink>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OwnerDashboard;
