import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  CalendarCheck,
  CheckCircle,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  PlusCircle,
  Sparkles,
  User2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const labelClass = 'text-sm font-semibold text-slate-900 dark:text-slate-100';
const valueClass = 'mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white';

const OWNER_OVERVIEW_CACHE_MS = 30_000;

type OwnerOverviewSnapshot = {
  items: OwnerItem[];
  conversations: OwnerConversation[];
  payments: OwnerPayment[];
  notifications: OwnerNotification[];
  revenue: number;
  loadedAt: number;
};

let ownerOverviewSnapshot: OwnerOverviewSnapshot | null = null;
let ownerOverviewLoadPromise: Promise<OwnerOverviewSnapshot> | null = null;

type OwnerItem = {
  id: number | string;
  title: string;
  price: number;
  status: string;
  status_label?: string;
  created_at?: string;
};

type OwnerConversation = {
  other_id: number | string;
  other_name?: string;
  message?: string;
  timestamp?: string;
  item_title?: string;
};

type OwnerPayment = {
  id: number | string;
  amount: number;
  created_at?: string;
  payment_status?: string;
  transaction_id?: string;
  item_title?: string;
};

type OwnerNotification = {
  id: number | string;
  title?: string;
  message?: string;
  created_at?: string;
  type?: string;
};

