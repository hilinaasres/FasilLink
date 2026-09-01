import React, { useState } from 'react';
import { Bell, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DesktopNavbar from '../components/desktop/DesktopNavbar';
import Footer from '../components/desktop/Footer';
import Button from '../components/desktop/Button';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import type { AppNotification } from '../context/NotificationContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  icon?: React.ReactNode;
}

const mapRow = (row: AppNotification): Notification => ({
  id: String(row.id),
  type: row.type || 'message',
  title: row.title,
  message: row.message,
  timestamp: new Date(row.created_at),
  read: Boolean(row.is_read),
  actionUrl: row.type === 'message' ? '/chats' : undefined,
  icon:
    row.type === 'message' ? (
      <MessageCircle className="w-5 h-5 text-[#6C3BFF]" />
    ) : (
      <Bell className="w-5 h-5 text-neutral-400" />
    ),
});

const DesktopNotificationsPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messageNotifications, loading, markNotificationRead, markMessagesRead } = useNotifications();

  const notifications = messageNotifications.map(mapRow);

  if (!user) {
    navigate('/login');
    return null;
  }

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'unread') {
      return !notif.read;
    }
    return true;
  });

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch {
      /* ignore */
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markMessagesRead();
    } catch {
      /* ignore */
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <DesktopNavbar transactionType="all" onTransactionTypeChange={() => {}} />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Bell className="w-8 h-8 text-[#6C3BFF]" />
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900">Notifications</h1>
                  <p className="text-neutral-600">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                  </p>
                </div>
              </div>
              {unreadCount > 0 && (
                <Button variant="outline" size="md" onClick={handleMarkAllAsRead}>
                  Mark all as read
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-[#6C3BFF] text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-[#6C3BFF] text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                Unread {unreadCount > 0 && <span>({unreadCount})</span>}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-neutral-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    notification.read
                      ? 'bg-white border-neutral-200'
                      : 'bg-[#F8F9FC] border-[#6C3BFF]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                      {notification.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-neutral-900">{notification.title}</h3>
                        <span className="text-xs text-neutral-500">
                          {notification.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-neutral-600 text-sm mb-4">{notification.message}</p>
                      <div className="flex items-center gap-3">
                        {notification.actionUrl && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => navigate(notification.actionUrl || '/chats')}
                          >
                            Open chat
                          </Button>
                        )}
                        {!notification.read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <Bell className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">No Notifications</h2>
              <p className="text-neutral-600">
                You will see alerts here when someone sends you a chat message
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DesktopNotificationsPage;
