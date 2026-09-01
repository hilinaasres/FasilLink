import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import DesktopNavbar from '../components/desktop/DesktopNavbar';
import FloatingAIAssistant from '../components/desktop/FloatingAIAssistant';
import Footer from '../components/desktop/Footer';
import ItemCard from '../components/desktop/ItemCard';
import api from '../services/api';
import './DesktopHomepage.css';
import { loadOwnerItems, OwnerItem as OwnerPostedItem } from './owner/ownerStorage';

interface Item {
  id: string;
  title: string;
  price: number;
  image: string;
  location: string;
  category?: string;
  subcity?: string;
  kebele?: string;
  rating?: number;
  reviews?: number;
  isPremium?: boolean;
  isVerified?: boolean;
  imageCount?: number;
  purpose?: string;
  tags?: string[];
  createdAt?: string;
  created_at?: string;
  status?: string;
}

interface SearchSuggestion {
  id: string;
  title: string;
  category: string;
}

const heroImages = ['/hero1.jpg', '/hero2.png'];

const HOME_SECTION_CARD_COUNT = 14;
const PREMIUM_ROTATION_MS = 72 * 60 * 60 * 1000;
const RECENT_ROTATION_MS = 5 * 1000;
const PREMIUM_ROTATION_STORAGE_KEY = 'homepage-premium-rotation-start';
const RECENT_ROTATION_STORAGE_KEY = 'homepage-recent-rotation-start';

const sortByNewest = (a: Item, b: Item) => {
  const left = Number(new Date(b.createdAt || b.created_at || 0));
  const right = Number(new Date(a.createdAt || a.created_at || 0));
  return left - right;
};

const getStoredRotationSeed = (key: string) => {
  if (typeof window === 'undefined') return Date.now();

  try {
    const stored = window.localStorage.getItem(key);
    if (stored && !Number.isNaN(Number(stored))) {
      return Number(stored);
    }

    const now = Date.now();
    window.localStorage.setItem(key, String(now));
    return now;
  } catch {
    return Date.now();
  }
};

const buildCycledWindow = <T,>(items: T[], startIndex: number, size: number) => {
  if (items.length === 0) return [] as T[];
  const visible = Math.min(size, items.length);

  if (items.length <= visible) {
    return items.slice(0, visible);
  }

  const normalizedStart = ((startIndex % items.length) + items.length) % items.length;
  return Array.from({ length: visible }, (_, offset) => items[(normalizedStart + offset) % items.length]);
};

