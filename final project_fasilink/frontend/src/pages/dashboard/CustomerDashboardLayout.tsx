import React, { Fragment, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PlusCircle,
  Shield,
  User,
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

type NavItem = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const linkBase =
  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors';

export default function CustomerDashboardLayout() {
  const location = useLocation();
  const { user, sidebarOpen, setSidebarOpen, isDarkMode, toggleDarkMode } = useDashboard();
  const navigate = useNavigate();

  const navItems: NavItem[] = useMemo(
    () => [
      { to: '/customer/overview', label: 'Dashboard Overview', Icon: LayoutDashboard },
      { to: '/customer-posting/add', label: 'Post Item', Icon: PlusCircle },
      { to: '/customer/profile', label: 'My Profile', Icon: User },
      { to: '/customer/profile/edit', label: 'Edit Profile', Icon: User },
      { to: '/customer/favorites', label: 'Favorites', Icon: Heart },
      { to: '/customer/notifications', label: 'Notifications', Icon: Bell },
      { to: '/customer/security', label: 'Security', Icon: Shield },
      { to: '/customer/addresses', label: 'Address', Icon: MapPin },
    ],
    []
  );

  const title = useMemo(() => {
    const hit = navItems.find((i) => location.pathname.startsWith(i.to));
    return hit?.label ?? 'Customer Dashboard';
  }, [location.pathname, navItems]);

  const Sidebar = ({ variant }: { variant: 'desktop' | 'mobile' }) => (
<div
        className={[
          'flex h-full flex-col bg-white',
          variant === 'desktop'
            ? 'w-72 rounded-2xl border border-slate-200 shadow-sm'
            : 'w-72 border-r border-slate-200',
        ].join(' ')}
      >
<div className="flex items-center justify-between gap-3 px-4 py-4">
         <div className="min-w-0">
           <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
           </div>
           <div className="truncate text-xs text-slate-500 dark:text-slate-400">
             {user?.name || user?.email || 'Customer'}
           </div>
         </div>
        <button
          type="button"
          onClick={toggleDarkMode}
          className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? 'Dark' : 'Light'}
        </button>
      </div>

      <div className="px-3 pb-4">
        <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Menu
        </div>

        <nav className="space-y-1">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => {
                if (variant === 'mobile') setSidebarOpen(false);
              }}
              className={({ isActive }) =>
                [
                  linkBase,
                  isActive
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-700 hover:bg-slate-50',
                ].join(' ')
              }
              end={to === '/customer/overview'}
            >
              <Icon size={18} className="opacity-90" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto px-3 pb-4">
        <NavLink
          to="/customer/logout"
          onClick={() => {
            if (variant === 'mobile') setSidebarOpen(false);
          }}
          className={({ isActive }) =>
            [
              linkBase,
              isActive
                ? 'bg-red-50 text-red-700'
                : 'text-slate-700 hover:bg-slate-50',
            ].join(' ')
          }
        >
          <LogOut size={18} className="opacity-90" />
          <span>Logout</span>
        </NavLink>
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-white text-slate-900">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-0 lg:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
            {/* Desktop sticky sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-0 h-[calc(100vh-24px)]">
                <Sidebar variant="desktop" />
              </div>
            </div>

            {/* Main */}
            <div className="min-w-0">
              {/* Mobile header */}
              <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
                <div className="min-w-0">
                  <div className="text-lg font-bold">{title}</div>
                  <div className="truncate text-xs text-slate-500">
                    {user?.name || user?.email || 'Customer'}
                  </div>
                </div>
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <Menu size={18} />
                    Menu
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Home
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Outlet />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <Fragment>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <Sidebar variant="mobile" />
            </motion.div>
          </Fragment>
        )}
      </AnimatePresence>
    </>
  );
}

