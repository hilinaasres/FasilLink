import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, Search, Send } from 'lucide-react';
import api from '../../services/api';
import socket from '../../socket';
import { useAuth } from '../../context/AuthContext';
import { useMessageNotifications } from '../../hooks/useMessageNotifications';
import {
  ChatMessage,
  Conversation,
  InboxRow,
  mapApiMessage,
  mapInboxRow,
  conversationKey,
} from '../../utils/chatUtils';

export default function OwnerChat() {
  const { user } = useAuth();
  const { markMessagesRead } = useMessageNotifications();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChatRef = useRef<Conversation | null>(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const loadInbox = useCallback(async (): Promise<Conversation[]> => {
    const response = await api.get('/messages/inbox');
    const rows = (response.data?.conversations || []) as InboxRow[];
    return rows.map(mapInboxRow);
  }, []);

  const loadConversation = useCallback(async (otherId: string, itemId: string | null) => {
    setLoadingMessages(true);
    try {
      const params: Record<string, string> = { with: otherId };
      if (itemId) params.item = itemId;
      const res = await api.get('/messages/conversation', { params });
      const rows = res.data?.messages || [];
      setMessages(rows.map(mapApiMessage));
    } catch (e) {
      console.error('Failed to load messages', e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const openChatFromParams = useCallback((inbox: Conversation[]) => {
    const params = new URLSearchParams(location.search);
    const withId = params.get('with');
    const itemId = params.get('item');
    const customerName = params.get('name');

    if (!withId) return;

    const key = conversationKey(withId, itemId);
    const existing = inbox.find((c) => c.key === key);
    if (existing) {
      setActiveChat(existing);
      return;
    }

    setActiveChat({
      key,
      otherId: withId,
      otherName: customerName ? decodeURIComponent(customerName) : 'Customer',
      itemId: itemId || null,
      itemTitle: null,
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unread: 0,
    });
  }, [location.search]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);
        const inbox = await loadInbox();
        if (cancelled) return;
        setConversations(inbox);
        openChatFromParams(inbox);
        if (!location.search && inbox.length > 0) {
          setActiveChat((prev) => prev ?? inbox[0]);
        }
      } catch (error) {
        console.error('Failed to load inbox:', error);
        openChatFromParams([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [user?.id, loadInbox, openChatFromParams, location.search]);

  useEffect(() => {
    if (!activeChat) return;
    loadConversation(activeChat.otherId, activeChat.itemId);
    markMessagesRead();
  }, [activeChat, loadConversation, markMessagesRead]);

  useEffect(() => {
    if (!user?.id) return;

    socket.connect();
    socket.emit('auth', { userId: user.id });

    const onIncoming = (payload: {
      id: number;
      sender_id: number;
      receiver_id: number;
      message: string;
      timestamp: string;
      item_id?: number | null;
      clientId?: string;
    }) => {
      const chat = activeChatRef.current;
      if (!chat) return;

      const fromCustomer =
        String(payload.sender_id) === chat.otherId ||
        String(payload.receiver_id) === chat.otherId;
      const payloadItem =
        payload.item_id != null ? String(payload.item_id) : null;
      const itemMatches =
        (chat.itemId === null && payloadItem === null) ||
        (chat.itemId !== null && payloadItem === chat.itemId);

      if (!fromCustomer || !itemMatches) return;

      const mapped = mapApiMessage({
        id: payload.id,
        sender_id: payload.sender_id,
        message: payload.message,
        timestamp: payload.timestamp,
        clientId: payload.clientId,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === mapped.id || (mapped.clientId && m.clientId === mapped.clientId))) return prev;
        return [...prev, mapped];
      });
    };

    const refreshInbox = async () => {
      try {
        const inbox = await loadInbox();
        setConversations(inbox);
      } catch {
        /* ignore */
      }
    };

    const onMessageEvent = (payload: {
      id: number;
      sender_id: number;
      receiver_id: number;
      message: string;
      timestamp: string;
      item_id?: number | null;
      clientId?: string;
    }) => {
      onIncoming(payload);
    };

    socket.on('message:new', onMessageEvent);
    socket.on('notification:new', refreshInbox);

    return () => {
      socket.off('message:new', onMessageEvent);
      socket.off('notification:new', refreshInbox);
    };
  }, [user?.id, loadInbox]);

  useEffect(() => {
    if (!user?.id || !activeChat) return;
    const roomId = `conversation_${activeChat.otherId}_${activeChat.itemId ?? 'general'}`;
    socket.emit('join_room', roomId);
  }, [user?.id, activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendSocketMessage = (message: string, clientId: string) => {
    if (!activeChat) return;
    const itemId = activeChat.itemId ? Number(activeChat.itemId) : null;
    socket.emit(
      'send_message',
      {
        receiverId: Number(activeChat.otherId),
        itemId,
        message,
        clientId,
      },
      (res: { ok: boolean; message?: Parameters<typeof mapApiMessage>[0] }) => {
        if (res.ok && res.message) {
          const sent = mapApiMessage(res.message);
          setMessages((prev) =>
            prev.map((item) =>
              item.clientId === clientId ? { ...sent, clientId } : item
            )
          );
          return;
        }

        setMessages((prev) =>
          prev.map((item) =>
            item.clientId === clientId ? { ...item, pending: false, failed: true } : item
          )
        );
        setSendError('Message failed, tap to retry.');
      }
    );
  };

  const handleSend = () => {
    if (!draft.trim() || !activeChat || !user) return;

    const message = draft.trim();
    const clientId = crypto.randomUUID();
    const temporaryMessage = {
      id: `pending-${clientId}`,
      clientId,
      senderId: String(user.id),
      content: message,
      timestamp: new Date().toISOString(),
      pending: true,
    };

    setSendError('');
    setMessages((prev) => [...prev, temporaryMessage]);
    setDraft('');
    sendSocketMessage(message, clientId);
  };

  const filtered = conversations.filter(
    (c) =>
      c.otherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.itemTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectChat = (chat: Conversation) => {
    setActiveChat(chat);
  };

  return (
    <div className="-m-6 flex min-h-[620px] flex-col">
      <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Messages</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
          Chat with customers
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Real-time messages from buyers interested in your listings
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Customer list — left */}
        <aside className="flex w-80 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                ))}
              </div>
            ) : (
              <>
                {activeChat && !filtered.some((c) => c.key === activeChat.key) && (
                  <button
                    type="button"
                    onClick={() => selectChat(activeChat)}
                    className="w-full border-l-4 border-brand-600 bg-brand-50 px-4 py-4 text-left dark:bg-brand-500/10"
                  >
                    <p className="font-semibold text-slate-900 dark:text-white">{activeChat.otherName}</p>
                    <p className="mt-1 text-xs text-brand-600">New conversation</p>
                  </button>
                )}
                {filtered.length > 0 ? (
                  filtered.map((chat) => (
                    <button
                      key={chat.key}
                      type="button"
                      onClick={() => selectChat(chat)}
                      className={`w-full border-b border-slate-200 px-4 py-4 text-left transition hover:bg-white dark:border-slate-800 dark:hover:bg-slate-900 ${
                        activeChat?.key === chat.key
                          ? 'border-l-4 border-l-brand-600 bg-white dark:bg-slate-900'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{chat.otherName}</p>
                        <span className="text-xs text-slate-500">
                          {new Date(chat.lastMessageTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {chat.itemTitle && (
                        <p className="mt-1 text-xs font-medium text-brand-600 line-clamp-1">
                          {chat.itemTitle}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-slate-600 line-clamp-1 dark:text-slate-400">
                        {chat.lastMessage || 'No messages yet'}
                      </p>
                    </button>
                  ))
                ) : !activeChat ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    <MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    No customer messages yet
                  </div>
                ) : null}
              </>
            )}
          </div>
        </aside>

        {/* Chat — middle / main */}
        <section className="flex min-w-0 flex-1 flex-col bg-white dark:bg-slate-900">
          {activeChat ? (
            <>
              <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                  {activeChat.otherName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{activeChat.otherName}</h3>
                  {activeChat.itemTitle && activeChat.itemId && (
                    <p className="text-sm text-slate-500">
                      About:{' '}
                      <Link
                        to={`/item/${activeChat.itemId}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {activeChat.itemTitle}
                      </Link>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-6 py-4 dark:bg-slate-950/40">
                {loadingMessages ? (
                  <p className="text-center text-sm text-slate-500">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-slate-600 dark:text-slate-300">
                      No messages yet with {activeChat.otherName}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Reply when they write about your listing</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwner = msg.senderId === String(user?.id);
                    return (
                      <div
                        key={msg.clientId || msg.id}
                        className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                            isOwner
                              ? 'bg-brand-600 text-white'
                              : 'border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                          }`}
                        >
                          <p className="text-sm leading-6">{msg.content}</p>
                          <p className={`mt-1 text-xs ${isOwner ? 'text-white/70' : 'text-slate-500'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {msg.failed && msg.clientId && (
                            <button
                              type="button"
                              className="mt-1 text-xs text-red-200 underline"
                              onClick={() => {
                                const retryClientId = msg.clientId;
                                if (!retryClientId) return;
                                setSendError('');
                                setMessages((prev) =>
                                  prev.map((item) =>
                                    item.clientId === retryClientId
                                      ? { ...item, pending: true, failed: false }
                                      : item
                                  )
                                );
                                sendSocketMessage(msg.content, retryClientId);
                              }}
                            >
                              Failed, tap to retry
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                {sendError && <p className="mb-2 text-sm text-red-600">{sendError}</p>}
                <div className="flex items-end gap-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={2}
                    placeholder={`Reply to ${activeChat.otherName}...`}
                    className="chat-input-field min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    aria-label="Send message"
                    title="Send message"
                    className="inline-flex h-12 min-w-[52px] items-center justify-center rounded-2xl bg-brand-600 px-4 text-white transition hover:bg-brand-700 disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-slate-500">
              <MessageCircle className="mb-4 h-14 w-14 text-slate-300" />
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                Select a customer to start chatting
              </p>
              <p className="mt-2 max-w-sm text-center text-sm">
                When a buyer messages you about a listing, the conversation appears on the left
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
