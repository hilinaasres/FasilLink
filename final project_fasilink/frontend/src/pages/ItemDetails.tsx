import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import './ItemDetails.css';
import { useAuth } from '../context/AuthContext';

interface Item {
  id: number;
  title: string;
  price: number;
  location: string;
  description: string;
  category: string;
  transaction_type: string;
  owner_name: string;
  owner_id: number;
  status: string;
  images: string[];
  avg_rating?: number;
  rating_count?: number;
}

const Stars: React.FC<{ value: number; onSelect?: (n: number) => void; disabled?: boolean }> = ({ value, onSelect, disabled }) => {
  const v = Math.max(0, Math.min(5, Number(value || 0)));
  return (
    <div className="row-space stars-row">
      {Array.from({ length: 5 }, (_, i) => {
        const n = i + 1;
        const filled = n <= v;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled || !onSelect}
            onClick={() => onSelect?.(n)}
            title={disabled ? 'You can rate only after contacting the owner' : `Rate ${n}`}
            className="icon-btn-large star-button"
          >
            {filled ? '⭐' : '☆'}
          </button>
        );
      })}
    </div>
  );
};

const ItemDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [canRate, setCanRate] = useState(false);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [ratingSaving, setRatingSaving] = useState(false);

  const { user } = useAuth();
  const isAuthed = Boolean(user);
  const [lightMode, setLightMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      setError('');
      setItem(null);
      try {
        const res = await api.get(`/items/${id}`);
        setItem(res.data.item);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load item');
      }
    };

    if (id) load();
  }, [id]);

  useEffect(() => {
    if (!isAuthed || !id) return;
    let cancelled = false;

    const loadMeta = async () => {
      try {
        const favPromise = api.get('/favorites/ids').catch(() => ({ data: { ids: [] } }));
        const ratingPromise = api.get(`/ratings/item/${id}/me`).catch(() => ({ data: {} }));

        const [favRes, ratingRes] = await Promise.all([favPromise, ratingPromise]);

        if (cancelled) return;

        const ids = new Set((favRes.data?.ids || []).map((n: any) => Number(n)));
        setIsFavorite(ids.has(Number(id)));

        setCanRate(Boolean(ratingRes.data?.can_rate));
        setMyRating(ratingRes.data?.my_rating ?? null);
        setItem((prev) =>
          prev ? { ...prev, avg_rating: ratingRes.data?.avg_rating, rating_count: ratingRes.data?.rating_count } : prev
        );
      } catch (e) {
        if (!cancelled) {
          setIsFavorite(false);
          setCanRate(false);
          setMyRating(null);
        }
      }
    };

    void loadMeta();

    return () => { cancelled = true; };
  }, [id, isAuthed]);

  const toggleFavorite = async () => {
    if (!isAuthed) {
      window.location.href = '/login';
      return;
    }
    if (!id) return;
    try {
      const res = await api.post('/favorites', { item_id: Number(id) });
      setIsFavorite(Boolean(res.data?.favorited));
    } catch {
      // ignore
    }
  };

  const submitRating = async (n: number) => {
    if (!isAuthed) {
      window.location.href = '/login';
      return;
    }
    if (!id) return;
    setRatingSaving(true);
    setError('');
    try {
      const res = await api.post('/ratings', { item_id: Number(id), rating: n });
      setMyRating(n);
      setItem((prev) =>
        prev ? { ...prev, avg_rating: res.data?.avg_rating, rating_count: res.data?.rating_count } : prev
      );
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to save rating');
    } finally {
      setRatingSaving(false);
    }
  };

  if (error) return <div className="loading">{error}</div>;
  if (!item) return <div className="loading">Loading item details...</div>;

  return (
    <div className={`item-details-container ${lightMode ? 'light-mode' : ''}`}>
      <div className="item-main-content">
        <div className="image-gallery">
          <div className="main-image">
            <img
              src={item.images[0]}
              alt={item.title}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.src = 'https://picsum.photos/800/600?random=999';
                target.onerror = null;
              }}
            />
          </div>
          <div className="thumbnail-images">
            {item.images.slice(1).map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Thumbnail ${idx}`}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.src = 'https://picsum.photos/800/600?random=999';
                  target.onerror = null;
                }}
              />
            ))}
          </div>
        </div>

        <div className="item-info">
          <div className="row-space">
            <h1 className="mt-0">{item.title}</h1>
            <div className="row-space item-actions-row">
              {user && Number(user.id) === Number(item.owner_id) && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !lightMode;
                    setLightMode(next);
                    try {
                      sessionStorage.setItem(`item_light_${item.id}`, next ? '1' : '0');
                    } catch (e) {}
                  }}
                  title="Toggle Light mode for this page"
                  className="rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-800 hover:bg-slate-50 transition"
                >
                  {lightMode ? 'Normal' : 'Light mode'}
                </button>
              )}
              <button type="button" onClick={toggleFavorite} title="Favorite" className="icon-btn-large">
                {isFavorite ? '❤️' : '🤍'}
              </button>
            </div>
          </div>

          <div className="item-meta">
            <span className="badge category-badge">{item.category}</span>
            <span className={`badge status-badge ${item.status}`}>{item.status.toUpperCase()}</span>
          </div>

          <div className="section-spacing">
            <div className="rating-label">Rating</div>
            <div className="row-space-wrap">
              <Stars
                value={myRating ?? Math.round(Number(item.avg_rating || 0))}
                onSelect={canRate && !ratingSaving ? submitRating : undefined}
                disabled={!canRate || ratingSaving}
              />
              <span className="small-opacity">
                Avg: {Number(item.avg_rating || 0).toFixed(1)} ({Number(item.rating_count || 0)})
                {myRating ? ` • Yours: ${myRating}` : ''}
              </span>
              {!canRate && isAuthed && (
                <span className="small-opacity">(Rate after you contact the owner)</span>
              )}
            </div>
          </div>

          <p className="price">
            {item.price.toLocaleString()} ETB {item.transaction_type === 'rent' ? '/ month' : ''}
          </p>

          <div className="details-grid">
            <div className="detail-item">
              <strong>Location:</strong> {item.location}
            </div>
            <div className="detail-item">
              <strong>Type:</strong> For {item.transaction_type}
            </div>
          </div>

          <div className="description-box">
            <h3>Description</h3>
            <p>{item.description}</p>
          </div>

          <div className="owner-box">
            <h3>Contact Owner</h3>
            <p><strong>Owner:</strong> {item.owner_name || 'Owner'}</p>
            <div className="owner-actions">
              {/* FIX: pass name and title so the chats page knows who/what to load */}
              <Link
                to={`/chats?with=${item.owner_id}&item=${item.id}&name=${encodeURIComponent(item.owner_name || 'Owner')}&title=${encodeURIComponent(item.title)}`}
                className="btn-primary mr-2"
              >
                Chat with Owner
              </Link>
              {item.status === 'pending_approval' && user?.role === 'admin' && (
                <button
                  onClick={async () => {
                    try {
                      await api.put(`/admin/items/${item.id}/status`, { status: 'active' });
                      setItem((prev) => prev ? { ...prev, status: 'active' } : prev);
                      alert('Item approved and now visible on home page');
                    } catch (e) {
                      console.error(e);
                      alert('Failed to approve item');
                    }
                  }}
                  className="btn-primary"
                >
                  Approve
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetails;