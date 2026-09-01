import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import type { AppNotification } from '../../hooks/useMessageNotifications';

interface Props {
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead: () => void;
}

const NotificationDropdown: React.FC<Props> = ({ onClose, notifications, onMarkRead }) => {
  const navigate = useNavigate();
  const unread = notifications.filter((n) => !n.is_read);
  const recent = notifications.slice(0, 6);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-dropdown')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const openChats = () => {
    onMarkRead();
    navigate('/chats');
    onClose();
  };

  return (
    <div className="notification-dropdown w-80 rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden">
      <div className="border-b border-neutral-100 px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-neutral-900 text-sm">Notifications</span>
        {unread.length > 0 && (
          <span className="text-xs font-medium text-[#6C3BFF]">{unread.length} new</span>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto">
        {recent.length > 0 ? (
          recent.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={openChats}
              className={`w-full text-left px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition ${
                !n.is_read ? 'bg-[#F8F9FC]' : ''
              }`}
            >
              <div className="flex gap-3">
                <MessageCircle className="w-5 h-5 text-[#6C3BFF] flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 line-clamp-1">{n.title}</p>
                  <p className="text-xs text-neutral-600 line-clamp-2 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </button>
          ))
        ) : (
          <p className="px-4 py-6 text-sm text-neutral-500 text-center">No notifications yet</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          navigate('/notifications');
          onClose();
        }}
        className="w-full px-4 py-3 text-sm font-medium text-[#6C3BFF] hover:bg-neutral-50 border-t border-neutral-100"
      >
        View all notifications
      </button>
    </div>
  );
};

export default NotificationDropdown;
