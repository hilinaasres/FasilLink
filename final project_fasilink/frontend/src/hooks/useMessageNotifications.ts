import { useNotifications, type AppNotification } from '../context/NotificationContext';

export type { AppNotification };

export function useMessageNotifications() {
  const { unreadCount, messageNotifications, refreshNotifications, markMessagesRead } = useNotifications();

  return {
    unreadCount,
    messageNotifications,
    refresh: refreshNotifications,
    markMessagesRead,
  };
}
