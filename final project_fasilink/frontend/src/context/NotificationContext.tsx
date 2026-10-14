import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

export type AppNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export type NotificationItem = {
  id: string | number;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

interface NotificationContextValue {
  notifications: NotificationItem[];
  messageNotifications: AppNotification[];
  unreadCount: number;
  ownerUnreadCount: number;
  notificationUnreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string | number) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  markMessagesRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [messageNotifications, setMessageNotifications] = useState<AppNotification[]>([]);
  const [ownerUnreadCount, setOwnerUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);
  const retryAttemptsRef = useRef(0);
  const stoppedRef = useRef(false);
  const lastRefreshAtRef = useRef(0);

  const refreshNotifications = useCallback(async () => {
    // prevent concurrent refreshes and stop after repeated failures
    const inFlight = inFlightRef.current;
    if (inFlight) return;
    if (stoppedRef.current) return;
    if (Date.now() - lastRefreshAtRef.current < 10_000) return;
    inFlightRef.current = true;
    if (!user) {
      setNotifications([]);
      setMessageNotifications([]);
      setOwnerUnreadCount(0);
      inFlightRef.current = false;
      lastRefreshAtRef.current = Date.now();
      return;
    }

    setLoading(true);
    try {
      const [notificationsRes, mineRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/mine'),
      ]);

      const rows = notificationsRes.data?.notifications || notificationsRes.data || [];
      const mappedNotifications = rows.map((row: any) => ({
        id: row.id || row.notification_id,
        title: row.title || row.message || row.body || 'Notification',
        body: row.body || row.message || '',
        link: row.link || row.url || (String(row.type || '').toLowerCase() === 'message'
          ? (window.location.pathname.startsWith('/customer-posting') ? '/customer-posting/chat' : '/chats')
          : (String(row.message || '').match(/Item ID:\s*(\d+)/i)
            ? `${window.location.pathname.startsWith('/customer-posting') ? '/customer-posting' : '/owner'}/renew/${String(row.message).match(/Item ID:\s*(\d+)/i)?.[1]}`
            : null)),
        read: Boolean(row.read || row.is_read),
        created_at: row.created_at || row.createdAt || new Date().toISOString(),
      }));

      const mineRows = mineRes.data?.notifications || [];
      const messages = mineRows.filter((row: any) => String(row.type || '').toLowerCase() === 'message');
      const nonMessageRows = mineRows.filter((row: any) => String(row.type || '').toLowerCase() !== 'message');

      setNotifications(mappedNotifications.filter((row: any) => String(row.type || '').toLowerCase() !== 'message'));
      setMessageNotifications(messages);
      setOwnerUnreadCount(nonMessageRows.filter((row: any) => !Boolean(row.is_read)).length);
      // reset retry attempts on success
      retryAttemptsRef.current = 0;
      lastRefreshAtRef.current = Date.now();
    } catch {
      setNotifications([]);
      setMessageNotifications([]);
      setOwnerUnreadCount(0);
      // increment retry attempts and stop polling after 3 failures
      retryAttemptsRef.current = (retryAttemptsRef.current || 0) + 1;
      if (retryAttemptsRef.current >= 3) {
        stoppedRef.current = true;
      }
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // initial load + periodic refresh (polling only). Socket was disabled because backend has no socket support.
    void refreshNotifications();
    const id = window.setInterval(() => {
      if (stoppedRef.current) {
        window.clearInterval(id);
        return;
      }
      void refreshNotifications();
    }, 60000);

    return () => {
      window.clearInterval(id);
    };
  }, [refreshNotifications, user]);

  const markNotificationRead = useCallback(async (id: string | number) => {
    try {
      await api.post(`/notifications/${id}/mark-read`);
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
      setMessageNotifications((current) => current.map((item) => item.id === Number(id) ? { ...item, is_read: true } : item));
    } catch {
      // ignore
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      const ids = notifications.filter((item) => !item.read).map((item) => item.id);
      if (ids.length === 0) return;
      await api.post('/notifications/mark-read', { ids });
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setMessageNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch {
      // ignore
    }
  }, [notifications]);

  const markMessagesRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read', { type: 'message' });
      setMessageNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    messageNotifications,
    unreadCount: messageNotifications.filter((item) => !item.is_read).length,
    ownerUnreadCount,
    notificationUnreadCount: notifications.filter((item) => !item.read).length,
    loading,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    markMessagesRead,
  }), [loading, markAllNotificationsRead, markMessagesRead, markNotificationRead, messageNotifications, notifications, ownerUnreadCount, refreshNotifications]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
};
