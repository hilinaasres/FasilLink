import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { getNotifications } from '../services/adminService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export default function Notifications() {
  const [active, setActive] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadNotifications() {
      try {
        const data = await getNotifications();
        setNotifications(data.notifications || []);
      } catch (error) {
        notify('Unable to load notifications from backend.', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, [notify]);

  const filters = useMemo(() => {
    const categories = Array.from(new Set(notifications.map((item) => item.category || 'Other')));
    return ['All', ...categories];
  }, [notifications]);

  const items = useMemo(
    () => (active === 'All' ? notifications : notifications.filter((item) => item.category === active)),
    [active, notifications]
  );

  return (
    <div className="space-y-4">
      <div className="panel-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Notifications center</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Live alerts and workflow updates</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActive(filter)}
                className={`rounded-full px-3 py-2 text-sm transition ${active === filter ? 'bg-sky-500 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-card space-y-3 p-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading backend notifications…</div>
        ) : items.length ? (
          items.map((item) => (
            <motion.div
              key={item.id}
              className="rounded-[28px] border border-slate-800/90 bg-slate-950/90 p-4 cursor-pointer"
              whileHover={{ y: -2 }}
              onClick={() => {
                // Map notification to admin route
                const mapToRoute = (notif) => {
                  const cat = String(notif.category || '').toLowerCase();
                  const title = String(notif.title || '').toLowerCase();
                  const msg = String(notif.message || '').toLowerCase();
                  const id = String(notif.id || '').toLowerCase();

                  if (cat.includes('user') || title.includes('user') || msg.includes('user') || id.includes('user')) return '/users';
                  if (cat.includes('moderation') || title.includes('item') || msg.includes('listing') || msg.includes('item') || id.match(/^[0-9]+$/)) return '/items';
                  if (cat.includes('ai') || title.includes('ai') || msg.includes('ai')) return '/ai-monitor';
                  if (cat.includes('category') || title.includes('category') || msg.includes('category')) return '/categories';
                  if (cat.includes('charging') || title.includes('charge') || msg.includes('charge') || id.includes('charging')) return '/charging';
                  if (id === 'payment-failed' || cat.includes('finance') || title.includes('payment')) return '/payments';
                  return '/notifications';
                };

                const route = mapToRoute(item);
                navigate(route);
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{item.category || 'Update'}</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{item.title}</h3>
                </div>
                <span className="rounded-full bg-slate-800/90 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">{item.id}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{item.message}</p>
            </motion.div>
          ))
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">No notifications available from backend.</div>
        )}
      </div>
    </div>
  );
}
