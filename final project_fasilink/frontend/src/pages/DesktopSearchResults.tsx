import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Filter,
  Grid2X2,
  List,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import DesktopNavbar from '../components/desktop/DesktopNavbar';
import Footer from '../components/desktop/Footer';
import HomepageListingCard, { HomepageListing } from '../components/desktop/HomepageListingCard';
import api from '../services/api';
import { categoryLabelFromSlug } from '../utils/categoryUtils';

interface SearchItem extends HomepageListing {
  status: string;
  subcity: string;
  kebele: string;
}

type SortOption = 'newest' | 'price_low' | 'price_high';
type ViewOption = 'grid' | 'list';

const PAGE_SIZE = 18;
const API_PAGE_SIZE = 500;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readText = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const readNumber = (value: unknown): number => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
};

const readFlag = (value: unknown): boolean =>
  value === true || value === 1 || (typeof value === 'string' && value.trim().toLowerCase() === 'true');

const readMetadata = (value: unknown): Record<string, unknown> | undefined => {
  if (isRecord(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : undefined;
  } catch (error) {
    console.warn('Ignoring invalid listing metadata in search results:', error);
    return undefined;
  }
};

const normalizeItem = (value: unknown): SearchItem | null => {
  if (!isRecord(value) || value.id === null || value.id === undefined) return null;
  const images = Array.isArray(value.images)
    ? value.images.filter((image): image is string => typeof image === 'string' && Boolean(image.trim()))
    : [];
  const ownerRecord = isRecord(value.owner) ? value.owner : undefined;
  const metadata = readMetadata(value.metadata ?? value.item_metadata);
  const ownerIdValue = ownerRecord?.id ?? value.owner_id;
  const ownerId = typeof ownerIdValue === 'string' || typeof ownerIdValue === 'number'
    ? String(ownerIdValue).trim()
    : '';
  const ownerName = readText(ownerRecord?.name, value.owner_name);
  const ownerAvatar = readText(ownerRecord?.avatar, ownerRecord?.avatar_url, ownerRecord?.profile_image, value.owner_avatar);
  const ownerPhone = readText(ownerRecord?.phone, ownerRecord?.phone_number, value.contact_phone, value.phone);
  const ownerVerified = readFlag(ownerRecord?.verified) || readFlag(value.owner_verified) || readFlag(value.verified);
  const purpose = readText(value.purpose, value.transaction_type).toLowerCase();
  return {
    id: String(value.id),
    title: readText(value.title, value.name) || 'Untitled listing',
    price: readNumber(value.price),
    image: readText(value.image, value.image_url, images[0]),
    images,
    location: readText(value.location, value.subcity, value.kebele) || 'Location not provided',
    category: readText(value.category, value.category_name) || 'Other',
    isPremium: readFlag(value.isPremium) || readFlag(value.premium),
    purpose: /rent/.test(purpose) ? 'rent' : /sell|sale/.test(purpose) ? 'sell' : purpose,
    createdAt: readText(value.created_at, value.createdAt),
    status: readText(value.status).toLowerCase(),
    subcity: readText(value.subcity, value.sub_city, value.subCity),
    kebele: readText(value.kebele, value.kebele_name),
    metadata,
    specifications: readMetadata(value.specifications),
    owner: ownerId || ownerName || ownerAvatar || ownerPhone || ownerVerified
      ? { id: ownerId, name: ownerName, avatar: ownerAvatar, phone: ownerPhone, verified: ownerVerified }
      : undefined,
    rating: readNumber(value.rating ?? value.avg_rating),
    reviews: readNumber(value.reviews ?? value.rating_count),
    billingPeriod: readText(value.billing_period, value.rent_period, metadata?.billing_period, metadata?.rent_period) || undefined,
  };
};

const parseOptionalAmount = (value: string): number | null => {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const DesktopSearchResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const transactionType = searchParams.get('type') || 'all';
  const minPrice = searchParams.get('min') || '';
  const maxPrice = searchParams.get('max') || '';
  const locationFilter = searchParams.get('location') || '';
  const sortBy = (searchParams.get('sort') || 'newest') as SortOption;
  const view = (searchParams.get('view') || 'grid') as ViewOption;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const isVehicleCategory = ['vehicle', 'vehicles', 'car', 'cars'].includes(category.trim().toLowerCase());
  const cardLayout: ViewOption = isVehicleCategory ? 'list' : view;

  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [draftQuery, setDraftQuery] = useState(query);
  const [draftLocation, setDraftLocation] = useState(locationFilter);
  const [draftMinPrice, setDraftMinPrice] = useState(minPrice);
  const [draftMaxPrice, setDraftMaxPrice] = useState(maxPrice);

  useEffect(() => {
    setDraftQuery(query);
    setDraftLocation(locationFilter);
    setDraftMinPrice(minPrice);
    setDraftMaxPrice(maxPrice);
  }, [location.search, query, locationFilter, minPrice, maxPrice]);

  useEffect(() => {
    if (draftQuery === query && draftLocation === locationFilter) return undefined;
    const timeout = window.setTimeout(() => {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        const nextQuery = draftQuery.trim();
        const nextLocation = draftLocation.trim();
        if (nextQuery) next.set('q', nextQuery);
        else next.delete('q');
        if (nextLocation) next.set('location', nextLocation);
        else next.delete('location');
        next.set('page', '1');
        return next;
      }, { replace: true });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [draftQuery, draftLocation, query, locationFilter, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    const fetchResults = async () => {
      try {
        setLoading(true);
        setFetchError('');
        const fetched: SearchItem[] = [];
        let offset = 0;
        let pageItems: unknown[];

        do {
          const params: Record<string, string | number> = { limit: API_PAGE_SIZE, offset };
          if (query.trim()) params.q = query.trim();
          if (category.trim()) params.category = category.trim();

          const response = await api.get('/items', { params });
          const data: unknown = response.data;
          if (Array.isArray(data)) {
            pageItems = data;
          } else if (isRecord(data) && Array.isArray(data.items)) {
            pageItems = data.items;
          } else {
            throw new Error('The listings response did not include an items array.');
          }
          fetched.push(...pageItems.map(normalizeItem).filter((item): item is SearchItem => item !== null));
          offset += pageItems.length;
        } while (pageItems.length === API_PAGE_SIZE);

        if (!cancelled) setItems(fetched);
      } catch (error) {
        console.error('Failed to fetch search results:', error);
        if (!cancelled) {
          setItems([]);
          setFetchError('Could not load results. Please check your connection.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchResults();
    return () => {
      cancelled = true;
    };
  }, [query, category]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const matchingItems = useMemo(() => {
    const minimum = parseOptionalAmount(minPrice);
    const maximum = parseOptionalAmount(maxPrice);
    const place = locationFilter.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (item.status !== 'active') return false;
      if (transactionType !== 'all' && item.purpose !== transactionType) return false;
      if (minimum !== null && item.price < minimum) return false;
      if (maximum !== null && item.price > maximum) return false;
      if (place && ![item.location, item.subcity, item.kebele].join(' ').toLowerCase().includes(place)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'price_low') return a.price - b.price;
      if (sortBy === 'price_high') return b.price - a.price;
      return Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '');
    });
  }, [items, transactionType, minPrice, maxPrice, locationFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(matchingItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = matchingItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const updateParams = (updates: Record<string, string>, resetPage = true, replace = false) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    if (resetPage) next.set('page', '1');
    setSearchParams(next, { replace });
  };

  const clearFilters = () => {
    setDraftQuery('');
    setDraftLocation('');
    setDraftMinPrice('');
    setDraftMaxPrice('');
    setSearchParams(new URLSearchParams());
    setShowFilters(false);
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParams({
      q: draftQuery.trim(),
      location: draftLocation.trim(),
      min: draftMinPrice.trim(),
      max: draftMaxPrice.trim(),
    });
    setShowFilters(false);
  };

  const submitTopSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParams({
      q: draftQuery.trim(),
      location: draftLocation.trim(),
      category,
      type: transactionType === 'all' ? '' : transactionType,
      min: minPrice,
      max: maxPrice,
    });
  };

  const removeFilter = (key: string) => updateParams({ [key]: '' });

  const activeChips = [
    ...(query ? [{ key: 'q', label: `Search: ${query}` }] : []),
    ...(category ? [{ key: 'category', label: `Category: ${categoryLabelFromSlug(category)}` }] : []),
    ...(transactionType !== 'all' ? [{ key: 'type', label: transactionType === 'rent' ? 'For rent' : 'For sale' }] : []),
    ...(minPrice || maxPrice
      ? [{ key: 'price', label: `Price: ${minPrice ? `ETB ${Number(minPrice).toLocaleString()}` : 'Any'} – ${maxPrice ? `ETB ${Number(maxPrice).toLocaleString()}` : 'Any'}` }]
      : []),
    ...(locationFilter ? [{ key: 'location', label: `Location: ${locationFilter}` }] : []),
  ];

  const removeChip = (key: string) => {
    if (key === 'price') updateParams({ min: '', max: '' });
    else removeFilter(key);
  };

  const filterControls = (
    <form onSubmit={applyFilters} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-950">Filters</h2>
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-md text-sm font-semibold text-[#5D38C9] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(false)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF] lg:hidden"
          aria-label="Close filters"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <label className="block space-y-2 text-sm font-semibold text-slate-800">
        Category
        <select
          value={category}
          onChange={(event) => updateParams({ category: event.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
        >
          <option value="">All categories</option>
          {categories.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-800">Rent or sell</legend>
        <div className="grid grid-cols-3 gap-2">
          {(['all', 'rent', 'sell'] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={transactionType === type}
              onClick={() => updateParams({ type: type === 'all' ? '' : type })}
              className={`rounded-xl border px-2 py-2 text-sm font-semibold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF] ${transactionType === type ? 'border-[#6C3BFF] bg-[#F0EBFF] text-[#4C2BAC]' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'}`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-800">Price range (ETB)</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="sr-only" htmlFor="filter-min-price">Minimum price</label>
          <input
            id="filter-min-price"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Min"
            value={draftMinPrice}
            onChange={(event) => setDraftMinPrice(event.target.value)}
            className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
          />
          <label className="sr-only" htmlFor="filter-max-price">Maximum price</label>
          <input
            id="filter-max-price"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Max"
            value={draftMaxPrice}
            onChange={(event) => setDraftMaxPrice(event.target.value)}
            className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
          />
        </div>
      </fieldset>

      <label className="block space-y-2 text-sm font-semibold text-slate-800">
        Location
        <span className="relative block">
          <MapPin aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={draftLocation}
            onChange={(event) => setDraftLocation(event.target.value)}
            placeholder="City, subcity, or kebele"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
          />
        </span>
      </label>

      <button
        type="submit"
        className="w-full rounded-xl bg-[#6C3BFF] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#582FE0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6C3BFF]/30"
      >
        Apply filters
      </button>
    </form>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6FF] text-slate-900">
      <DesktopNavbar transactionType="all" onTransactionTypeChange={() => {}} />
      <main className="flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <form
            onSubmit={submitTopSearch}
            className="mb-7 grid gap-2 rounded-3xl border border-white bg-white p-3 shadow-[0_14px_40px_rgba(37,31,83,0.08)] sm:grid-cols-2 lg:grid-cols-[minmax(200px,1.5fr)_minmax(155px,1fr)_minmax(130px,0.8fr)_minmax(175px,1fr)_auto]"
            role="search"
            aria-label="Search listings"
          >
            <label className="sr-only" htmlFor="results-search">Search listings</label>
            <span className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="results-search"
                type="search"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Search listings"
                className="w-full rounded-2xl border border-transparent bg-[#F8F7FC] py-3 pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
              />
            </span>
            <label className="sr-only" htmlFor="top-category">Category</label>
            <select
              id="top-category"
              value={category}
              onChange={(event) => updateParams({ category: event.target.value })}
              className="rounded-2xl border border-transparent bg-[#F8F7FC] px-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
            >
              <option value="">All categories</option>
              {categories.map((name) => <option key={name} value={name}>{name}</option>)}
              {category && !categories.includes(category) && (
                <option value={category}>{categoryLabelFromSlug(category)}</option>
              )}
            </select>
            <label className="sr-only" htmlFor="top-transaction-type">Rent or sell</label>
            <select
              id="top-transaction-type"
              value={transactionType}
              onChange={(event) => updateParams({ type: event.target.value === 'all' ? '' : event.target.value })}
              className="rounded-2xl border border-transparent bg-[#F8F7FC] px-3 py-3 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
            >
              <option value="all">Rent or sell</option>
              <option value="rent">Rent</option>
              <option value="sell">Sell</option>
            </select>
            <label className="sr-only" htmlFor="top-location">Location</label>
            <input
              id="top-location"
              type="search"
              value={draftLocation}
              onChange={(event) => setDraftLocation(event.target.value)}
              placeholder="Location"
              className="rounded-2xl border border-transparent bg-[#F8F7FC] px-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6C3BFF] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#582FE0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6C3BFF]/30"
            >
              <Search aria-hidden="true" className="h-4 w-4" />
              Search
            </button>
          </form>

          <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="hidden rounded-3xl border border-white bg-white p-5 shadow-[0_12px_32px_rgba(37,31,83,0.07)] lg:sticky lg:top-24 lg:block">
              {filterControls}
            </aside>

            <section className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                    {matchingItems.length.toLocaleString()} items found
                  </h1>
                  {category && (
                    <p className="mt-1 text-sm text-slate-600">{categoryLabelFromSlug(category)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFilters(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF] lg:hidden"
                  >
                    <Filter aria-hidden="true" className="h-4 w-4 text-[#6C3BFF]" />
                    Filters
                  </button>
                  <label className="sr-only" htmlFor="results-sort">Sort results</label>
                  <select
                    id="results-sort"
                    value={sortBy}
                    onChange={(event) => updateParams({ sort: event.target.value })}
                    className="max-w-[155px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
                  >
                    <option value="newest">Newest</option>
                    <option value="price_low">Price: low to high</option>
                    <option value="price_high">Price: high to low</option>
                  </select>
                  <div className="flex rounded-xl border border-slate-200 bg-white p-1" aria-label="Results layout">
                    <button
                      type="button"
                      onClick={() => updateParams({ view: 'grid' }, false)}
                      aria-label="Grid view"
                      aria-pressed={view === 'grid'}
                      disabled={isVehicleCategory}
                      className={`rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF] disabled:cursor-not-allowed disabled:opacity-40 ${view === 'grid' && !isVehicleCategory ? 'bg-[#EEE9FF] text-[#5630C6]' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      <Grid2X2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateParams({ view: 'list' }, false)}
                      aria-label="List view"
                      aria-pressed={cardLayout === 'list'}
                      className={`rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF] ${cardLayout === 'list' ? 'bg-[#EEE9FF] text-[#5630C6]' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      <List aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {activeChips.length > 0 && (
                <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Active filters">
                  {activeChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => removeChip(chip.key)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-[#F0EBFF] px-3 py-1.5 text-xs font-semibold text-[#4C2BAC] hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
                    >
                      {chip.label}
                      <X aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {fetchError ? (
                <div role="alert" className="rounded-3xl border border-rose-200 bg-white px-6 py-12 text-center shadow-sm">
                  <p className="text-lg font-semibold text-rose-800">{fetchError}</p>
                </div>
              ) : loading ? (
                <div className={`grid gap-5 ${cardLayout === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`} aria-label="Loading results">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div
                      key={index}
                      className={`animate-pulse overflow-hidden rounded-3xl border border-white bg-white shadow-sm ${cardLayout === 'list' ? 'flex flex-col sm:flex-row' : 'p-3'}`}
                    >
                      <div className={`bg-slate-200 ${cardLayout === 'grid' ? 'aspect-[4/3] rounded-2xl' : 'aspect-[4/3] w-full sm:aspect-auto sm:min-h-[180px] sm:w-[30%]'}`} />
                      <div className={`flex flex-1 flex-col justify-center ${cardLayout === 'grid' ? 'p-1 pt-4' : 'p-4'}`}>
                        <div className="h-4 w-4/5 rounded bg-slate-200" />
                        <div className="mt-3 h-4 w-3/5 rounded bg-slate-100" />
                        {cardLayout === 'list' && <div className="mt-4 h-6 w-2/3 rounded-full bg-slate-100" />}
                      </div>
                      {cardLayout === 'list' && (
                        <div className="flex items-center justify-between border-t border-slate-100 p-4 sm:w-48 sm:flex-col sm:justify-center sm:border-l sm:border-t-0">
                          <div className="h-5 w-24 rounded bg-slate-200" />
                          <div className="h-10 w-24 rounded-xl bg-slate-100" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : visibleItems.length > 0 ? (
                <>
                  <div className={cardLayout === 'grid' ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3' : 'grid grid-cols-1 gap-4'}>
                    {visibleItems.map((item) => (
                      <HomepageListingCard
                        key={item.id}
                        item={item}
                        variant="search"
                        layout={cardLayout}
                        className={cardLayout === 'list' ? 'min-h-[180px]' : ''}
                      />
                    ))}
                  </div>
                  {pageCount > 1 && (
                    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Search results pages">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => updateParams({ page: String(currentPage - 1) }, false)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF] disabled:opacity-40"
                      >
                        Previous
                      </button>
                      {Array.from({ length: pageCount }, (_, index) => index + 1)
                        .filter((pageNumber) => pageNumber === 1 || pageNumber === pageCount || Math.abs(pageNumber - currentPage) <= 2)
                        .map((pageNumber) => (
                          <button
                            key={pageNumber}
                            type="button"
                            onClick={() => updateParams({ page: String(pageNumber) }, false)}
                            aria-current={pageNumber === currentPage ? 'page' : undefined}
                            className={`h-10 min-w-10 rounded-xl px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF] ${pageNumber === currentPage ? 'bg-[#6C3BFF] text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-violet-300'}`}
                          >
                            {pageNumber}
                          </button>
                        ))}
                      <button
                        type="button"
                        disabled={currentPage >= pageCount}
                        onClick={() => updateParams({ page: String(currentPage + 1) }, false)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF] disabled:opacity-40"
                      >
                        Next
                      </button>
                    </nav>
                  )}
                </>
              ) : (
                <div className="rounded-3xl border border-white bg-white px-6 py-14 text-center shadow-[0_12px_32px_rgba(37,31,83,0.06)]">
                  <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0EBFF] text-[#6C3BFF]">
                    <SlidersHorizontal aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <h2 className="mt-4 text-xl font-bold text-slate-950">No items match your filters</h2>
                  <p className="mt-2 text-sm text-slate-600">Try changing or clearing your search filters.</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 rounded-xl bg-[#6C3BFF] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#582FE0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6C3BFF]/30"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />

      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Search filters">
          <button
            type="button"
            onClick={() => setShowFilters(false)}
            className="absolute inset-0 h-full w-full bg-slate-950/35"
            aria-label="Close filters drawer"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,360px)] overflow-y-auto rounded-r-3xl bg-white p-5 shadow-2xl">
            {filterControls}
          </aside>
        </div>
      )}
    </div>
  );
};

export default DesktopSearchResults;
