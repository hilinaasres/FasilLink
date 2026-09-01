import React, { useMemo } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

type Notice = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  source: 'owner' | 'announcement';
  actionUrl?: string;
};

const parseItemId = (text: string) => {
  const match = String(text || '').match(/Item ID:\s*(\d+)/i);
  return match ? match[1] : null;
};

const buildNoticeActionUrl = (title: string, message: string) => {
  const lowerTitle = String(title || '').toLowerCase();
  const lowerMessage = String(message || '').toLowerCase();
  const itemId = parseItemId(`${title} ${message}`);

  if (lowerTitle.includes('message') || lowerMessage.includes('message')) {
    return '/customer-posting/chat';
  }

  if (itemId && (lowerTitle.includes('suspend') || lowerTitle.includes('expire') || lowerTitle.includes('renew') || lowerMessage.includes('renewal fee'))) {
    return `/customer-posting/renew/${itemId}`;
  }

  return undefined;
};

const OwnerNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, loading } = useNotifications();

  // Use centralized NotificationContext (handles polling and socket updates)
  const notices = useMemo(() => (notifications || [])
    .filter((n: any) => String(n.type || '').toLowerCase() !== 'message')
    .map((n: any) => ({
      id: `owner-${n.id}`,
      title: String(n.title || 'Owner notification'),
      message: String(n.body || n.message || ''),
      createdAt: String(n.created_at || n.createdAt || new Date().toISOString()),
      source: 'owner' as const,
      actionUrl: (() => {
        const title = String(n.title || '');
        const message = String(n.body || n.message || '');
        const lowerTitle = title.toLowerCase();
        const lowerMessage = message.toLowerCase();
        const match = String(`${title} ${message}`).match(/Item ID:\s*(\d+)/i);
        const itemId = match ? match[1] : null;
        if (lowerTitle.includes('message') || lowerMessage.includes('message')) return '/customer-posting/chat';
        if (itemId && (lowerTitle.includes('suspend') || lowerTitle.includes('expire') || lowerTitle.includes('renew') || lowerMessage.includes('renewal fee'))) return `/customer-posting/renew/${itemId}`;
        return undefined;
      })(),
    })), [notifications]);

  const hasNotices = useMemo(() => notices.length > 0, [notices.length]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-600">Owner Notices</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Notification of Owner</h1>
        <p className="mt-2 text-sm text-slate-600">Only owner updates and alerts are shown here.</p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Loading owner notifications...
        </div>
      )}

      {!loading && !hasNotices && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No owner notifications yet.
        </div>
      )}

      {!loading && hasNotices && (
        <div className="space-y-3">
          {notices.map((notice) => (
            <button
              key={notice.id}
              type="button"
              onClick={() => notice.actionUrl && navigate(notice.actionUrl)}
              disabled={!notice.actionUrl}
              className={`w-full rounded-2xl border border-slate-200 bg-white p-5 text-left transition ${notice.actionUrl ? 'hover:border-violet-300 hover:bg-violet-50/30' : 'cursor-default'}`}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
                  <Bell size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">{notice.title}</h3>
                    <span className="text-xs text-slate-500">
                      {new Date(notice.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{notice.message}</p>
                  {notice.actionUrl && (
                    <p className="mt-2 text-xs font-semibold text-violet-600">Open linked page</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(OwnerNotifications);