const OwnerOverview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<OwnerItem[]>([]);
  const [conversations, setConversations] = useState<OwnerConversation[]>([]);
  const [payments, setPayments] = useState<OwnerPayment[]>([]);
  const [notifications, setNotifications] = useState<OwnerNotification[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const snapshot = ownerOverviewSnapshot;
    if (snapshot && Date.now() - snapshot.loadedAt < OWNER_OVERVIEW_CACHE_MS) {
      setItems(snapshot.items);
      setConversations(snapshot.conversations);
      setPayments(snapshot.payments);
      setNotifications(snapshot.notifications);
      setRevenue(snapshot.revenue);
      setLoading(false);
      setError('');
      return () => {
        active = false;
      };
    }

    const applySnapshot = (next: OwnerOverviewSnapshot) => {
      if (!active) return;
      setItems(next.items);
      setConversations(next.conversations);
      setPayments(next.payments);
      setNotifications(next.notifications);
      setRevenue(next.revenue);
      setLoading(false);
      setError('');
    };

    if (ownerOverviewLoadPromise) {
      setLoading(true);
      ownerOverviewLoadPromise
        .then((next) => {
          applySnapshot(next);
        })
        .catch(() => {
          if (active) {
            setLoading(false);
          }
        });
      return () => {
        active = false;
      };
    }

    ownerOverviewLoadPromise = (async () => {
      try {
        setLoading(true);
        setError('');

        const [itemsRes, inboxRes, paymentSummaryRes, noticesRes] = await Promise.allSettled([
          api.get('/items/mine'),
          api.get('/messages/inbox'),
          api.get('/payment/mine-summary'),
          api.get('/notifications', {
            params: user?.id ? { userId: user.id } : undefined,
          }),
        ]);

        const nextSnapshot: OwnerOverviewSnapshot = {
          items: itemsRes.status === 'fulfilled' ? (itemsRes.value.data?.items || []) : [],
          conversations: inboxRes.status === 'fulfilled' ? (inboxRes.value.data?.conversations || []) : [],
          payments: paymentSummaryRes.status === 'fulfilled' ? (paymentSummaryRes.value.data?.payments || []) : [],
          notifications: noticesRes.status === 'fulfilled' ? (noticesRes.value.data?.notifications || []) : [],
          revenue: paymentSummaryRes.status === 'fulfilled' ? Number(paymentSummaryRes.value.data?.totalRevenue || 0) : 0,
          loadedAt: Date.now(),
        };

        ownerOverviewSnapshot = nextSnapshot;

        if (
          itemsRes.status === 'rejected' &&
          inboxRes.status === 'rejected' &&
          paymentSummaryRes.status === 'rejected'
        ) {
          if (active) setError('Unable to load owner dashboard data.');
        }

        return nextSnapshot;
      } finally {
        if (active) setLoading(false);
      }
    })();

    ownerOverviewLoadPromise.finally(() => {
      if (ownerOverviewLoadPromise) {
        ownerOverviewLoadPromise = null;
      }
    });

    ownerOverviewLoadPromise.then((next) => {
      applySnapshot(next);
    });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const normalizeStatus = (value: string) => String(value || '').toLowerCase();

  const summary = useMemo(() => {
    const active = items.filter((item) => normalizeStatus(item.status) === 'active').length;
    const pending = items.filter((item) => ['pending', 'pending_approval', 'pending_payment', 'rejected'].includes(normalizeStatus(item.status))).length;
    const sold = items.filter((item) => normalizeStatus(item.status) === 'sold').length;
    const rented = items.filter((item) => normalizeStatus(item.status) === 'rented').length;
    const soldOrRented = sold + rented;

    return {
      total: items.length,
      active,
      pending,
      sold,
      rented,
      soldOrRented,
      revenue,
      messages: conversations.length,
    };
  }, [items, conversations, revenue]);

  const activities = useMemo(() => {
    const itemActions = items
      .slice()
      .sort((a, b) => new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime())
      .slice(0, 4)
      .map((item) => ({
        id: `item-${item.id}`,
        title: `${item.title} — ${item.status_label || item.status}`,
        description: `Listing is currently ${item.status_label || item.status}.`,
        timestamp: item.created_at || new Date().toISOString(),
      }));

    const messageActions = conversations
      .slice()
      .sort((a, b) => new Date(String(b.timestamp || 0)).getTime() - new Date(String(a.timestamp || 0)).getTime())
      .slice(0, 3)
      .map((conversation) => ({
        id: `msg-${conversation.other_id}-${conversation.timestamp || ''}`,
        title: `Message from ${conversation.other_name || 'Customer'}`,
        description: conversation.message || 'New message received.',
        timestamp: conversation.timestamp || new Date().toISOString(),
      }));

    const paymentActions = payments
      .slice()
      .sort((a, b) => new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime())
      .slice(0, 2)
      .map((payment) => ({
        id: `payment-${payment.id}`,
        title: `Payment ${String(payment.payment_status || '').toUpperCase() || 'UPDATE'}`,
        description: `${payment.item_title || payment.transaction_id || 'Listing'} • ETB ${Number(payment.amount || 0).toLocaleString()}`,
        timestamp: payment.created_at || new Date().toISOString(),
      }));

    const noticeActions = notifications
      .filter((notice) => String(notice.type || '').toLowerCase() !== 'message')
      .slice(0, 2)
      .map((notice) => ({
        id: `notice-${notice.id}`,
        title: notice.title || 'Owner notification',
        description: notice.message || '',
        timestamp: notice.created_at || new Date().toISOString(),
      }));

    return [...messageActions, ...paymentActions, ...noticeActions, ...itemActions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [items, conversations, payments, notifications]);

  const stats = useMemo(() => [
    {
      label: 'Total Items',
      value: summary.total,
      Icon: LayoutDashboard,
      variant: 'bg-slate-50 dark:bg-slate-900',
    },
    {
      label: 'Active Items',
      value: summary.active,
      Icon: CheckCircle,
      variant: 'bg-white dark:bg-slate-900/80',
    },
    {
      label: 'Pending Items',
      value: summary.pending,
      Icon: CalendarCheck,
      variant: 'bg-white dark:bg-slate-900/80',
    },
    {
      label: 'Sold / Rented',
      value: summary.soldOrRented,
      Icon: Sparkles,
      variant: 'bg-white dark:bg-slate-900/80',
    },
    {
      label: 'Messages',
      value: summary.messages,
      Icon: MessageCircle,
      variant: 'bg-white dark:bg-slate-900/80',
    },
    {
      label: 'Revenue',
      value: `ETB ${Number(summary.revenue || 0).toLocaleString()}`,
      Icon: CreditCard,
      variant: 'bg-white dark:bg-slate-900/80',
    },
  ], [summary]);

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-3xl border border-slate-200/80 p-5 shadow-sm transition-colors duration-150 hover:border-slate-300 dark:border-slate-700 ${stat.variant}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className={labelClass}>{stat.label}</div>
                <div className={valueClass}>{loading ? '...' : stat.value}</div>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <stat.Icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
              Quick actions
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Essential seller shortcuts
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate(window.location.pathname.startsWith('/customer-posting') ? '/customer-posting/add' : '/owner/add')}
            className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <PlusCircle size={24} className="text-brand-600" />
            <div>
              <div className="font-semibold">Add New Item</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Create a new listing with all details.</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => navigate(window.location.pathname.startsWith('/customer-posting') ? '/customer-posting/manage' : '/owner/manage')}
            className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <Box size={24} className="text-slate-700 dark:text-slate-200" />
            <div>
              <div className="font-semibold">Manage Items</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Update listings, change status, or remove items.</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => navigate(window.location.pathname.startsWith('/customer-posting') ? '/customer-posting/chat' : '/owner/chat')}
            className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <MessageCircle size={24} className="text-slate-700 dark:text-slate-200" />
            <div>
              <div className="font-semibold">Chat with Customers</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Respond to inquiries from your buyers.</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => navigate(window.location.pathname.startsWith('/customer-posting') ? '/customer-posting/manage' : '/owner/manage')}
            className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <CalendarCheck size={24} className="text-slate-700 dark:text-slate-200" />
            <div>
              <div className="font-semibold">Renew Items</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Keep high-performing listings visible.</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => navigate(window.location.pathname.startsWith('/customer-posting') ? '/customer-posting/notifications' : '/owner/profile')}
            className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <User2 size={24} className="text-slate-700 dark:text-slate-200" />
            <div>
              <div className="font-semibold">Profile Settings</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Update your business profile and contact details.</div>
            </div>
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mb-5 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
              Activity feed
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent seller activity</div>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Last 6 actions</div>
        </div>

        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No recent actions yet. Add a listing or reply to a customer to build your activity history.
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <span>{activity.title}</span>
                  <span>{new Date(activity.timestamp).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{activity.description}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default React.memo(OwnerOverview);
