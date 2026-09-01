import React, { useState } from 'react';
import { MapPin, BadgeCheck, Heart, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
// removed unused imports: api, useAuth
import { useFavorites } from '../../context/FavoritesContext';

interface ItemCardProps {
  id: string;
  title: string;
  price: number;
  image: string;
  location: string;
  category?: string;
  subcity?: string;
  kebele?: string;
  metadata?: Record<string, any>;
  isFavorited?: boolean;
  isPremium?: boolean;
  isVerified?: boolean;
  views?: number;
  type?: 'rent' | 'sell';
  imageCount?: number;
  tags?: string[];
  className?: string;
  rating?: number;
  reviews?: number;
  onFavoriteToggle?: (id: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({
  id,
  title,
  price,
  image,
  location,
  category,
  subcity,
  kebele,
  metadata,
  isFavorited = false,
  isPremium = false,
  isVerified = false,
  views = 0,
  type = 'rent',
  imageCount,
  tags,
  onFavoriteToggle,
  className,
  rating = 0,
  reviews = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { toggleFavorite, isFavorite } = useFavorites();
  const favorited = isFavorite(id) || isFavorited;

  const locationSummary = [location, subcity].filter(Boolean).join(' • ');

  const metadataChips = (() => {
    if (!metadata || typeof metadata !== 'object') return [] as Array<{ label: string; value: string }>;

    const isAmenityKey = (key: string) => key.toLowerCase() === 'amenities';

    const readValue = (...keys: string[]) => {
      for (const key of keys) {
        if (isAmenityKey(key)) continue;
        const raw = metadata[key];
        if (raw === null || raw === undefined || raw === '') continue;
        if (Array.isArray(raw)) {
          const joined = raw
            .map((entry) => (typeof entry === 'string' || typeof entry === 'number' ? String(entry).trim() : ''))
            .filter(Boolean)
            .join(', ');
          if (joined) return joined;
          continue;
        }
        if (typeof raw === 'object') {
          const flattened = Object.values(raw)
            .map((entry) => (typeof entry === 'string' || typeof entry === 'number' ? String(entry).trim() : ''))
            .filter(Boolean)
            .join(', ');
          if (flattened) return flattened;
          continue;
        }
        const text = String(raw).trim();
        if (text) return text;
      }
      return '';
    };

    const chips: Array<{ label: string; value: string }> = [];
    const pushChip = (label: string, value: string) => {
      const trimmed = value.trim();
      if (trimmed) chips.push({ label, value: trimmed });
    };

    pushChip('Type', readValue('transaction_type', 'transactionType', 'purpose', 'listing_type', 'type'));
    pushChip('Beds', readValue('bedrooms', 'beds', 'bed')); 
    pushChip('Baths', readValue('bathrooms', 'baths', 'bath'));
    pushChip('Area', readValue('area', 'size', 'square_feet', 'sqft', 'sqm'));
    pushChip('Garage', readValue('garage', 'parking', 'parking_spots'));
    pushChip('Condition', readValue('condition', 'status', 'furnished'));

    return chips.slice(0, 4);
  })();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const item = {
      id,
      title,
      price,
      location,
      image_url: image,
      category,
      transaction_type: type,
    } as any;
    toggleFavorite(item);
    onFavoriteToggle?.(id);
  };

  const trackItemClick = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('clickedItems') || '[]');
      const clickedItems = Array.isArray(stored) ? stored.map((value) => String(value)) : [];
      const next = [id, ...clickedItems.filter((value) => value !== id)].slice(0, 50);
      localStorage.setItem('clickedItems', JSON.stringify(next));
    } catch {}
  };

  return (
    <Link to={`/item/${id}`} onClick={trackItemClick}>
      <div
        className={`relative overflow-hidden rounded-[16px] border border-transparent bg-white shadow-[0_12px_30px_rgba(26,26,26,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(26,26,26,0.14)] cursor-pointer group ${className || ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image */}
        <div className="relative h-[200px] overflow-hidden bg-[#EEF2FF]">
          <img
            src={image}
            alt={title}
            className={`h-full w-full object-cover transition-transform duration-500 ${isHovered ? 'scale-105' : 'scale-100'}`}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />

          {/* Favorite button */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={handleFavoriteClick}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 backdrop-blur shadow-md transition-all duration-200 hover:scale-110"
              aria-label="Save to favorites"
            >
              <Heart
                className={`w-4 h-4 transition-all duration-200 ${favorited ? 'fill-red-500 text-red-500' : 'text-[#6D28D9]'}`}
              />
            </button>
          </div>

          {/* Premium badge */}
          {isPremium && (
            <div className="absolute top-3 left-3 bg-[#6C3BFF] text-white text-[10px] font-bold px-2 py-1 rounded-full">
              💎 Premium
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="rounded-full bg-[#EDE9FE] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#4C1D95] shadow-sm">
              {category || 'Listing'}
            </span>
            {isVerified && (
              <div className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-3 py-1.5 text-xs font-semibold text-[#312E81] border border-[#C7D2FE]">
                <BadgeCheck className="w-3.5 h-3.5" />
                Verified
              </div>
            )}
          </div>

          <h3 className="text-xl font-bold leading-tight text-slate-950 transition-colors duration-200 group-hover:text-[#6D28D9]">
            {title}
          </h3>

          {rating > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              {Array.from({ length: 5 }, (_, index) => {
                const filledStars = Math.round(rating);
                const isFilled = index < filledStars;
                return (
                  <svg
                    key={index}
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 ${isFilled ? 'text-yellow-400' : 'text-slate-300'}`}
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                );
              })}
              <span className="text-sm font-bold text-slate-700">{rating.toFixed(1)}</span>
              {reviews > 0 && <span className="text-sm text-slate-500">({reviews})</span>}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-700/80">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF2FF] text-[#6D28D9]">
              <MapPin className="w-4 h-4" />
            </span>
            <span className="truncate font-medium">{locationSummary || location}</span>
          </div>

          {metadataChips.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-[14px] bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#6D28D9]">
                <Info className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Item info</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {metadataChips.map((chip) => (
                    <span
                      key={`${chip.label}-${chip.value}`}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700"
                    >
                      <span className="font-semibold text-slate-500">{chip.label}:</span>
                      <span className="truncate max-w-[140px]">{chip.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-3 text-sm text-slate-700">
            <div className="flex items-center justify-between rounded-[16px] bg-[#EEF2FF] px-4 py-3">
              <span className="font-medium">Price</span>
              <span className="text-base font-bold text-[#5B21B6]">
                ETB {price.toLocaleString()}
                {type === 'rent' && <span className="text-xs font-normal text-slate-500"> /mo</span>}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ItemCard;