const formatCountdown = (durationMs: number) => {
  const safeDuration = Math.max(0, durationMs);
  const hours = Math.floor(safeDuration / (60 * 60 * 1000));
  const minutes = Math.floor((safeDuration % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((safeDuration % (60 * 1000)) / 1000);
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
};

const categoryMatch = (itemCategory: string | undefined, active: string) => {
  const normalized = String(itemCategory || '').toLowerCase();
  if (active === 'All') return true;
  if (active === 'Others') {
    return !['vehicles', 'homes', 'event materials', 'land', 'vehicle', 'home', 'event', 'property'].some((value) => normalized.includes(value));
  }
  return normalized.includes(active.toLowerCase());
};

const mapPostedItemToHomepageItem = (item: OwnerPostedItem): Item => ({
  id: item.id,
  title: item.title,
  price: item.price,
  image: item.images?.[0] || 'https://via.placeholder.com/640x480?text=No+Image',
  location: item.location || item.specialLocation || 'Gondar',
  category: item.category || 'Other',
  subcity: item.location || undefined,
  kebele: undefined,
  rating: undefined,
  reviews: undefined,
  isPremium: Boolean(item.premium),
  isVerified: false,
  imageCount: item.images?.length || 0,
  purpose: item.saleType,
  tags: [],
  createdAt: item.createdAt,
  status: item.status,
});

const DesktopHomepage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [transactionType, setTransactionType] = useState<'all' | 'rent' | 'sell'>('all');
  const [activeSlide, setActiveSlide] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setIsSearching] = useState(false);
  const [showQuickFilters, setShowQuickFilters] = useState(false);
  const [, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const navigate = useNavigate();

  const premiumRotationSeed = useMemo(() => getStoredRotationSeed(PREMIUM_ROTATION_STORAGE_KEY), []);
  const recentRotationSeed = useMemo(() => getStoredRotationSeed(RECENT_ROTATION_STORAGE_KEY), []);

  const getApiCategory = (category: string) => {
    if (!category || category === 'All') return undefined;
    return category;
  };

  const getApiTransaction = (type: 'all' | 'rent' | 'sell') => (type === 'all' ? undefined : type);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError('');

        const params: Record<string, string | number | undefined> = {
          limit: 100,
          q: submittedSearch || undefined,
          category: getApiCategory(activeCategory),
          transaction_type: getApiTransaction(transactionType),
        };

        const response = await api.get('/items', { params });
        const data = response.data;
        const allItems = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

        const fetchedItems: Item[] = allItems
          .map((item: any) => ({
            id: String(item.id),
            title: item.title || item.name || 'Untitled Listing',
            price: Number(item.price || item.amount || 0),
            image: item.image || item.image_url || item.images?.[0] || 'https://via.placeholder.com/640x480?text=No+Image',
            location: item.location || item.subcity || item.city || 'Unknown Location',
            category: item.category || item.category_name || item.transaction_type || 'Other',
            subcity: item.subcity,
            kebele: item.kebele,
            rating: Number(item.rating || item.avg_rating || 4.2),
            reviews: Number(item.reviews || item.rating_count || 0),
            isPremium: Boolean(item.premium || item.isPremium),
            isVerified: Boolean(item.verified || item.owner?.verified),
            imageCount: Number(item.imageCount || item.images?.length || 0),
            purpose: item.purpose || item.transaction_type,
            tags: Array.isArray(item.tags) ? item.tags : Array.isArray(item.highlights) ? item.highlights : [],
            createdAt: item.created_at || item.createdAt,
            status: String(item.status || item.status_label || '').toLowerCase(),
          }))
          .filter((item: any) => {
            const isActive = String(item.status || '').toLowerCase() === 'active';
            const matchesTransaction = transactionType === 'all' || item.purpose === transactionType;
            const matchesCategory = activeCategory === 'All'
              ? true
              : activeCategory === 'Others'
              ? categoryMatch(item.category, 'Others')
              : item.category?.toLowerCase().includes(activeCategory.toLowerCase());
            return isActive && matchesTransaction && matchesCategory;
          });

        const searchTerm = submittedSearch.trim().toLowerCase();
        const localItems = loadOwnerItems()
          .map(mapPostedItemToHomepageItem)
          .filter((item) => {
            const isActive = String(item.status || '').toLowerCase() === 'active';
            const matchesTransaction = transactionType === 'all' || item.purpose === transactionType;
            const matchesCategory = activeCategory === 'All'
              ? true
              : activeCategory === 'Others'
              ? categoryMatch(item.category, 'Others')
              : item.category?.toLowerCase().includes(activeCategory.toLowerCase());
            const matchesSearch = !searchTerm || [item.title, item.location, item.category]
              .join(' ')
              .toLowerCase()
              .includes(searchTerm);
            return isActive && matchesTransaction && matchesCategory && matchesSearch;
          });

        const localIds = new Set(localItems.map((item) => item.id));
        const combined = [...localItems, ...fetchedItems.filter((item) => !localIds.has(item.id))];
        combined.sort((a, b) =>
          Number(new Date(b.createdAt || b.created_at || 0)) -
          Number(new Date(a.createdAt || a.created_at || 0))
        );
        setItems(combined);
      } catch (error) {
        console.error('Failed to load homepage items', error);
        setItems([]);
        setError('Unable to load listings. Please try again.');
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    };

    fetchItems();
  }, [activeCategory, submittedSearch, transactionType]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (search.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await api.get('/items', {
          params: {
            q: search.trim(),
            limit: 5,
          },
        });
        const data = response.data;
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
            ? data.items
            : [];

        setSuggestions(rows.slice(0, 5).map((item: any) => ({
          id: String(item.id),
          title: item.title || item.name || 'Untitled',
          category: item.category || item.category_name || item.transaction_type || 'Other',
        })));
      } catch {
        setSuggestions([]);
      }
    };

    const timeout = window.setTimeout(fetchSuggestions, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = search.trim();
    setIsSearching(true);
    setSubmittedSearch(trimmed);
    setShowSuggestions(false);
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (activeCategory && activeCategory !== 'All') params.set('category', activeCategory);
    if (transactionType && transactionType !== 'all') params.set('type', transactionType);

    console.log('[DesktopHomepage] Search submit:', {
      search: trimmed,
      category: activeCategory,
      transactionType,
      url: `/search?${params.toString()}`,
    });

    navigate(`/search?${params.toString()}`);
  };

  const handleSearchInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleSuggestionClick = (itemId: string) => {
    setShowSuggestions(false);
    setSearch('');
    navigate(`/item/${itemId}`);
  };

  const toggleCategory = (category: string) => {
    setActiveCategory((current) => (current === category ? 'All' : category));
  };

  const toggleTransaction = (type: 'all' | 'rent' | 'sell') => {
    setTransactionType((current) => (current === type ? 'all' : type));
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroImages.length);
    }, 1500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const premiumItems = useMemo(
    () => items.filter((item) => item.isPremium).sort(sortByNewest),
    [items]
  );

  const recentItems = useMemo(
    () => [...items].sort(sortByNewest),
    [items]
  );

  const premiumWindowIndex = premiumItems.length > HOME_SECTION_CARD_COUNT
    ? (Math.floor((now - premiumRotationSeed) / PREMIUM_ROTATION_MS) * HOME_SECTION_CARD_COUNT) % premiumItems.length
    : 0;

  const recentWindowIndex = recentItems.length > HOME_SECTION_CARD_COUNT
    ? Math.floor((now - recentRotationSeed) / RECENT_ROTATION_MS) % recentItems.length
    : 0;

  const premiumWindow = buildCycledWindow(premiumItems, premiumWindowIndex, HOME_SECTION_CARD_COUNT);
  const recentWindow = buildCycledWindow(recentItems, recentWindowIndex, HOME_SECTION_CARD_COUNT);

  const premiumCountdownMs = PREMIUM_ROTATION_MS - ((now - premiumRotationSeed) % PREMIUM_ROTATION_MS);

  const renderListingRail = (
    title: string,
    subtitle: string,
    railItems: Item[],
    meta: React.ReactNode,
    emptyMessage: string,
  ) => (
    <section className="rounded-[28px] border border-white/80 bg-white/85 px-5 py-5 shadow-[0_18px_50px_rgba(31,41,55,0.08)] backdrop-blur-sm sm:px-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#6C3BFF]">{title}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">{subtitle}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
          {meta}
        </div>
      </div>

      {railItems.length > 0 ? (
        <div className="overflow-x-auto scrollbar-hidden pb-2">
          <div className="grid min-w-max grid-flow-col grid-rows-2 gap-5 auto-cols-[280px] sm:auto-cols-[300px] xl:auto-cols-[320px]">
            {railItems.map((item) => (
              <ItemCard
                key={`${title}-${item.id}`}
                id={item.id}
                title={item.title}
                price={item.price}
                image={item.image}
                location={item.location}
                category={item.category}
                subcity={item.subcity}
                kebele={item.kebele}
                rating={item.rating}
                reviews={item.reviews}
                isPremium={item.isPremium}
                isVerified={item.isVerified}
                imageCount={item.imageCount}
                type={item.purpose as 'rent' | 'sell'}
                tags={item.tags}
                className="w-full"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
          {emptyMessage}
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-[#F0EBFF] text-[#1F2937]">
      <DesktopNavbar transactionType={transactionType} onTransactionTypeChange={setTransactionType} />

      <main className="flex-1">

        {/* HERO */}
        <section className="relative overflow-hidden group">
          <div className="absolute inset-0">
            {heroImages.map((src, index) => (
              <div
                key={src}
                className={`absolute inset-0 transition-opacity duration-1000 ${index === activeSlide ? 'opacity-100' : 'opacity-0'}`}
              >
                <img
                  src={src}
                  alt={`Fasil Ghebbi slide ${index + 1}`}
                  className="hero-image h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
            ))}
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/30" />
          </div>

          <div className="relative mx-auto flex min-h-[420px] max-w-[1280px] flex-col justify-center gap-8 px-5 py-14 sm:px-8">

            {/* Headline */}
            <div className="max-w-3xl text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#C7D2FE]">FasilLink Marketplace</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Find Anything in FasilLink
              </h1>
              <p className="mt-3 max-w-xl text-lg leading-8 text-white/85">
                Smart Search. Better Results.
              </p>
            </div>

            {/* Search card */}
            <div className="w-full max-w-3xl rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md p-4 shadow-2xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">List by</p>
                <div className="inline-flex overflow-hidden rounded-full border border-white/30 bg-white/10 p-1">
                  {(['rent', 'sell'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTransactionType(t)}
                      className={`px-5 py-2 text-sm font-semibold rounded-full transition ${transactionType === t ? 'bg-white text-[#6D28D9] shadow' : 'text-white hover:bg-white/20'}`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSearchSubmit} className="relative flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      id="homepage-search"
                      value={search}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={handleSearchInputKeyDown}
                      placeholder="Search houses, cars, events... e.g. 2 bedroom house Azezo under 5000"
                      className="w-full rounded-xl border border-transparent bg-white px-5 py-3 pr-[52px] text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#6C3BFF]"
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      aria-label="Search listings"
                      className="absolute right-[6px] top-1/2 h-9 w-9 -translate-y-1/2 rounded-[8px] border-0 bg-[#7c6bf0] text-white shadow-sm transition hover:brightness-95"
                    >
                      <Search className="mx-auto h-4 w-4" />
                    </button>

                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 z-20 mt-2 rounded-3xl border border-slate-200 bg-white shadow-xl">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onMouseDown={() => handleSuggestionClick(suggestion.id)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-[#F3E8FF]"
                          >
                            <span>{suggestion.title}</span>
                            <span className="text-xs uppercase tracking-[0.15em] text-slate-400">{suggestion.category}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowQuickFilters((current) => !current)}
                    className="inline-flex h-[44px] items-center gap-2 rounded-xl border border-white/20 bg-[#2E3262]/70 px-4 text-sm font-medium text-white/90 transition hover:bg-[#2E3262]"
                    aria-label="Filters"
                    aria-controls="quick-filters-content"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7c6bf0]" />
                  </button>
                </div>

                {showQuickFilters && (
                  <div id="quick-filters-content">
                    <div className="flex flex-wrap gap-2">
                      {['All', 'Homes', 'Vehicles', 'Event Materials', 'Land'].map((category) => {
                        const active = activeCategory === category;
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? 'border-[#6C3BFF] bg-[#EEF2FF] text-[#4F46E5]' : 'border-slate-200 bg-white text-slate-700 hover:border-[#6C3BFF] hover:text-[#6C3BFF]'}`}
                          >
                            {category}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'All', value: 'all' as const },
                        { label: 'For Rent', value: 'rent' as const },
                        { label: 'For Sale', value: 'sell' as const },
                      ].map((option) => {
                        const active = transactionType === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleTransaction(option.value)}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? 'border-[#6C3BFF] bg-[#EEF2FF] text-[#4F46E5]' : 'border-slate-200 bg-white text-slate-700 hover:border-[#6C3BFF] hover:text-[#6C3BFF]'}`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Slide dots */}
            <div className="flex gap-2">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveSlide(i)}
                  aria-label={`View slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${i === activeSlide ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* LISTINGS */}
        <section className="px-5 pt-10 pb-8 md:px-8">
          <div className="mx-auto max-w-[1440px] space-y-8">
            {loading ? (
              <>
                <div className="rounded-[28px] border border-white/80 bg-white/85 px-5 py-5 shadow-[0_18px_50px_rgba(31,41,55,0.08)]">
                  <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="h-3 w-40 rounded-full bg-slate-200" />
                      <div className="mt-3 h-8 w-72 rounded-full bg-slate-200" />
                    </div>
                    <div className="h-4 w-48 rounded-full bg-slate-200" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="grid min-w-max grid-flow-col grid-rows-2 gap-5 auto-cols-[280px] sm:auto-cols-[300px] xl:auto-cols-[320px]">
                      {Array.from({ length: HOME_SECTION_CARD_COUNT }).map((_, index) => (
                        <div key={index} className="h-[420px] animate-pulse rounded-[24px] bg-slate-100" />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/80 bg-white/85 px-5 py-5 shadow-[0_18px_50px_rgba(31,41,55,0.08)]">
                  <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="h-3 w-40 rounded-full bg-slate-200" />
                      <div className="mt-3 h-8 w-72 rounded-full bg-slate-200" />
                    </div>
                    <div className="h-4 w-48 rounded-full bg-slate-200" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="grid min-w-max grid-flow-col grid-rows-2 gap-5 auto-cols-[280px] sm:auto-cols-[300px] xl:auto-cols-[320px]">
                      {Array.from({ length: HOME_SECTION_CARD_COUNT }).map((_, index) => (
                        <div key={index} className="h-[420px] animate-pulse rounded-[24px] bg-slate-100" />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {renderListingRail(
                  'Premium listings',
                  'Hand-picked premium items with a live 72-hour rotation',
                  premiumWindow,
                  <>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
                      {premiumItems.length} premium items
                    </span>
                    <span className="rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-1 text-[#4F46E5]">
                      Rotates in {formatCountdown(premiumCountdownMs)}
                    </span>
                  </>,
                  'No premium listings available yet.',
                )}

                {renderListingRail(
                  'Recent additions',
                  'Newest items cycle forward every 5 seconds',
                  recentWindow,
                  <>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                      {recentItems.length} recent items
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                      Refreshes every 5 seconds
                    </span>
                  </>,
                  'No recent additions found.',
                )}

                {items.length === 0 && (
                  <div className="rounded-[16px] bg-white p-10 text-center shadow-[0_12px_30px_rgba(26,26,26,0.08)]">
                    <p className="text-xl font-semibold text-[#1A1A1A]">No listings found</p>
                    <p className="mt-3 text-[#1A1A1A]/70">Try another category or search term.</p>
                    <Link
                      to="/"
                      className="mt-6 inline-flex rounded-full border border-[#6D28D9] bg-[#EEF2FF] px-6 py-3 text-sm font-semibold text-[#1F2937] transition hover:bg-[#6D28D9] hover:text-white"
                    >
                      Reset filters
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <FloatingAIAssistant />
      <Footer />
    </div>
  );
};

export default DesktopHomepage;