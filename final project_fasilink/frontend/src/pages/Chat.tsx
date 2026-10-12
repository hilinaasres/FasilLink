import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socket from '../socket';
import DesktopNavbar from '../components/desktop/DesktopNavbar';

interface Message {
  id: string;
  clientId?: string;
  sender_id: string;
  receiver_id: string;
  item_id: string | null;
  message: string;
  timestamp: string;
  pending?: boolean;
  failed?: boolean;
}

interface Conversation {
  key: string;
  otherId: string;
  otherName: string;
  itemId: string | null;
  itemTitle: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

interface ChatMessageBubbleProps {
  msg: Message;
  isMe: boolean;
}

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const getConversationsCacheKey = (userId: string) => `chat:conversations:${userId}`;
const getMessagesCacheKey = (userId: string, convKey: string) => `chat:messages:${userId}:${convKey}`;

const ChatMessageBubble = React.memo(({ msg, isMe }: ChatMessageBubbleProps) => {
  const timestamp = new Date(msg.timestamp);
  const timeLabel = Number.isNaN(timestamp.getTime())
    ? ''
    : timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
          isMe
            ? 'bg-[#6D28D9] text-white rounded-br-sm'
            : 'bg-white text-slate-800 border border-slate-100 shadow-sm rounded-bl-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
        }`}
      >
        <p>{msg.message}</p>
        <p className={`mt-1 text-[10px] ${isMe ? 'text-white/60 text-right' : 'text-slate-400 dark:text-slate-500'}`}>
          {timeLabel}
        </p>
      </div>
    </div>
  );
});

ChatMessageBubble.displayName = 'ChatMessageBubble';

const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const withId = searchParams.get('with');
  const itemId = searchParams.get('item');
  const otherName = searchParams.get('name') || 'User';
  const itemTitle = searchParams.get('title') || '';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollTimerRef = useRef<number | null>(null);
  const activeConvRef = useRef<Conversation | null>(null);

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  const normalizeId = (val: any): string | null => {
    if (val === null || val === undefined || val === 'null' || val === '') return null;
    return String(val);
  };

  const readCachedConversations = (userId: string): Conversation[] => {
    return safeJsonParse<Conversation[]>(localStorage.getItem(getConversationsCacheKey(userId)), []);
  };

  const writeCachedConversations = (userId: string, rows: Conversation[]) => {
    localStorage.setItem(getConversationsCacheKey(userId), JSON.stringify(rows));
  };

  const readCachedMessages = (userId: string, convKey: string): Message[] => {
    return safeJsonParse<Message[]>(localStorage.getItem(getMessagesCacheKey(userId, convKey)), []);
  };

  const writeCachedMessages = (userId: string, convKey: string, rows: Message[]) => {
    localStorage.setItem(getMessagesCacheKey(userId, convKey), JSON.stringify(rows));
  };

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const userId = String(user.id);
    try {
      setLoadingConvs(true);
      const res = await api.get('/messages/inbox');
      const rows = res.data?.conversations || [];
      const mapped: Conversation[] = rows.map((row: any) => ({
        key: `${row.other_id}-${row.item_id ?? 'general'}`,
        otherId: String(row.other_id),
        otherName: row.other_name || 'User',
        itemId: normalizeId(row.item_id),
        itemTitle: row.item_title || null,
        lastMessage: row.message || '',
        lastMessageTime: row.timestamp || new Date().toISOString(),
        unread: Number(row.unread_count || 0),
      }));
      setConversations(mapped);
      writeCachedConversations(userId, mapped);

      if (withId && !activeConv) {
        const normalizedWithId = String(withId);
        const normalizedItemId = normalizeId(itemId);

        const existing = mapped.find((c) => {
          const idMatch = c.otherId === normalizedWithId;
          const itemMatch = normalizedItemId ? c.itemId === normalizedItemId : true;
          return idMatch && itemMatch;
        });

        if (existing) {
          setActiveConv(existing);
        } else {
          setActiveConv({
            key: `${normalizedWithId}-${normalizedItemId ?? 'general'}`,
            otherId: normalizedWithId,
            otherName,
            itemId: normalizedItemId,
            itemTitle: itemTitle || null,
            lastMessage: '',
            lastMessageTime: new Date().toISOString(),
            unread: 0,
          });
        }
      } else if (!withId && mapped.length > 0 && !activeConv) {
        setActiveConv(mapped[0]);
      }
    } catch {
      const cached = readCachedConversations(userId);
      if (cached.length > 0) {
        setConversations(cached);
        if (withId && !activeConv) {
          const normalizedWithId = String(withId);
          const normalizedItemId = normalizeId(itemId);
          const existing = cached.find((c) => {
            const idMatch = c.otherId === normalizedWithId;
            const itemMatch = normalizedItemId ? c.itemId === normalizedItemId : true;
            return idMatch && itemMatch;
          });

          if (existing) {
            setActiveConv(existing);
          }
        } else if (!withId && !activeConv) {
          setActiveConv(cached[0]);
        }
      }
    } finally {
      setLoadingConvs(false);
    }
  }, [user, withId, itemId, otherName, itemTitle, activeConv]);

  const fetchMessages = useCallback(async (conv: Conversation, silent = false) => {
    if (!user) return;
    const userId = String(user.id);
    try {
      if (!silent) setLoadingMsgs(true);
      const params: Record<string, string> = { with: conv.otherId };
      if (conv.itemId) params.item = conv.itemId;
      const res = await api.get('/messages/conversation', { params });

      const raw = res.data?.messages ?? res.data ?? [];
      const msgs: Message[] = (Array.isArray(raw) ? raw : []).map((m: any) => ({
        id: String(m.id ?? Math.random()),
        sender_id: String(m.sender_id),
        receiver_id: String(m.receiver_id),
        item_id: normalizeId(m.item_id),
        message: m.message || m.content || m.text || '',
        timestamp: m.timestamp || m.created_at || new Date().toISOString(),
      }));
      setMessages((previous) => {
        const pending = previous.filter((message) => message.pending);
        const confirmedIds = new Set(msgs.map((message) => message.id));
        const next = [...msgs, ...pending.filter((message) => !confirmedIds.has(message.id))];
        writeCachedMessages(userId, conv.key, next);
        return next;
      });
    } catch {
      const cached = readCachedMessages(userId, conv.key);
      setMessages(cached);
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [user, fetchConversations]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv);
      inputRef.current?.focus();
    }
  }, [activeConv?.key, activeConv, fetchMessages]);

  useEffect(() => {
    if (!activeConv) return;
    const interval = setInterval(() => fetchMessages(activeConv, true), 5000);
    return () => clearInterval(interval);
  }, [activeConv, fetchMessages]);

  useEffect(() => {
    if (!user?.id) return;

    socket.connect();
    socket.emit('auth', { userId: user.id });

    const onMessage = (payload: {
      id: number;
      sender_id: number;
      receiver_id: number;
      item_id?: number | null;
      message: string;
      timestamp: string;
      clientId?: string;
    }) => {
      const conv = activeConvRef.current;
      if (!conv) return;

      const payloadItem = normalizeId(payload.item_id);
      const itemMatches = conv.itemId === payloadItem;
      const otherMatches =
        String(payload.sender_id) === conv.otherId ||
        String(payload.receiver_id) === conv.otherId;
      if (!itemMatches || !otherMatches) return;

      const incoming: Message = {
        id: String(payload.id),
        clientId: payload.clientId,
        sender_id: String(payload.sender_id),
        receiver_id: String(payload.receiver_id),
        item_id: payloadItem,
        message: payload.message,
        timestamp: payload.timestamp,
      };

      setMessages((previous) => {
        if (previous.some((message) =>
          message.id === incoming.id ||
          (incoming.clientId && message.clientId === incoming.clientId)
        )) {
          return previous;
        }
        return [...previous, incoming];
      });
    };

    socket.on('message:new', onMessage);
    return () => {
      socket.off('message:new', onMessage);
    };
  }, [user?.id]);

  useEffect(() => {
    if (scrollTimerRef.current) {
      window.clearTimeout(scrollTimerRef.current);
    }

    scrollTimerRef.current = window.setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    return () => {
      if (scrollTimerRef.current) {
        window.clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, [messages]);

  const sendSocketMessage = (text: string, clientId: string, conv: Conversation) => {
    const itemId = conv.itemId ? Number(conv.itemId) : null;
    socket.emit(
      'send_message',
      {
        receiverId: Number(conv.otherId),
        itemId,
        message: text,
        clientId,
      },
      (res: { ok: boolean; message?: Message }) => {
        if (res.ok && res.message) {
          const saved = {
            ...res.message,
            id: String(res.message.id),
            sender_id: String(res.message.sender_id),
            receiver_id: String(res.message.receiver_id),
            item_id: normalizeId(res.message.item_id),
            clientId,
            pending: false,
            failed: false,
          };
          setMessages((previous) =>
            previous.map((message) =>
              message.clientId === clientId ? saved : message
            )
          );
          return;
        }

        setMessages((previous) =>
          previous.map((message) =>
            message.clientId === clientId
              ? { ...message, pending: false, failed: true }
              : message
          )
        );
      }
    );
  };

  const handleSend = () => {
    if (!input.trim() || !activeConv || !user || sending) return;
    const text = input.trim();
    const userId = String(user.id);
    const conv = activeConv;
    const clientId = crypto.randomUUID();
    setInput('');
    setSending(true);

    const optimistic: Message = {
      id: `pending-${clientId}`,
      clientId,
      sender_id: String(user.id),
      receiver_id: conv.otherId,
      item_id: conv.itemId,
      message: text,
      timestamp: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => {
      const next = [...prev, optimistic];
      writeCachedMessages(userId, conv.key, next);
      return next;
    });

    sendSocketMessage(text, clientId, conv);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F0EBFF]">
        <DesktopNavbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <MessageCircle className="w-12 h-12 text-[#6D28D9] mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-700">Please log in to view messages</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 rounded-full bg-[#6D28D9] px-6 py-2 text-sm font-semibold text-white hover:bg-[#5B21B6]"
            >
              Log In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0EBFF] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <DesktopNavbar />

      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <div className="flex h-[calc(100vh-140px)] overflow-hidden rounded-3xl border border-[#E9D9FF] bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">

          {/* Sidebar */}
          <div className="flex w-80 flex-shrink-0 flex-col border-r border-slate-100 dark:border-slate-800">
            <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Messages</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConvs ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
                  <MessageCircle className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm font-semibold text-slate-400 dark:text-slate-300">No conversations yet</p>
                  <p className="mt-1 text-xs text-slate-300 dark:text-slate-400">Start chatting from any listing</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.key}
                    type="button"
                    onClick={() => setActiveConv(conv)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      activeConv?.key === conv.key ? 'bg-[#F3E8FF] dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full bg-[#6D28D9] flex items-center justify-center text-white font-bold text-sm">
                        {conv.otherName.charAt(0).toUpperCase()}
                      </div>
                      {conv.unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {conv.unread > 9 ? '9+' : conv.unread}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`truncate text-sm ${conv.unread > 0 ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-200'}`}>
                          {conv.otherName}
                        </p>
                        <span className="ml-1 flex-shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                          {formatDate(conv.lastMessageTime)}
                        </span>
                      </div>
                      {conv.itemTitle && (
                        <p className="truncate text-[11px] text-[#6D28D9] dark:text-[#C4B5FD]">{conv.itemTitle}</p>
                      )}
                      <p className={`mt-0.5 truncate text-xs ${conv.unread > 0 ? 'font-medium text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                        {conv.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          {activeConv ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#6D28D9] flex items-center justify-center text-white font-bold flex-shrink-0">
                    {activeConv.otherName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{activeConv.otherName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {activeConv.itemTitle ? `Conversation about ${activeConv.itemTitle}` : 'Direct conversation'}
                    </p>
                  </div>
                </div>
                {activeConv.itemId && (
                  <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <span>Item chat</span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 bg-[#FAFAFA] px-4 py-5 dark:bg-slate-950/50 sm:px-5">
                {loadingMsgs ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <div className="h-10 w-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-300">No messages yet</p>
                    <p className="mt-1 text-xs text-slate-300 dark:text-slate-400">Say hello to start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <ChatMessageBubble
                      key={msg.clientId || msg.id}
                      msg={msg}
                      isMe={String(msg.sender_id) === String(user.id)}
                    />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-slate-100 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a message"
                    className="chat-input-field flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    aria-label="Send message"
                    title="Send message"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6D28D9] text-white transition hover:bg-[#5B21B6] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <MessageCircle className="w-14 h-14 text-slate-200 mb-4" />
              <p className="text-lg font-semibold text-slate-400 dark:text-slate-300">Select a conversation</p>
              <p className="mt-1 text-sm text-slate-300 dark:text-slate-400">or start one from any listing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChatWidget);