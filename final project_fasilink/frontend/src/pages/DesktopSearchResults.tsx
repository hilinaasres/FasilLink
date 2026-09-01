import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import DesktopNavbar from '../components/desktop/DesktopNavbar';
import Footer from '../components/desktop/Footer';
import ItemCard from '../components/desktop/ItemCard';
import HorizontalRow from '../components/desktop/HorizontalRow';
import Button from '../components/desktop/Button';
import api, { API_BASE_URL } from '../services/api';
import { categoryLabelFromSlug } from '../utils/categoryUtils';

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
  isFeatured?: boolean;
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

interface Filters {
  priceMin: number;
  priceMax: number;
  location: string;
  sortBy: 'newest' | 'price_low' | 'price_high' | 'popular' | 'rating';
}

const DesktopSearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const typeParam = searchParams.get('type') || 'all';
  const [items, setItems] = useState<Item[]>([]);
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [filters, setFilters] = useState<Filters>({
    priceMin: 0,
    priceMax: 100000,
    location: '',
    sortBy: 'newest',
  });

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
          item.specifications?.bedrooms && { label: 'Beds', value: String(item.specifications.bedrooms), icon: 'bed' },
          item.specifications?.bathrooms && { label: 'Baths', value: String(item.specifications.bathrooms), icon: 'bath' },
          item.specifications?.area && { label: 'Area', value: String(item.specifications.area), icon: 'area' },
          item.specifications?.garage && { label: 'Garage', value: String(item.specifications.garage), icon: 'garage' },
        ].filter(Boolean) as Item['features'],
    tags: Array.isArray(item.tags) ? item.tags : Array.isArray(item.highlights) ? item.highlights : [],
  }), [parseMetadata]);

  const buildSearchParams = (params: Record<string, string | number | undefined>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    return searchParams.toString();
  };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        setNotice('');
        setFetchError('');

        const baseParams: Record<string, string | number | undefined> = {
          category: categoryParam || undefined,
          transaction_type: typeParam !== 'all' ? typeParam : undefined,
          priceMin: filters.priceMin || undefined,
          priceMax: filters.priceMax || undefined,
          location: filters.location || undefined,
          sortBy: filters.sortBy,
          purpose: location.pathname.includes('rent')
            ? 'rent'
            : location.pathname.includes('sell')
              ? 'sell'
              : undefined,
        };

        const firstParams = {
          ...baseParams,
          q: query || undefined,
          search: query || undefined,
        };

        const firstUrl = `${API_BASE_URL}/items?${buildSearchParams(firstParams)}`;
        console.log('[DesktopSearchResults] Fetching exact search results:', firstUrl);

        const response = await api.get('/items', { params: firstParams });
        console.log('[DesktopSearchResults] Response for exact search:', response.data);

        let allItems = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.items)
            ? response.data.items
            : [];

        if (query && allItems.length === 0) {
          const retryParams = {
            ...baseParams,
          };
          const retryUrl = `${API_BASE_URL}/items?${buildSearchParams(retryParams)}`;
          console.log('[DesktopSearchResults] No exact matches found. Retrying with category and transaction filters only:', retryUrl);

          const retryResponse = await api.get('/items', { params: retryParams });
          console.log('[DesktopSearchResults] Response for fallback search:', retryResponse.data);

          allItems = Array.isArray(retryResponse.data)
            ? retryResponse.data
            : Array.isArray(retryResponse.data?.items)
              ? retryResponse.data.items
              : [];

          if (allItems.length > 0) {
            setNotice('No exact matches — showing similar listings');
          }
        }

        const normalizedItems = allItems.map(normalizeItem);
        const sortedItems = normalizedItems.sort((a: any, b: any) => {
          if (Boolean(a.isPremium) !== Boolean(b.isPremium)) {
            return Boolean(b.isPremium) ? 1 : -1;
          }

          if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) {
            return Boolean(b.isFeatured) ? 1 : -1;
          }

          return Number(new Date(b.createdAt || b.created_at || 0)) -
            Number(new Date(a.createdAt || a.created_at || 0));
        });
        setItems(sortedItems);
      } catch (error) {
        console.error('Failed to fetch search results:', error);
        setItems([]);
        setFetchError('Could not load results. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    // Load favorites (prefer favorites_v1)
    try {
      const raw = localStorage.getItem('favorites_v1') || localStorage.getItem('favorites') || '[]';
      const parsed = JSON.parse(raw);
      const ids = Array.isArray(parsed) ? parsed.map(String) : Object.keys(parsed || {}).map(String);
      setFavorites(new Set(ids));
    } catch {}

    fetchResults();
  }, [query, filters, categoryParam, typeParam, location.pathname, normalizeItem]);

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
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <DesktopNavbar transactionType="all" onTransactionTypeChange={() => {}} />

      <main className="flex-1 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              {categoryParam
                ? categoryLabelFromSlug(categoryParam)
                : query
                  ? `Search Results for "${query}"`
                  : location.pathname === '/rent'
                    ? 'Rent Listings'
                    : location.pathname === '/sell'
                      ? 'Sell Listings'
                      : 'All Listings'}
            </h1>
            <p className="text-neutral-600">
              {categoryParam
                ? `Showing ${items.length} ${categoryLabelFromSlug(categoryParam).toLowerCase()} listing${items.length === 1 ? '' : 's'}`
                : `Found ${items.length} listing${items.length === 1 ? '' : 's'} matching your search`}
            </p>
          </div>

          <div className="flex gap-8">
            <div className={`${showFilters ? 'block' : 'hidden'} lg:block w-64 flex-shrink-0`}>
              <div className="bg-white rounded-lg p-6 shadow-soft sticky top-28 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-neutral-900">Filters</h3>
                  <button onClick={() => setShowFilters(false)} className="lg:hidden" aria-label="Close filters" title="Close filters">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-neutral-900">Price Range</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.priceMin}
                      onChange={(e) => handleFilterChange('priceMin', parseInt(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3BFF]"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.priceMax}
                      onChange={(e) => handleFilterChange('priceMax', parseInt(e.target.value) || 100000)}
                      className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3BFF]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-neutral-900">Location</label>
                  <input
                    type="text"
                    placeholder="Enter location"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3BFF]"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-neutral-900">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value as Filters['sortBy'])}
                    aria-label="Sort listings by"
                    title="Sort listings by"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3BFF]"
                  >
                    <option value="newest">Newest</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="popular">Most Popular</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                </div>

                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setFilters({
                      priceMin: 0,
                      priceMax: 100000,
                      location: '',
                      sortBy: 'newest',
                    });
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </div>

            <div className="flex-1">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden mb-6 flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>

              {fetchError ? (
                <div className="text-center py-16">
                  <p className="text-red-600 text-lg mb-4">{fetchError}</p>
                  <p className="text-neutral-500 text-sm">Please refresh the page or check your connection.</p>
                </div>
              ) : (
                <> 
                  {notice && (
                    <div className="mb-6 rounded-2xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
                      {notice}
                    </div>
                  )}
                  {loading ? (
                    <div className="grid grid-cols-4 gap-6">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="h-64 bg-neutral-200 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : items.length > 0 ? (
                    (() => {
                      const chunkArray = <T,>(arr: T[], size: number): T[][] => {
                        const chunks: T[][] = [];
                        for (let i = 0; i < arr.length; i += size) {
                          chunks.push(arr.slice(i, i + size));
                        }
                        return chunks;
                      };

                      return (
                        <>
                          {chunkArray(items, 20).map((row, rowIndex) => (
                            <HorizontalRow key={`row-${rowIndex}`} ariaLabel={`Search results row ${rowIndex + 1}`}>
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
                      );
                    })()
                  ) : (
                    <div className="text-center py-16">
                      <p className="text-neutral-600 text-lg mb-4">
                        {categoryParam
                          ? `No ${categoryLabelFromSlug(categoryParam).toLowerCase()} listings found`
                          : query
                            ? `No results found for "${query}"`
                            : 'No listings found'}
                      </p>
                      <p className="text-neutral-500 text-sm">Try adjusting your search or filters</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DesktopSearchResults;
