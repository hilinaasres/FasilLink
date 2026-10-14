import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardCard from '../../components/dashboard/DashboardCard';
import { Bell, Package2, Sparkles, MapPin } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

const DashboardOverview: React.FC = () => {
  const { user } = useDashboard();

  const fields = useMemo(
    () => [user?.name, user?.username, user?.email, user?.phone, user?.country, user?.city, user?.address, user?.bio],
    [user]
  );

  const filled = fields.filter(Boolean).length;
  const completion = Math.round((filled / fields.length) * 100);

  const stats = [
    {
      icon: <Sparkles size={22} strokeWidth={1.6} />,
      title: 'Profile Strength',
      value: `${completion}%`,
      subtitle: completion === 100 ? 'Complete and ready' : `${fields.length - filled} items remaining`,
      iconBg: 'bg-violet-50 text-violet-700',
      trend: { value: completion >= 90 ? 'On track' : 'Needs update', up: completion >= 90 },
    },
    {
      icon: <Bell size={22} strokeWidth={1.6} />,
      title: 'Alerts',
      value: '5',
      subtitle: '2 unread updates',
      iconBg: 'bg-slate-50 text-slate-700',
      trend: { value: 'Stay informed', up: false },
    },
    {
      icon: <Package2 size={22} strokeWidth={1.6} />,
      title: 'Saved Searches',
      value: '4',
      subtitle: 'Curated listings ready',
      iconBg: 'bg-violet-50 text-violet-700',
    },
  ];

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'CL';

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.35em] text-violet-600">Customer dashboard</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Welcome back, {user?.name || 'there'}.</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              Your marketplace dashboard is designed to keep your account information crisp, private, and easy to manage.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-600 text-xl font-semibold text-white">
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} className="h-full w-full rounded-3xl object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <p className="text-sm text-slate-500">Signed in as</p>
              <p className="text-lg font-semibold text-slate-950">{user?.name || 'Customer User'}</p>
              <p className="text-sm text-slate-500">{user?.email || 'hello@example.com'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-violet-200 bg-violet-50 p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-700">Sell from your account</p>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">Post your own item</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Open the publishing form to create a listing from the customer dashboard.
            </p>
          </div>
          <Link
            to="/seller/upgrade"
            className="inline-flex items-center justify-center rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            Post Item
          </Link>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {stats.map((item, index) => (
          <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
            <DashboardCard
              icon={item.icon}
              title={item.title}
              value={item.value}
              subtitle={item.subtitle}
              iconBg={item.iconBg}
              trend={item.trend as any}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.85fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-600">Account snapshot</p>
              <h2 className="mt-3 text-xl font-semibold text-slate-950">Personal information</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">
              <MapPin size={16} /> Gondar, Ethiopia
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Email connected</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{user?.email ? 'Yes' : 'No'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Phone connected</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{user?.phone || 'Not provided'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Account type</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">Customer</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Profile readiness</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{completion}%</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-600">Insights</p>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">What you should know</h2>
          </div>
          <div className="mt-6 space-y-4 text-sm text-slate-600">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">Keep your details current</p>
              <p className="mt-2">Complete your profile for more relevant items and faster matches.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">Organize your account</p>
              <p className="mt-2">Check notifications regularly to avoid missing new listing updates.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">Browse with confidence</p>
              <p className="mt-2">A clean profile helps the marketplace present better opportunities for you.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardOverview;
