import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface DesktopNavbarProps {
  transactionType?: 'all' | 'rent' | 'sell';
  onTransactionTypeChange?: (type: 'all' | 'rent' | 'sell') => void;
}

interface FavoriteItem {
  id: string;
  title: string;
  price: number;
  image_url?: string;
  image?: string;
  location?: string;
  category?: string;
}

interface ConversationPreview {
  key: string;
  otherId: string;
  otherName: string;
  itemId: string | null;
  itemTitle: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

const DesktopNavbar: React.FC<DesktopNavbarProps> = () => {
  const [scrolled, setScrolled] = useState(false);

  // Favorites state
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const favoritesRef = useRef<HTMLDivElement>(null);

  // Messages state
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [showMessagesDropdown, setShowMessagesDropdown] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Scroll shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (favoritesRef.current && !favoritesRef.current.contains(e.target as Node)) {
        setShowFavoritesDropdown(false);
      }
      if (messagesRef.current && !messagesRef.current.contains(e.target as Node)) {
        setShowMessagesDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch conversations + unread counts
  const fetchConversations = async () => {
    if (!user) return;
    try {
      setLoadingConvs(true);
      const res = await api.get('/messages/inbox');
      const rows = res.data?.conversations || [];
      const mapped: ConversationPreview[] = rows.map((row: any) => ({
        key: `${row.other_id}-${row.item_id ?? 'general'}`,
        otherId: String(row.other_id),
        otherName: row.other_name || 'User',
        itemId: row.item_id != null ? String(row.item_id) : null,
        itemTitle: row.item_title || null,
        lastMessage: row.message || '',
        lastMessageTime: row.timestamp || new Date().toISOString(),
        unread: Number(row.unread_count || 0),
      }));
      setConversations(mapped);
    } catch {
      // silently fail
    } finally {
      setLoadingConvs(false);
    }
  };

  // Poll every 15 seconds
  useEffect(() => {
    if (!user) return;
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Total unread count
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);

  // Favorites
  const loadFavorites = async () => {
    try {
      const raw = localStorage.getItem('favorites_v1') || localStorage.getItem('favorites') || '[]';
      const parsed = JSON.parse(raw);
      const savedIds: string[] = Array.isArray(parsed) ? parsed.map(String) : Object.keys(parsed || {}).map(String);
      if (savedIds.length === 0) { setFavoriteItems([]); return; }
      if (user) {
        try {
          const res = await api.get('/favorites');
          const items = res.data?.favorites || res.data?.items || [];
          if (items.length > 0) {
            setFavoriteItems(items.map((f: any) => ({
              id: String(f.item_id || f.id),
              title: f.title || f.item?.title || 'Item',
              price: Number(f.price || f.item?.price || 0),
              image_url: f.image_url || f.item?.image_url || f.image || '',
              location: f.location || f.item?.location || '',
              category: f.category || f.item?.category || '',
            })));
            return;
          }
        } catch {}
      }
      setFavoriteItems(savedIds.map(id => ({ id, title: `Item #${id}`, price: 0 })));
    } catch {
      setFavoriteItems([]);
    }
  };

  const favCount = (() => {
    try {
      const raw = localStorage.getItem('favorites_v1') || localStorage.getItem('favorites') || '[]';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : Object.keys(parsed || {}).length;
    } catch { return 0; }
  })();

  const handleFavoritesClick = () => {
    const next = !showFavoritesDropdown;
    setShowFavoritesDropdown(next);
    if (next) { setShowMessagesDropdown(false); loadFavorites(); }
  };

  const handleMessagesClick = () => {
    const next = !showMessagesDropdown;
    setShowMessagesDropdown(next);
    if (next) { setShowFavoritesDropdown(false); fetchConversations(); }
  };

  const removeFavorite = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem('favorites_v1') || localStorage.getItem('favorites') || '[]';
      const parsed = JSON.parse(raw);
      const saved = Array.isArray(parsed) ? parsed.map(String) : Object.keys(parsed || {}).map(String);
      const updated = saved.filter((id: string) => id !== itemId);
      localStorage.setItem('favorites_v1', JSON.stringify(updated));
      localStorage.setItem('favorites', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('favorites:changed', { detail: { action: 'removed', item: { id: itemId } } }));
      setFavoriteItems(prev => prev.filter(item => item.id !== itemId));
    } catch {}
    api.post('/favorites', { item_id: itemId }).catch(() => {});
  };

  const handleOpenChat = (conv: ConversationPreview) => {
    setShowMessagesDropdown(false);
    const params = new URLSearchParams({ with: conv.otherId });
    if (conv.itemId) params.set('item', conv.itemId);
    if (conv.otherName) params.set('name', conv.otherName);
    if (conv.itemTitle) params.set('title', conv.itemTitle);
    navigate(`/chats?${params.toString()}`);
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  return (
    <nav className={`sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl transition-all duration-300 ${scrolled ? 'shadow-[0_8px_20px_rgba(0,0,0,0.08)]' : ''} border-b border-slate-200`}>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#6D28D9] shadow-sm">
            <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 4C12.686 4 10 6.686 10 10c0 5 6 11.5 6 11.5s6-6.5 6-11.5c0-3.314-2.686-6-6-6Z" fill="#6D28D9" />
              <circle cx="16" cy="10" r="2.5" fill="#fff" />
              <path d="M19.5 16.5h2.5a3 3 0 0 1 0 6h-2" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round" />
              <path d="M12.5 16.5h-2.5a3 3 0 0 0 0 6h2" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-lg font-bold text-[#4C1D95]">FasilLink</p>
        </Link>

        {/* Right side */}
        <div className="flex flex-1 items-center justify-end gap-3">

          {/* ❤️ Favorites */}
          <div className="relative" ref={favoritesRef}>
            <button
              type="button"
              onClick={handleFavoritesClick}
              className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#F3E8FF] transition-all duration-200"
              aria-label="Saved items"
            >
              <Heart
                className="w-5 h-5"
                style={favCount > 0 ? { fill: '#ef4444', color: '#ef4444' } : { color: '#6D28D9' }}
              />
              {favCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow">
                  {favCount > 99 ? '99+' : favCount}
                </span>
              )}
            </button>

            {/* Favorites Dropdown */}
            {showFavoritesDropdown && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">Saved Items ({favCount})</h3>
                  <button
                    type="button"
                    onClick={() => setShowFavoritesDropdown(false)}
                    aria-label="Close saved items dropdown"
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {favoriteItems.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Heart className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No saved items yet</p>
                    <p className="text-xs text-slate-300 mt-1">Tap ❤️ on any listing to save it</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                    {favoriteItems.map(item => (
                      <Link
                        key={item.id}
                        to={`/item/${item.id}`}
                        onClick={() => setShowFavoritesDropdown(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#F3E8FF] transition-colors group"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          {item.image_url || item.image ? (
                            <img src={item.image_url || item.image} alt={item.title} className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=?'; }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">?</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-[#6D28D9]">{item.title}</p>
                          {item.category && <p className="text-xs text-slate-400 truncate">{item.category}{item.location ? ` • ${item.location}` : ''}</p>}
                          {item.price > 0 && <p className="text-xs font-bold text-[#6D28D9] mt-0.5">ETB {item.price.toLocaleString()}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => removeFavorite(e, item.id)}
                          aria-label={`Remove ${item.title} from saved items`}
                          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Link>
                    ))}
                  </div>
                )}
                {favoriteItems.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-100">
                    <Link to="/favorites" onClick={() => setShowFavoritesDropdown(false)}
                      className="block text-center text-sm font-semibold text-[#6D28D9] hover:text-[#5B21B6]">
                      View all saved items →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 💬 Messages dropdown */}
          <div className="relative" ref={messagesRef}>
            <button
              type="button"
              onClick={handleMessagesClick}
              className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#F3E8FF] transition-all duration-200"
              aria-label="Messages"
            >
              <MessageCircle className="w-5 h-5 text-[#6D28D9]" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow animate-pulse">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </button>

            {/* Messages Dropdown */}
            {showMessagesDropdown && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Messages {totalUnread > 0 && <span className="ml-1 text-red-500">({totalUnread} new)</span>}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowMessagesDropdown(false)}
                    aria-label="Close messages dropdown"
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {loadingConvs ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No messages yet</p>
                    <p className="text-xs text-slate-300 mt-1">Start a chat from any listing</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                    {conversations.map(conv => (
                      <button
                        key={conv.key}
                        type="button"
                        onClick={() => handleOpenChat(conv)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F3E8FF] transition-colors text-left group"
                      >
                        {/* Avatar */}
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

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm truncate ${conv.unread > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                              {conv.otherName}
                            </p>
                            <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">
                              {formatTime(conv.lastMessageTime)}
                            </span>
                          </div>
                          {conv.itemTitle && (
                            <p className="text-[11px] text-[#6D28D9] truncate">{conv.itemTitle}</p>
                          )}
                          <p className={`text-xs truncate mt-0.5 ${conv.unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                            {conv.lastMessage || 'No messages yet'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="px-4 py-3 border-t border-slate-100">
                  <Link to="/chats" onClick={() => setShowMessagesDropdown(false)}
                    className="block text-center text-sm font-semibold text-[#6D28D9] hover:text-[#5B21B6]">
                    Open full inbox →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Post Item */}
          <button
            type="button"
            onClick={() => navigate((user as any)?.isSeller ? '/seller/add' : '/seller/upgrade')}
            className="rounded-full bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-[#5B21B6]"
          >
            Become a seller
          </button>

          {/* Profile / Login */}
          {user ? (
            <Link
              to={user?.isSeller ? '/seller/profile' : '/customer/profile'}
              className="rounded-full border border-[#6D28D9] bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition duration-200 hover:bg-[#EEF2FF]"
            >
              Profile
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-full border border-[#6D28D9] bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition duration-200 hover:bg-[#EEF2FF]"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default DesktopNavbar;