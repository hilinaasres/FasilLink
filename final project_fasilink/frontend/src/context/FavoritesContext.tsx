import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

export type FavoriteItem = {
  id: string;
  title: string;
  price?: number;
  location?: string;
  image_url?: string;
  category?: string;
  transaction_type?: string;
};

type FavoritesContextType = {
  favoritesById: Record<string, FavoriteItem>;
  favorites: FavoriteItem[];
  favoriteCount: number;
  toggleFavorite: (item: FavoriteItem) => { saved: boolean };
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const [favoritesById, setFavoritesById] = useState<Record<string, FavoriteItem>>({});
  const reconcileInFlightRef = useRef(false);
  const lastReconcileAtRef = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem('favorites_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, FavoriteItem>;
        if (parsed && typeof parsed === 'object') setFavoritesById(parsed);
      } catch (e) {
        console.error('Failed to parse favorites from localStorage', e);
      }
    }
  }, []);

  const { user } = useAuth();

  // On mount (and when user changes), attempt to reconcile with server-side favorites
  useEffect(() => {
    const reconcile = async () => {
      if (!user) return;
      if (reconcileInFlightRef.current) return;
      if (Date.now() - lastReconcileAtRef.current < 15_000) return;
      reconcileInFlightRef.current = true;
      try {
        const res = await api.get('/api/favorites');
        const serverItems: FavoriteItem[] = res.data?.items || [];
        if (serverItems.length > 0) {
          const map: Record<string, FavoriteItem> = {};
          serverItems.forEach((it) => {
            map[String(it.id)] = {
              ...it,
              id: String(it.id),
            };
          });
          setFavoritesById((prev) => ({ ...prev, ...map }));
        }
        lastReconcileAtRef.current = Date.now();
      } catch (err) {
        // best-effort; keep local state
        console.debug('Could not load favorites from server', err);
      } finally {
        reconcileInFlightRef.current = false;
      }
    };
    reconcile();
  }, [user?.id]);

  useEffect(() => {
    localStorage.setItem('favorites_v1', JSON.stringify(favoritesById));
  }, [favoritesById]);

  const favorites = useMemo(() => Object.values(favoritesById), [favoritesById]);
  const favoriteCount = favorites.length;

  const removeFavorite = (id: string) => {
    setFavoritesById((prev) => {
      if (!prev[id]) return prev;
      const removedItem = prev[id];
      const next = { ...prev };
      delete next[id];
      window.dispatchEvent(
        new CustomEvent('favorites:changed', {
          detail: { action: 'removed', item: removedItem },
        }),
      );
      return next;
    });
  };

  const toggleFavorite = (item: FavoriteItem) => {
    const id = String(item.id);
    let saved = false;
    setFavoritesById((prev) => {
      const exists = Boolean(prev[id]);
      const next = { ...prev };
      if (exists) {
        delete next[id];
        saved = false;
      } else {
        next[id] = { ...item, id };
        saved = true;
      }
      window.dispatchEvent(
        new CustomEvent('favorites:changed', {
          detail: { action: saved ? 'added' : 'removed', item },
        }),
      );
      return next;
    });
    // Best-effort: sync with server, don't block UI
    (async () => {
      try {
        await api.post('/favorites', { item_id: id });
      } catch (err) {
        console.debug('Failed to sync favorite toggle with server', err);
      }
    })();
    // Note: saved is captured via closure side-effect above; safe for immediate UI feedback use.
    return { saved };
  };

  const isFavorite = (id: string) => Boolean(favoritesById[String(id)]);

  return (
    <FavoritesContext.Provider
      value={{
        favoritesById,
        favorites,
        favoriteCount,
        toggleFavorite,
        removeFavorite,
        isFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};