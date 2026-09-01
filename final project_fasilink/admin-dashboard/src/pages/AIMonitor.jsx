import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { getAnalytics } from '../services/adminService';
import { useToast } from '../context/ToastContext';

export default function AIMonitor() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const data = await getAnalytics();
        setAnalytics(data);
      } catch (error) {
        notify('Unable to load AI analytics.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [notify]);

  return (
    <div className="space-y-5">
      <div className="panel-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">AI recommendation monitor</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Engagement, precision, and CTR</h2>
          </div>
          <p className="max-w-xl text-sm text-slate-400">Review how recommendations perform and identify categories with the strongest user response.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {['Recommendation Accuracy', 'CTR', 'Popular Clicks'].map((title, index) => (
          <motion.div key={title} className="panel-card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * index }}>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{loading ? '—' : [`${analytics?.recommendationAccuracy ?? 0}%`, `${analytics?.ctr ?? 0}%`, `${analytics?.popularClicks ?? 0}`][index]}</p>
            <p className="mt-3 text-sm text-slate-400">{['Precision across AI routes', 'Rate of recommendations clicked', 'Top categories by engagement'][index]}</p>
          </motion.div>
        ))}
      </div>

      <motion.div className="panel-card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Trend view</p>
          <span className="rounded-full border border-slate-800/90 bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">Last 30 days</span>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics?.aiTrend || []} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="aiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#334155" strokeDasharray="4 4" />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: 18, border: '1px solid rgba(148, 163, 184, 0.12)' }} />
              <Area type="monotone" dataKey="score" stroke="#38bdf8" fill="url(#aiGradient)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
