import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { getAnalytics, getItems, getPayments, getSummary, getNotifications } from '../services/adminService';
import { useToast } from '../context/ToastContext';

const metricCards = [
  {
    label: 'Total Users',
    key: 'totalUsers',
    subtitle: '+12.5%',
    accent: 'from-sky-500 to-cyan-500',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Item Owners',
    key: 'totalOwners',
    subtitle: '+8.3%',
    accent: 'from-emerald-500 to-teal-500',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 8 8s1.79 4 4 4z" />
        <path d="M6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
      </svg>
    ),
  },
  {
    label: 'Active Items',
    key: 'activeListings',
    subtitle: '+9.8%',
    accent: 'from-violet-500 to-fuchsia-500',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 3h14l2 6H3l2-6z" />
        <path d="M5 9h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9z" />
      </svg>
    ),
  },
  {
    label: 'Sold Items',
    key: 'soldCount',
    subtitle: '+15.2%',
    accent: 'from-orange-500 to-amber-500',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3h18v4H3z" />
        <path d="M6 7l1 11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-11" />
        <path d="M9 21h.01M15 21h.01" />
      </svg>
    ),
  },
  {
    label: 'Rented Items',
    key: 'rentedCount',
    subtitle: '+7.1%',
    accent: 'from-rose-500 to-pink-500',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 7h10v10H7z" />
        <path d="M9 11h6" />
        <path d="M12 7v4" />
      </svg>
    ),
  },
  {
    label: 'Revenue',
    key: 'revenue',
    subtitle: '+18.6%',
    accent: 'from-indigo-500 to-sky-500',
    isCurrency: true,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1v22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H15a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: 'Pending Approvals',
    key: 'pendingApprovals',
    subtitle: '-3.4%',
    accent: 'from-orange-500 to-red-500',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M21 12a9 9 0 1 1-9-9" />
      </svg>
    ),
  },
  {
    label: 'Expired Listings',
    key: 'expiredListings',
    subtitle: '-6.7%',
    accent: 'from-amber-500 to-rose-500',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    ),
  },
  {
    label: 'Suspended Accounts',
    key: 'suspendedAccounts',
    subtitle: '-2.5%',
    accent: 'from-rose-500 to-violet-500',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12h6" />
      </svg>
    ),
  },
  {
    label: 'AI Accuracy',
    key: 'recommendationAccuracy',
    subtitle: '+4.3%',
    accent: 'from-sky-500 to-indigo-500',
    suffix: '%',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 17l4-4 4 4 4-8 4 4" />
      </svg>
    ),
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);

  const handleCardClick = (key) => {
    switch (key) {
      case 'totalUsers':
        navigate('/users');
        break;
      case 'totalOwners':
        navigate('/users?role=owner');
        break;
      case 'activeListings':
        navigate('/items?status=active');
        break;
      case 'soldCount':
        navigate('/items?status=sold');
        break;
      case 'rentedCount':
        navigate('/items?status=rented');
        break;
      case 'revenue':
        navigate('/payments');
        break;
      case 'pendingApprovals':
        navigate('/items?status=pending_approval');
        break;
      case 'expiredListings':
        navigate('/items?status=expired');
        break;
      case 'suspendedAccounts':
        navigate('/users?status=suspended');
        break;
      case 'recommendationAccuracy':
        navigate('/ai-monitor');
        break;
      default:
        break;
    }
  };
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { notify } = useToast();

  const loadDashboard = async () => {
    setError('');
    setLoading(true);

    const [summaryResult, analyticsResult, notificationsResult, paymentsResult, itemsResult] = await Promise.allSettled([
      getSummary(),
      getAnalytics(),
      getNotifications(),
      getPayments(),
      getItems(),
    ]);

    if (summaryResult.status === 'fulfilled') {
      setSummary(summaryResult.value.stats);
    } else {
      setSummary(null);
      setError('Unable to load dashboard summary.');
    }

    if (analyticsResult.status === 'fulfilled') {
      setAnalytics(analyticsResult.value);
    } else {
      setAnalytics(null);
      setError((prev) => (prev ? `${prev} Unable to load analytics.` : 'Unable to load analytics.'));
    }

    if (notificationsResult.status === 'fulfilled') {
      setNotifications(notificationsResult.value.notifications || []);
    } else {
      setNotifications([]);
    }

    if (paymentsResult.status === 'fulfilled') {
      setPayments(paymentsResult.value.payments || []);
    } else {
      setPayments([]);
    }

    if (itemsResult.status === 'fulfilled') {
      setPendingItems((itemsResult.value || []).filter((item) => item.status === 'pending_approval').slice(0, 3));
    } else {
      setPendingItems([]);
    }

    if (summaryResult.status === 'rejected' || analyticsResult.status === 'rejected') {
      notify('Unable to load dashboard metrics. Refresh to retry.', 'error');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, [notify]);

  const chartData = useMemo(() => analytics?.revenueTrend || [], [analytics]);
  const categoryTotal = useMemo(() => analytics?.categoryPopularity?.reduce((sum, item) => sum + (item.count || 0), 0) ?? 0, [analytics]);
  const latestPayments = useMemo(() => {
    if (payments.length) return payments;
    return notifications.filter((item) => item.category === 'Finance').slice(0, 3);
  }, [notifications, payments]);

  const formatRelativeTime = (value) => {
    if (!value) return 'Just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    const diffMs = date.getTime() - Date.now();
    const diffMinutes = Math.round(diffMs / 60000);
    if (Math.abs(diffMinutes) < 1) return 'Just now';
    if (Math.abs(diffMinutes) < 60) return `${Math.abs(diffMinutes)} min ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) return `${Math.abs(diffHours)} hr${Math.abs(diffHours) === 1 ? '' : 's'} ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">Welcome back! Here&apos;s what&apos;s happening with your platform.</p>
        </div>
        {error && (
          <div className="panel-card rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadDashboard}
                className="rounded-3xl bg-slate-900/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((card) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            onClick={() => handleCardClick(card.key)}
            className="panel-card p-4 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-900/80 text-sky-300">
                  {card.icon}
                </span>
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-slate-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {loading ? '—' : new Intl.NumberFormat('en-US', {
                      style: card.isCurrency ? 'currency' : 'decimal',
                      currency: card.isCurrency ? 'USD' : undefined,
                    }).format(card.key === 'recommendationAccuracy' ? analytics?.recommendationAccuracy ?? 0 : summary?.[card.key] ?? 0)}{card.suffix || ''}
                  </p>
                </div>
              </div>
              <span className={`inline-flex h-9 min-w-[3rem] items-center justify-center rounded-3xl bg-gradient-to-br ${card.accent} text-[0.72rem] font-semibold text-white`}>{card.subtitle}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-1.5 xl:grid-cols-3">
        <motion.div className="panel-card p-2.5 xl:col-span-2" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div 
              onClick={() => navigate('/payments')}
              className="cursor-pointer group flex flex-col"
            >
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500 group-hover:text-sky-400 transition-colors">Revenue overview</p>
              <h2 className="mt-1 text-lg font-semibold text-white group-hover:text-sky-300 transition-colors flex items-center gap-1">
                Revenue overview
                <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition duration-300 text-sky-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </h2>
            </div>
            <button 
              onClick={() => navigate('/payments')}
              className="rounded-full border border-slate-800/90 bg-slate-900/80 px-2.5 py-1 text-[0.68rem] text-slate-300 transition hover:border-sky-400/20 hover:text-white"
            >
              This Month
            </button>
          </div>
          <div className="h-[260px] rounded-[28px] bg-slate-950/80 p-2.5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#334155" strokeDasharray="4 4" />
                <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: 18, border: '1px solid rgba(148, 163, 184, 0.12)', boxShadow: '0 20px 80px rgba(15, 23, 42, 0.45)' }} />
                <Area type="monotone" dataKey="total" stroke="#60a5fa" fill="url(#revenueGradient)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="panel-card p-2.5" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div 
              onClick={() => navigate('/categories')}
              className="cursor-pointer group flex flex-col"
            >
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500 group-hover:text-sky-400 transition-colors">Top categories</p>
              <h2 className="mt-1 text-lg font-semibold text-white group-hover:text-sky-300 transition-colors flex items-center gap-1">
                Top categories
                <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition duration-300 text-sky-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </h2>
            </div>
            <button
              onClick={() => navigate('/categories')}
              className="text-[0.68rem] font-medium text-sky-400 transition hover:text-sky-300"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {analytics?.categoryPopularity?.slice(0, 5).map((category) => (
              <div key={category.name} className="flex items-center justify-between rounded-3xl border border-slate-800/90 bg-slate-950/80 px-2.5 py-2">
                <div>
                  <p className="text-sm font-medium text-white">{category.name}</p>
                  <p className="text-[0.7rem] text-slate-400">{category.count} items</p>
                </div>
                <span className="text-sm font-semibold text-slate-200">{Math.round((category.count / Math.max(categoryTotal, 1)) * 100)}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="panel-card p-2.5" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div 
              onClick={() => navigate('/ai-monitor')}
              className="cursor-pointer group flex flex-col"
            >
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500 group-hover:text-sky-400 transition-colors">AI engagement</p>
              <h2 className="mt-1 text-lg font-semibold text-white group-hover:text-sky-300 transition-colors flex items-center gap-1">
                AI engagement
                <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition duration-300 text-sky-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </h2>
            </div>
            <button 
              onClick={() => navigate('/ai-monitor')}
              className="text-[0.68rem] font-medium text-sky-400 transition hover:text-sky-300"
            >
              This Month
            </button>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 rounded-[28px] bg-slate-950/80 p-3">
            <div className="relative inline-flex h-32 w-32 items-center justify-center rounded-full bg-slate-900/90">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-500/20 via-slate-900/0 to-sky-500/10" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-950">
                <p className="text-2xl font-semibold text-white">{analytics?.recommendationAccuracy ?? 0}%</p>
              </div>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-800/90 bg-slate-900/70 p-2 text-center">
                <p className="text-[0.68rem] text-slate-400">Clicks</p>
                <p className="mt-1 text-sm font-semibold text-white">{analytics?.popularClicks ?? 0}</p>
              </div>
              <div className="rounded-3xl border border-slate-800/90 bg-slate-900/70 p-2 text-center">
                <p className="text-[0.68rem] text-slate-400">Impressions</p>
                <p className="mt-1 text-sm font-semibold text-white">{analytics?.ctr ? `${analytics.ctr}k` : '32.4k'}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-1.5 xl:grid-cols-3">
        <motion.div className="panel-card p-2.5" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}>
          <div className="mb-2.5 flex items-center justify-between">
            <div 
              onClick={() => navigate('/notifications')}
              className="cursor-pointer group flex flex-col"
            >
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500 group-hover:text-sky-400 transition-colors">Recent activity</p>
              <h2 className="mt-1 text-lg font-semibold text-white group-hover:text-sky-300 transition-colors flex items-center gap-1">
                Recent activity
                <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition duration-300 text-sky-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </h2>
            </div>
            <button
              onClick={() => navigate('/notifications')}
              className="text-xs font-medium text-sky-400 transition hover:text-sky-300"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {(notifications.length ? notifications : [{ id: 'none', title: 'No activity yet', message: 'Your dashboard is up to date.', category: 'Info' }]).slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-3xl border border-slate-800/90 bg-slate-950/80 p-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-3xl bg-slate-900/80 text-sky-300">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 8v4l3 3" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <p className="mt-1 text-[0.82rem] text-slate-400 truncate">{item.message}</p>
                  </div>
                </div>
                <p className="whitespace-nowrap text-[0.75rem] text-slate-500">{formatRelativeTime(item.time)}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="panel-card p-2.5" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.25 }}>
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">Pending approvals</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Pending approvals</h2>
            </div>
            <span className="text-xs font-semibold text-slate-300">{loading ? '—' : `${summary?.pendingApprovals ?? 0} pending`}</span>
          </div>
          <div className="space-y-2">
            {(pendingItems.length ? pendingItems : [{ id: 'pending-1', title: 'Item approval required', message: 'Review the latest product submissions.', amount: '$2,399', created_at: new Date().toISOString() }]).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-3xl border border-slate-800/90 bg-slate-950/80 p-3">
                <div className="h-14 w-14 rounded-3xl bg-slate-900/80" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <p className="mt-1 text-[0.82rem] text-slate-400 truncate">{item.message}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{item.amount || '$1,250'}</p>
                  <p className="mt-1 text-[0.75rem] text-slate-500">{formatRelativeTime(item.time || item.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="panel-card p-2.5" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3 }}>
          <div className="mb-2.5 flex items-center justify-between">
            <div 
              onClick={() => navigate('/payments')}
              className="cursor-pointer group flex flex-col"
            >
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500 group-hover:text-sky-400 transition-colors">Latest payments</p>
              <h2 className="mt-1 text-lg font-semibold text-white group-hover:text-sky-300 transition-colors flex items-center gap-1">
                Latest payments
                <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition duration-300 text-sky-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </h2>
            </div>
            <button
              onClick={() => navigate('/payments')}
              className="text-xs font-medium text-sky-400 transition hover:text-sky-300"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {latestPayments.length ? latestPayments.slice(0, 3).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 rounded-3xl border border-slate-800/90 bg-slate-950/80 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{payment.transaction_id ? `#${payment.transaction_id}` : payment.title || 'Payment update'}</p>
                  <p className="mt-1 text-[0.82rem] text-slate-400 truncate">{payment.owner_name || 'Admin feed'} · {payment.item_title || payment.message || 'Item'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{typeof payment.amount === 'number' ? `$${Number(payment.amount || 0).toLocaleString()}` : payment.amount || '$0'}</p>
                  <p className="mt-1 text-[0.75rem] text-emerald-400">{payment.status || payment.payment_status || payment.category || 'Completed'}</p>
                </div>
              </div>
            )) : (
              <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-2.5">
                <p className="text-sm text-slate-400">No recent payments to show.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
