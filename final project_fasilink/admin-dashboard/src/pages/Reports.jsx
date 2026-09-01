import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { getReports } from '../services/adminService';
import { useToast } from '../context/ToastContext';

const reportTypes = ['Sales', 'Rentals', 'Revenue', 'Users', 'Categories', 'AI'];
const periods = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
const viewKeyMap = {
  Sales: 'sales',
  Rentals: 'sales',
  Revenue: 'revenue',
  Users: 'sales',
  Categories: 'sales',
  AI: 'revenue',
};

export default function Reports() {
  const [activeView, setActiveView] = useState('Sales');
  const [filter, setFilter] = useState('Monthly');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await getReports(activeView, filter);
        setReports(data.reports || []);
      } catch (error) {
        notify('Unable to load reports from backend.', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [notify, activeView, filter]);

  const chartData = useMemo(
    () =>
      reports
        .map((item) => ({
          period: item.day,
          sales: Number(item.sales || 0),
          revenue: Number(item.revenue || 0),
          conversions: Number(item.conversions || item.impressions || 0),
          avg_score: Number(item.avg_score || 0),
        }))
        .reverse(),
    [reports]
  );

  const groupedData = useMemo(() => {
    const groups = new Map();

    chartData.forEach((item) => {
      const date = new Date(item.period);
      if (Number.isNaN(date)) return;

      let key;
      if (filter === 'Daily') {
        key = item.period;
      } else if (filter === 'Weekly') {
        const monday = new Date(date);
        const dayIndex = monday.getDay();
        const diff = monday.getDate() - dayIndex + (dayIndex === 0 ? -6 : 1);
        monday.setDate(diff);
        key = monday.toISOString().slice(0, 10);
      } else if (filter === 'Monthly') {
        key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      } else {
        key = `${date.getFullYear()}`;
      }

      const existing = groups.get(key) || { period: key, sales: 0, revenue: 0 };
      existing.sales += item.sales;
      existing.revenue += item.revenue;
      groups.set(key, existing);
    });

    return Array.from(groups.values()).slice(-12);
  }, [chartData, filter]);

  const summaryValue = useMemo(() => {
    if (!groupedData.length) return '—';
    const key = viewKeyMap[activeView];
    if (!key) return `${reports.length} records`;

    const total = groupedData.reduce((sum, row) => sum + (row[key] || 0), 0);
    if (key === 'revenue') {
      return `$${total.toLocaleString()}`;
    }
    // for AI view show avg score
    if (activeView === 'AI') {
      // compute average of avg_score across groupedData
      const avg = groupedData.reduce((acc, r) => acc + (r.avg_score || 0), 0) / groupedData.length;
      return `${Math.round(avg * 100) / 100}`;
    }
    return total.toLocaleString();
  }, [activeView, groupedData, reports.length]);

  return (
    <div className="space-y-5">
      <div className="panel-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Reporting suite</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Export insights and compliance dashboards</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {periods.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-full px-4 py-2 text-sm transition ${filter === item ? 'bg-sky-500 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <motion.div className="panel-card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Active report</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{activeView} performance</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {reportTypes.map((type) => (
              <button
                key={type}
                onClick={() => setActiveView(type)}
                className={`rounded-3xl px-4 py-3 text-sm ${activeView === type ? 'bg-sky-500 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-[28px] border border-slate-800/90 bg-slate-950/90 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Top KPI</p>
            <p className="mt-4 text-3xl font-semibold text-white">{loading ? 'Loading…' : summaryValue}</p>
            <p className="mt-3 text-sm text-slate-400">{filter} data across platform operations.</p>
          </div>
          <div className="rounded-[28px] border border-slate-800/90 bg-slate-950/90 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Trend</p>
            <p className="mt-4 text-3xl font-semibold text-white">{loading ? '—' : `${groupedData.length ? groupedData[groupedData.length - 1][viewKeyMap[activeView]] || 0 : 0}`}</p>
            <p className="mt-3 text-sm text-slate-400">Latest grouped totals for this view.</p>
          </div>
          <div className="rounded-[28px] border border-slate-800/90 bg-slate-950/90 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Export</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {['PDF', 'CSV', 'Excel'].map((option) => (
                <button key={option} className="rounded-3xl bg-slate-900 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800">
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={groupedData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="reportGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#334155" strokeDasharray="4 4" />
              <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: 18, border: '1px solid rgba(148, 163, 184, 0.12)' }} />
              <Area type="monotone" dataKey={viewKeyMap[activeView] || 'sales'} stroke="#38bdf8" fill="url(#reportGradient)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-800/90 bg-slate-950/90">
          <div className="grid gap-3 border-b border-slate-800/90 bg-slate-900/80 px-5 py-4 text-sm uppercase tracking-[0.3em] text-slate-500 sm:grid-cols-[3fr_1fr_1fr_1fr]">
            <span>Period</span>
            <span className="text-right">Sales</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">{activeView === 'AI' ? 'Avg Score' : 'Conversions'}</span>
          </div>
          <div className="divide-y divide-slate-800/90 p-4">
            {groupedData.length ? (
              groupedData.map((item) => (
                <div key={item.period} className="grid gap-3 py-4 text-sm sm:grid-cols-[3fr_1fr_1fr_1fr]">
                  <span className="text-slate-200">{item.period}</span>
                  <span className="text-right text-slate-100">{(item.sales || 0).toLocaleString()}</span>
                  <span className="text-right text-slate-100">${(item.revenue || 0).toLocaleString()}</span>
                  <span className="text-right text-slate-100">{activeView === 'AI' ? (item.avg_score ? `${Math.round(Number(item.avg_score) * 100) / 100}` : '—') : (item.conversions || 0)}</span>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-sm text-slate-400">{loading ? 'Loading report data…' : 'No report data available.'}</div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
