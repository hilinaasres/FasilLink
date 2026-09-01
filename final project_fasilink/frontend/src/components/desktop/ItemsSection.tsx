import React, { useState, useEffect, useCallback } from 'react';
import ItemCard from './ItemCard';
import HorizontalRow from './HorizontalRow';
import api from '../../services/api';

interface Item {
  id: string;
  title: string;
  price: number;
  image: string;
  location: string;
  category?: string;
  subcity?: string;
  kebele?: string;
  metadata?: Record<string, any>;
  rating?: number;
  reviews?: number;
  views?: number;
  isPremium?: boolean;
  purpose?: string;
  isVerified?: boolean;
  imageCount?: number;
  features?: Array<{
    label: string;
    value: string;
    icon?: 'bed' | 'bath' | 'area' | 'garage' | 'custom';
  }>;
  tags?: string[];
}

interface ItemsSectionProps {
  title: string;
  subtitle?: string;
  endpoint: string;
  icon?: string;
}

const ItemsSection: React.FC<ItemsSectionProps> = ({
  title,
  subtitle,
  endpoint,
  icon = '🔥',
}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const parseMetadata = useCallback((item: any): Record<string, any> => {
    const raw = item?.metadata ?? item?.item_metadata ?? {};
    if (raw && typeof raw === 'object') {
      return raw;
    }

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }

    return {};
  }, []);

  const normalizeItem = useCallback((item: any): Item => ({
    id: String(item.id),
    title: item.title,
    price: Number(item.price || 0),
    image: item.image || item.image_url || 'https://via.placeholder.com/800x600?text=No+Image+Available',
    location: item.location || 'Gondar',
    category: item.category || item.category_name || '',
    subcity: item.subcity || item.sub_city || item.subCity || '',
    kebele: item.kebele || item.kebele_name || '',
    metadata: parseMetadata(item),
    rating: Number(item.rating || item.avg_rating || 0),
    reviews: Number(item.reviews || item.rating_count || 0),
    views: Number(item.views || 0),
    isPremium: Boolean(item.isPremium || item.premium),
    purpose: item.purpose || item.transaction_type,
    isVerified: Boolean(item.verified || item.owner?.verified),
    imageCount: Number(item.imageCount || item.images?.length || 0),
    features: Array.isArray(item.features)
      ? item.features.map((feature: string) => ({ label: feature, value: feature, icon: 'custom' }))
      : [
          item.specifications?.bedrooms && {
            label: 'Beds',
            value: String(item.specifications.bedrooms),
            icon: 'bed',
          },
          item.specifications?.bathrooms && {
            label: 'Baths',
            value: String(item.specifications.bathrooms),
            icon: 'bath',
          },
          item.specifications?.area && {
            label: 'Area',
            value: String(item.specifications.area),
            icon: 'area',
          },
          item.specifications?.garage && {
            label: 'Garage',
            value: String(item.specifications.garage),
            icon: 'garage',
          },
        ].filter(Boolean),
    tags: Array.isArray(item.tags) ? item.tags : Array.isArray(item.highlights) ? item.highlights : [],
  }), [parseMetadata]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
          const response = await api.get(endpoint);
          const data = response.data;
          if (Array.isArray(data)) {
            setItems(data.map(normalizeItem));
          } else if (data?.items) {
            setItems(data.items.map(normalizeItem));
          } else {
            setItems([]);
          }
      } catch (error) {
        console.error(`Failed to fetch items from ${endpoint}:`, error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    // Load favorites from localStorage (prefer favorites_v1)
    try {
      const raw = localStorage.getItem('favorites_v1') || localStorage.getItem('favorites') || '[]';
      const parsed = JSON.parse(raw);
      const ids = Array.isArray(parsed) ? parsed.map(String) : Object.keys(parsed || {}).map(String);
      setFavorites(new Set(ids));
    } catch {}

    fetchItems();
  }, [endpoint, normalizeItem]);

  const handleFavoriteToggle = (itemId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(itemId)) {
      newFavorites.delete(itemId);
    } else {
      newFavorites.add(itemId);
    }
    setFavorites(newFavorites);
    const updated = Array.from(newFavorites);
    localStorage.setItem('favorites_v1', JSON.stringify(updated));
    localStorage.setItem('favorites', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('favorites:changed', { detail: { action: newFavorites.has(itemId) ? 'added' : 'removed', item: { id: itemId } } }));

    // Call API to save favorite
    api.post('/favorites', { item_id: itemId }).catch(console.error);
  };

  if (loading) {
    return (
      <div className="py-12 px-5">
        <div className="max-w-[1280px] mx-auto">
          <div className="h-10 bg-neutral-200 rounded-lg w-64 mb-4"></div>
          <div className="h-6 bg-neutral-100 rounded-lg w-80 mb-10"></div>
          <div className="grid grid-cols-3 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-neutral-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  return (
    <section className="py-12 px-5 bg-neutral-50 border-b border-neutral-200">
      <div className="max-w-[1280px] mx-auto">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <span>{icon}</span>
            {title}
          </h2>
          {subtitle && (
            <p className="text-neutral-600">{subtitle}</p>
          )}
        </div>

        {/* Items Rows (horizontal scrolling rows of up to 20 cards) */}
        {items.length > 0 ? (
          chunkArray(items, 20).map((row, rowIndex) => (
            <HorizontalRow key={`row-${rowIndex}`} ariaLabel={`${title} row ${rowIndex + 1}`}>
              {row.map((item) => (
                <ItemCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  price={item.price}
                  image={item.image}
                  location={item.location}
                  category={item.category}
                  subcity={item.subcity}
                  kebele={item.kebele}
                  metadata={item.metadata}
                  rating={item.rating}
                  reviews={item.reviews}
                  isFavorited={favorites.has(item.id)}
                  isPremium={item.isPremium}
                  isVerified={item.isVerified}
                  views={item.views}
                  imageCount={item.imageCount}
                  tags={item.tags}
                  type={item.purpose === 'rent' ? 'rent' : 'sell'}
                  onFavoriteToggle={handleFavoriteToggle}
                  className="flex-shrink-0 w-[320px] snap-start"
                />
              ))}
            </HorizontalRow>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-neutral-500 text-lg">No items found</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ItemsSection;
