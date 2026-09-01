import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  Menu,
  Sun,
  Moon,
  ChevronDown,
  LayoutDashboard,
  User,
  Edit3,
  Heart,
  Bell,
  Shield,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { useAuth } from '../../context/AuthContext';

const DashboardNavbar: React.FC = () => {
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const lastScrollY = useRef(0);
  const { isDarkMode, toggleDarkMode, user } = useDashboard();
  const { logout } = useAuth();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY - lastScrollY.current > 0 && currentScrollY > 80) {
            setIsNavbarVisible(false);
          } else if (currentScrollY - lastScrollY.current < 0) {
            setIsNavbarVisible(true);
          }
          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountOpen && !(e.target as HTMLElement).closest('.account-dropdown-wrapper')) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [accountOpen]);

  const displayName = user?.name || user?.email || 'Guest';

  return (
    <motion.header
      className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl shadow-navbar"
      initial={{ y: 0 }}
      animate={{ y: isNavbarVisible ? 0 : -82 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
            onClick={() => navigate('/customer/overview')}
            aria-label="Open dashboard home"
          >
            <Menu size={18} />
          </button>
          <div className="hidden sm:block rounded-3xl bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 ring-1 ring-white/10">
            Gondar / Azezo
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="truncate text-center text-sm font-semibold text-white sm:text-base">
            Customer Dashboard
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Home Button */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex h-11 px-4 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20 text-sm font-semibold gap-2"
          >
            Home
          </button>

          <button
            onClick={toggleDarkMode}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <Link to="/favorites" className="hidden items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20 sm:inline-flex">
            <Heart size={18} />
            Saved
          </Link>

          <Link to="/notifications" className="hidden items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20 sm:inline-flex">
            <Bell size={18} />
            Alerts
          </Link>

          <div className="account-dropdown-wrapper relative">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              onClick={() => setAccountOpen((value) => !value)}
            >
              <span className="hidden sm:inline">Account</span>
              <ChevronDown className={`h-4 w-4 transition ${accountOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {accountOpen && (
                <motion.div
                  className="absolute right-0 mt-2 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/10"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="border-b border-slate-200 px-4 py-4">
                    <p className="text-sm text-slate-500">Signed in as</p>
                    <p className="truncate text-base font-semibold text-slate-900">{displayName}</p>
                  </div>
                  <div className="flex flex-col gap-1 px-3 py-3">
                    <Link to="/customer/overview" onClick={() => setAccountOpen(false)} className="rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      Dashboard Overview
                    </Link>
                    <Link to="/customer/profile" onClick={() => setAccountOpen(false)} className="rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      My Profile
                    </Link>
                    <Link to="/customer" onClick={() => setAccountOpen(false)} className="rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      Full Dashboard
                    </Link>
                    <Link to="/owner" onClick={() => setAccountOpen(false)} className="rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      Owner Dashboard
                    </Link>
                    <Link to="/ai-assistant" onClick={() => setAccountOpen(false)} className="rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      AI Assistant
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        logout();
                      }}
                      className="mt-2 rounded-2xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
                    >
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

const DashboardSidebar: React.FC<{ className?: string }> = ({ className }) => {
  const location = useLocation();
  const { logout } = useAuth();
  const { user, sidebarOpen, setSidebarOpen } = useDashboard();

  const navItems = [
    { to: '/customer/overview', icon: LayoutDashboard, label: 'Dashboard Overview' },
    { to: '/customer/profile', icon: User, label: 'My Profile' },
    { to: '/customer/profile/edit', icon: Edit3, label: 'Update Profile', indent: true },
    { to: '/customer/favorites', icon: Heart, label: 'Favorites' },
    { to: '/customer/notifications', icon: Bell, label: 'Notifications' },
    { to: '/customer/security', icon: Shield, label: 'Security Settings' },
    { to: '/customer/addresses', icon: MapPin, label: 'Address Information' },
  ];

  const isActive = (path: string) => {
    if (path === '/customer/overview') {
      return location.pathname === '/customer/overview' || location.pathname === '/customer';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'CL';

  const sidebarContent = (
    <div className="dashboard-sidebar h-full rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-50 text-2xl font-semibold text-violet-700">
          {user?.avatar ? <img src={user.avatar} alt="Profile" className="h-full w-full rounded-3xl object-cover" /> : initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{user?.name || 'Customer'}</p>
          <p className="truncate text-sm text-slate-500">{user?.email || 'hello@example.com'}</p>
        </div>
      </div>

      <div className="space-y-4 px-3 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Navigation</div>
        <nav className="space-y-1">
          {navItems.map(({ to, label, icon: Icon, indent }) => (
            <Link
              key={to}
              to={to}
              onClick={() => {
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${isActive(to) ? 'bg-violet-50 text-violet-700' : 'text-slate-700 hover:bg-slate-50'}`}
              style={indent ? { marginLeft: 12 } : undefined}
            >
              <Icon size={18} className="opacity-90" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto px-3 pb-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="mobile-sidebar-overlay fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`${className || ''}`}>{sidebarContent}</aside>

      <motion.button
        className="mobile-sidebar-toggle fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-600 text-white shadow-2xl shadow-violet-600/20 transition hover:bg-violet-700 lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        initial={false}
        animate={sidebarOpen ? { rotate: 180 } : { rotate: 0 }}
        transition={{ duration: 0.25 }}
        aria-label="Toggle sidebar"
      >
        <Menu size={24} />
      </motion.button>
    </>
  );
};

export { DashboardNavbar, DashboardSidebar };
