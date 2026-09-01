import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Home, Truck, Zap } from 'lucide-react';
import DesktopNavbar from '../components/desktop/DesktopNavbar';
import Footer from '../components/desktop/Footer';
import ItemCard from '../components/desktop/ItemCard';
import HorizontalRow from '../components/desktop/HorizontalRow';
import api from '../services/api';

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

const categoryIcons: Record<string, React.ReactNode> = {
  homes: <Home className="w-8 h-8" />,
  vehicles: <Truck className="w-8 h-8" />,
  'event materials': <Zap className="w-8 h-8" />,
};

const DesktopCategoryPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [items, setItems] = useState<Item[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [showSkeleton, setShowSkeleton] = useState(false);
  const skeletonTimerRef = useRef<number | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const parseMetadata = useCallback((item: any): Record<string, any> => {
    const raw = item?.metadata ?? item?.item_metadata ?? {};
    if (raw && typeof raw === 'object') return raw;
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
      ? item.features.map((feature: string) => ({ label: feature, value: feature, icon: 'custom' as const }))
      : [
          item.specifications?.bedrooms && { label: 'Beds', value: String(item.specifications.bedrooms), icon: 'bed' as const },
          item.specifications?.bathrooms && { label: 'Baths', value: String(item.specifications.bathrooms), icon: 'bath' as const },
          item.specifications?.area && { label: 'Area', value: String(item.specifications.area), icon: 'area' as const },
          item.specifications?.garage && { label: 'Garage', value: String(item.specifications.garage), icon: 'garage' as const },
        ].filter(Boolean) as Item['features'],
    tags: Array.isArray(item.tags) ? item.tags : Array.isArray(item.highlights) ? item.highlights : [],
  }), [parseMetadata]);

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setShowSkeleton(false);
        if (skeletonTimerRef.current) {
          clearTimeout(skeletonTimerRef.current);
          skeletonTimerRef.current = null;
        }
        skeletonTimerRef.current = window.setTimeout(() => setShowSkeleton(true), 300);

        const response = await api.get(`/categories/${categoryId}`);
        if (response.data?.category) {
          setCategoryName(response.data.category.name);
          setItems((response.data.category.items || []).map(normalizeItem));
        }
      } catch {
        try {
          const searchResponse = await api.get(`/items?category=${categoryId}`);
          const fetchedItems = searchResponse.data?.items || [];
          const displayName = categoryId
            ? categoryId.charAt(0).toUpperCase() + categoryId.slice(1).replace('-', ' ')
            : '';
          setCategoryName(displayName);
          setItems(fetchedItems.map(normalizeItem));
        } catch (searchError) {
          console.error('Failed to fetch items for category:', searchError);
        }
      } finally {
        if (skeletonTimerRef.current) {
          clearTimeout(skeletonTimerRef.current);
          skeletonTimerRef.current = null;
        }
        setShowSkeleton(false);
      }
    };

    try {
      const raw = localStorage.getItem('favorites_v1') || localStorage.getItem('favorites') || '[]';
      const parsed = JSON.parse(raw);
      const ids = Array.isArray(parsed) ? parsed.map(String) : Object.keys(parsed || {}).map(String);
      setFavorites(new Set(ids));
    } catch {}

    if (categoryId) fetchCategory();

    return () => {
      if (skeletonTimerRef.current) {
        clearTimeout(skeletonTimerRef.current);
        skeletonTimerRef.current = null;
      }
    };
  }, [categoryId, normalizeItem]);

  const handleFavoriteToggle = (itemId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(itemId)) newFavorites.delete(itemId);
    else newFavorites.add(itemId);
    setFavorites(newFavorites);
    const updated = Array.from(newFavorites);
    localStorage.setItem('favorites_v1', JSON.stringify(updated));
    localStorage.setItem('favorites', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('favorites:changed', {
      detail: { action: newFavorites.has(itemId) ? 'added' : 'removed', item: { id: itemId } }
    }));
  };

  const icon = categoryIcons[categoryName.toLowerCase()] || categoryIcons['homes'];

  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  };

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <DesktopNavbar transactionType="all" onTransactionTypeChange={() => {}} />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-[#6C3BFF]">{icon}</div>
              <div>
                <h1 className="text-4xl font-bold text-neutral-900">{categoryName}</h1>
                <p className="text-neutral-600 text-lg">
                  Discover {items.length} amazing listings in {categoryName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6 mt-8">
              <div className="bg-white rounded-lg p-6 shadow-soft">
                <p className="text-neutral-600 text-sm">Total Listings</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">{items.length}</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-soft">
                <p className="text-neutral-600 text-sm">Average Price</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">
                  ${(items.reduce((sum, item) => sum + item.price, 0) / (items.length || 1)).toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-soft">
                <p className="text-neutral-600 text-sm">Average Rating</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">
                  {(items.reduce((sum, item) => sum + (item.rating || 0), 0) / (items.length || 1)).toFixed(1)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-soft">
                <p className="text-neutral-600 text-sm">Total Views</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">
                  {((items.reduce((sum, item) => sum + (item.views || 0), 0)) / 1000).toFixed(1)}k
                </p>
              </div>
            </div>
          </div>

          {showSkeleton ? (
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-64 bg-neutral-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : items.length > 0 ? (
            <>
              {chunkArray(items, 20).map((row, rowIndex) => (
                <HorizontalRow key={`row-${rowIndex}`} ariaLabel={`${categoryName} row ${rowIndex + 1}`}>
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
              ))}
            </>
          ) : (
            <div className="text-center py-24">
              <p className="text-neutral-600 text-lg mb-4">No listings found in {categoryName}</p>
              <p className="text-neutral-500 text-sm">Check back soon for new listings in this category</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DesktopCategoryPage;
