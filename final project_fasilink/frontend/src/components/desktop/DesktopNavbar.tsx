import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, X, Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useMessageNotifications } from '../../hooks/useMessageNotifications';
import './DesktopNavbar.css';
import { useFavorites } from '../../context/FavoritesContext';
import SmartSearchBar from './SmartSearchBar';

interface DesktopNavbarProps {
  transactionType?: 'all' | 'rent' | 'sell';
  onTransactionTypeChange?: (type: 'all' | 'rent' | 'sell') => void;
  isHomePage?: boolean;
}

// Use `FavoriteItem` from FavoritesContext; avoid local duplicate type to prevent conflicts.

const DesktopNavbar: React.FC<DesktopNavbarProps> = ({
  isHomePage = false,
  transactionType = 'all',
  onTransactionTypeChange,
}) => {
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { favorites: favoriteItems, favoriteCount, toggleFavorite } = useFavorites();
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const favoritesRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { unreadCount } = useMessageNotifications();
  const { notifications, notificationUnreadCount, markNotificationRead, markAllNotificationsRead } = useNotifications();
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [favoritesAlert, setFavoritesAlert] = useState<string | null>(null);
  const navigate = useNavigate();
  const isCustomer = Boolean(user) && !user?.isSeller && String(user?.role || '').toLowerCase() !== 'seller' && String(user?.role || '').toLowerCase() !== 'owner' && String(user?.role || '').toLowerCase() !== 'admin';
  const messagesPath = user?.isSeller ? '/seller/chat' : '/chats';
  const postItemPath = user?.isSeller ? '/seller/add' : '/seller/upgrade';

  const handleNotificationClick = async (n: any) => {
    try {
      if (!n.read) {
        await markNotificationRead(n.id);
      }
    } catch {}
    setShowNotificationsDropdown(false);
    if (n.link) navigate(n.link);
  };

  // Close dropdowns when clicking outside (extend existing handler)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (favoritesRef.current && !favoritesRef.current.contains(e.target as Node)) {
        setShowFavoritesDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotificationsDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (favoritesRef.current && !favoritesRef.current.contains(e.target as Node)) {
        setShowFavoritesDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Favorites are provided by FavoritesContext; no local loader required here.

  const handleFavoritesClick = () => {
    const next = !showFavoritesDropdown;
    setShowFavoritesDropdown(next);
  };

  const removeFavorite = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Use context toggle to remove (and let context sync with server)
    const item = favoriteItems.find((f) => String(f.id) === String(itemId));
    if (item) toggleFavorite(item as any);
  };

  const favCount = favoriteCount;

  useEffect(() => {
    const handleStorage = () => {
      // when other windows change storage, nothing to do because context reads localStorage on mount
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [user]);

  useEffect(() => {
    const handleFavoritesAlert = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: 'added' | 'removed'; item?: { title?: string } }>).detail;
      const actionText = detail?.action === 'removed' ? 'Removed from favorites' : 'Added to favorites';
      const itemText = detail?.item?.title ? `: ${detail.item.title}` : '';
      const nextMessage = `${actionText}${itemText}`;
      setFavoritesAlert(nextMessage);

      window.setTimeout(() => {
        setFavoritesAlert((current) => (current === nextMessage ? null : current));
      }, 2200);
    };

    window.addEventListener('favorites:changed', handleFavoritesAlert as EventListener);
    return () => window.removeEventListener('favorites:changed', handleFavoritesAlert as EventListener);
  }, []);

  return (
    <nav
      className={`${isHomePage ? 'desktop-navbar-home absolute top-0 left-0' : 'desktop-navbar-gradient sticky'} z-40 w-full backdrop-blur-xl transition-all duration-300 ${scrolled && !isHomePage ? 'shadow-[0_8px_20px_rgba(0,0,0,0.08)]' : ''} ${isHomePage ? '' : 'border-b border-slate-200'}`}
    >
      {favoritesAlert && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full border border-red-100 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-lg">
          {favoritesAlert}
        </div>
      )}
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">

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

        <div className="mx-4 hidden w-full max-w-[960px] flex-1 lg:block">
          <SmartSearchBar
            transactionType={transactionType}
            onTransactionTypeChange={onTransactionTypeChange}
          />
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">

          <button
            type="button"
            onClick={() => setShowMobileSearch((visible) => !visible)}
            aria-label={showMobileSearch ? 'Close search' : 'Open search'}
            aria-expanded={showMobileSearch}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:hidden"
          >
            {showMobileSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>

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
                          {((item as any).image_url || (item as any).image) ? (
                            <img
                              src={(item as any).image_url || (item as any).image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=?'; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">?</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-[#6D28D9]">{item.title}</p>
                          {(item as any).category && <p className="text-xs text-slate-400 truncate">{(item as any).category}{(item as any).location ? ` • ${(item as any).location}` : ''}</p>}
                          {typeof (item as any).price === 'number' && (item as any).price > 0 && <p className="text-xs font-bold text-[#6D28D9] mt-0.5">ETB {(item as any).price.toLocaleString()}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => removeFavorite(e, item.id)}
                          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                          aria-label="Remove from favorites"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Link>
                    ))}
                  </div>
                )}

                {favoriteItems.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-100">
                    <Link to="/favorites" onClick={() => setShowFavoritesDropdown(false)} className="block text-center text-sm font-semibold text-[#6D28D9] hover:text-[#5B21B6]">
                      View all saved items →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <Link
            to={messagesPath}
            className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#F3E8FF] transition-all duration-200"
            aria-label="Messages"
          >
            <MessageCircle className="w-5 h-5 text-[#6D28D9]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                const next = !showNotificationsDropdown;
                setShowNotificationsDropdown(next);
                if (next) {
                  // mark visible as read and fetch
                  markAllNotificationsRead();
                }
              }}
              className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#F3E8FF] transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-white/90" />
              {notificationUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow animate-pulse">
                  {notifications.filter(n => !n.read).length > 99 ? '99+' : notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {showNotificationsDropdown && (
              <div className="absolute right-0 top-12 w-96 max-h-[420px] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-100 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                  <button type="button" onClick={() => { setShowNotificationsDropdown(false); }} aria-label="Close notifications" className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {notifications.map((n) => (
                      <button key={n.id} type="button" onClick={() => handleNotificationClick(n)} className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${n.read ? '' : 'bg-white'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${n.read ? 'bg-slate-100' : 'bg-[#6D28D9] text-white'}`}>
                            <span className="text-xs font-semibold">{n.title?.charAt(0) || 'N'}</span>
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${n.read ? 'text-slate-700' : 'text-slate-900'}`}>{n.title}</p>
                            <p className="text-xs text-slate-400 mt-1 truncate">{n.body}</p>
                          </div>
                          <div className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleDateString()}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="border-t border-slate-100 px-4 py-3">
                  <Link to="/notifications" onClick={() => setShowNotificationsDropdown(false)} className="block text-center text-sm font-semibold text-[#6D28D9] hover:text-[#5B21B6]">
                    View all notifications →
                  </Link>
                </div>

              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(postItemPath)}
            className="relative rounded-full bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-[#5B21B6]"
          >
            {isCustomer ? 'Become a seller' : 'Post Item'}
          </button>

          {/* Profile / Sign in */}
          <div className="relative" ref={profileRef}>
            {user ? (
              <button
                type="button"
                onClick={() => setShowProfileDropdown((s) => !s)}
                className="inline-flex items-center gap-2 rounded-full border border-transparent bg-white px-3 py-1 text-sm font-semibold text-[#111827] transition duration-200 hover:bg-[#EEF2FF]"
                aria-label="Open profile menu"
              >
                    {user?.fullName || user?.name ? (
                      // show initial or avatar
                      <div className="profile-circle w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-800 overflow-hidden">
                        {(() => {
                          const raw = (user as any).profile_image || (user as any).avatar || (user as any).image;
                          const API_ROOT = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/api\/?$/, '');
                          const avatarSrc = (() => {
                            if (!raw) return null;
                            try {
                              const value = String(raw);
                              if (value.startsWith('/uploads/')) {
                                return `${API_ROOT}${value}`;
                              }
                              return value;
                            } catch {
                              return raw as string | null;
                            }
                          })();
                          return avatarSrc ? (
                            <img src={avatarSrc} alt={user.fullName || user.name || 'Profile'} className="w-full h-full object-cover" />
                          ) : (
                            <span>{(user.fullName || user.name || user.email || 'U').charAt(0).toUpperCase()}</span>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="profile-circle w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-800">U</div>
                    )}
              </button>
            ) : (
              <Link to="/login" className="rounded-full border border-[#6D28D9] bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition duration-200 hover:bg-[#EEF2FF]">Sign in</Link>
            )}

            {showProfileDropdown && user && (
              <div className="absolute right-0 top-12 w-44 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50">
                <Link to={user.isSeller ? '/seller/profile' : '/customer/profile'} onClick={() => setShowProfileDropdown(false)} className="block px-4 py-2 text-sm hover:bg-slate-50">My Profile</Link>
                <Link to={user.isSeller ? '/seller' : '/customer/overview'} onClick={() => setShowProfileDropdown(false)} className="block px-4 py-2 text-sm hover:bg-slate-50">Dashboard</Link>
                <button type="button" onClick={() => { logout(); navigate('/login'); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Logout</button>
              </div>
            )}
          </div>
        </div>
        {showMobileSearch && (
          <div className="basis-full lg:hidden">
            <SmartSearchBar
              transactionType={transactionType}
              onTransactionTypeChange={onTransactionTypeChange}
              onSearchSubmitted={() => setShowMobileSearch(false)}
            />
          </div>
        )}
      </div>
    </nav>
  );
};

export default DesktopNavbar;