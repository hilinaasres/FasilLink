import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { getItems } from '../services/adminService';

const statusLabels = {
  active: 'Active',
  sold: 'Sold',
  rented: 'Rented',
  expired: 'Expired',
  suspended: 'Suspended',
  removed: 'Removed',
  pending_approval: 'Pending Approval',
  rejected: 'Rejected',
};

const statusOrder = ['pending_approval', 'active', 'sold', 'rented', 'expired', 'suspended', 'removed', 'rejected'];

export default function ItemLifecycle() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  useEffect(() => {
    async function loadItems() {
      try {
        const data = await getItems();
        setItems(data || []);
      } catch (error) {
        notify('Unable to load lifecycle data from backend.', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadItems();
  }, [notify]);

  const statusCounts = useMemo(() => {
    return items.reduce((acc, item) => {
      const status = item.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [items]);

  const lifecycleData = useMemo(
    () =>
      statusOrder.map((status) => ({
        name: statusLabels[status] || status,
        value: statusCounts[status] || 0,
      })),
    [statusCounts]
  );

  const summaryCards = [
    { title: 'Pending approvals', value: statusCounts.pending_approval || 0 },
    { title: 'Active listings', value: statusCounts.active || 0 },
    { title: 'Expired listings', value: statusCounts.expired || 0 },
  ];

  return (
    <div className="space-y-5">
      <div className="panel-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Lifecycle dashboard</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Tracked item status progress</h2>
          </div>
          <p className="max-w-xl text-sm text-slate-400">Filter the lifecycle report by status, owner, category and timeline for moderation review.</p>
        </div>
      </div>

      <motion.div className="panel-card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Item lifecycle overview</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Status distribution</h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-800/90 bg-slate-900/90 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-400">
            {loading ? 'Loading data…' : `${items.length} total items`}
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lifecycleData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="4 4" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: 18, border: '1px solid rgba(148, 163, 184, 0.12)' }} />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Bar dataKey="value" fill="#38bdf8" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-3">
        {summaryCards.map((item, index) => (
          <motion.div key={item.title} className="panel-card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * index }}>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{item.title}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{loading ? '—' : item.value}</p>
            <p className="mt-3 text-sm text-slate-400">Current lifecycle totals from backend.</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
