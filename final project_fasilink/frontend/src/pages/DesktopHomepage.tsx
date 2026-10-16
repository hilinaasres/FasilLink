import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CarFront, House, Map, Shapes } from 'lucide-react';
import DesktopNavbar from '../components/desktop/DesktopNavbar';
import FloatingAIAssistant from '../components/desktop/FloatingAIAssistant';
import Footer from '../components/desktop/Footer';
import HomepageListingCard, { HomepageListing } from '../components/desktop/HomepageListingCard';
import HomepageListingRail from '../components/desktop/HomepageListingRail';
import api from '../services/api';
import './DesktopHomepage.css';
import { loadOwnerItems, OwnerItem as OwnerPostedItem } from './owner/ownerStorage';
import heroBg from '../assets/hero-bg.webp';
import { useAuth } from '../context/AuthContext';
import { categorySlugFromName, searchPathForCategory } from '../utils/categoryUtils';

interface Item extends HomepageListing {
  status?: string;
}

const heroImages = ['/hero1.jpg', '/hero2.png'];

const featuredCategories = ['Homes', 'Vehicles', 'Land', 'Events'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readRecord = (...values: unknown[]): Record<string, unknown> | undefined => {
  for (const value of values) {
    if (isRecord(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed: unknown = JSON.parse(value);
        if (isRecord(parsed)) return parsed;
      } catch (error) {
        console.warn('Ignoring invalid listing metadata on homepage:', error);
      }
    }
  }
  return undefined;
};

const firstText = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const numberValue = (...values: unknown[]): number => {
  for (const value of values) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const isTrueFlag = (value: unknown) =>
  value === true || value === 1 || (typeof value === 'string' && value.trim().toLowerCase() === 'true');

const normalizeApiItem = (value: unknown): Item | null => {
  if (!isRecord(value) || value.id === undefined || value.id === null) return null;
  const images = Array.isArray(value.images)
    ? value.images.filter((image): image is string => typeof image === 'string' && Boolean(image.trim()))
    : [];
  const metadata = readRecord(value.metadata, value.item_metadata);
  const ownerRecord = isRecord(value.owner) ? value.owner : undefined;
  const ownerIdValue = ownerRecord?.id ?? value.owner_id;
  const ownerId = typeof ownerIdValue === 'string' || typeof ownerIdValue === 'number'
    ? String(ownerIdValue).trim()
    : '';
  const ownerName = firstText(ownerRecord?.name, value.owner_name);
  const ownerAvatar = firstText(ownerRecord?.avatar, ownerRecord?.avatar_url, ownerRecord?.profile_image, value.owner_avatar);
  const ownerPhone = firstText(ownerRecord?.phone, ownerRecord?.phone_number, value.contact_phone, value.phone);
  const ownerVerified = isTrueFlag(ownerRecord?.verified) || isTrueFlag(value.owner_verified) || isTrueFlag(value.verified);
  const purposeText = firstText(value.purpose, value.transaction_type).toLowerCase();
  return {
    id: String(value.id),
    title: firstText(value.title, value.name) || 'Untitled Listing',
    price: numberValue(value.price, value.amount),
    image: firstText(value.image, value.image_url, images[0]),
    images,
    location: firstText(value.location, value.subcity, value.city) || 'Location not provided',
    category: firstText(value.category, value.category_name),
    isPremium: isTrueFlag(value.premium) || isTrueFlag(value.isPremium),
    purpose: /rent/.test(purposeText) ? 'rent' : /sell|sale/.test(purposeText) ? 'sell' : purposeText || undefined,
    createdAt: firstText(value.created_at, value.createdAt) || undefined,
    status: firstText(value.status, value.status_label).toLowerCase(),
    metadata,
    specifications: readRecord(value.specifications),
    owner: ownerId || ownerName || ownerAvatar || ownerPhone || ownerVerified
      ? { id: ownerId, name: ownerName, avatar: ownerAvatar, phone: ownerPhone, verified: ownerVerified }
      : undefined,
    rating: numberValue(value.rating, value.avg_rating),
    reviews: numberValue(value.reviews, value.rating_count),
    billingPeriod: firstText(value.billing_period, value.rent_period, metadata?.billing_period, metadata?.rent_period) || undefined,
  };
};

const mapPostedItemToHomepageItem = (item: OwnerPostedItem): Item => ({
  id: item.id,
  title: item.title,
  price: item.price,
  image: item.images?.[0] || '',
  images: item.images,
  location: item.location || item.specialLocation || 'Location not provided',
  category: item.category || 'Other',
  isPremium: isTrueFlag(item.premium),
  purpose: item.saleType?.toLowerCase(),
  createdAt: item.createdAt,
  status: item.status.toLowerCase(),
});

const categoryMatches = (category: string, selected: string) => {
  const normalizedCategory = category.trim().toLowerCase();
  const normalizedSelected = selected.trim().toLowerCase();
  if (normalizedSelected === 'homes') {
    return normalizedCategory.includes('home') || normalizedCategory.includes('property');
  }
  if (normalizedSelected === 'vehicles') {
    return normalizedCategory.includes('vehicle') || normalizedCategory.includes('car');
  }
  if (normalizedSelected === 'land') {
    return normalizedCategory.includes('land') || normalizedCategory.includes('plot') || normalizedCategory.includes('lot');
  }
  if (normalizedSelected === 'events') {
    return normalizedCategory.includes('event');
  }
  return normalizedCategory === normalizedSelected;
};

const DesktopHomepage: React.FC = () => {
  const [transactionType, setTransactionType] = useState<'all' | 'rent' | 'sell'>('all');
  const [activeSlide, setActiveSlide] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsError, setItemsError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setItemsError('');

        const pageSize = 500;
        const allItems: unknown[] = [];
        let offset = 0;
        let page: unknown[];
        do {
          const response = await api.get('/items', { params: { limit: pageSize, offset } });
          const data: unknown = response.data;
          if (Array.isArray(data)) {
            page = data;
          } else if (isRecord(data) && Array.isArray(data.items)) {
            page = data.items;
          } else {
            throw new Error('The listings response did not contain an item list.');
          }
          allItems.push(...page);
          offset += page.length;
        } while (page.length === pageSize);

        const fetchedItems = allItems
          .map(normalizeApiItem)
          .filter((item): item is Item => item !== null && item.status === 'active');
        const localItems = loadOwnerItems()
          .map(mapPostedItemToHomepageItem)
          .filter((item) => item.status === 'active');

        const localIds = new Set(localItems.map((item) => item.id));
        const combined = [...localItems, ...fetchedItems.filter((item) => !localIds.has(item.id))];
        combined.sort((a, b) =>
          Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '')
        );
        setItems(combined);
      } catch (error) {
        console.error('Failed to load homepage items', error);
        setItems([]);
        setItemsError('We could not load listings right now. Please try again in a little while.');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroImages.length);
    }, 1500);
    return () => window.clearInterval(interval);
  }, []);

  const premiumItems = useMemo(() => items.filter((item) => item.isPremium), [items]);
  const recentItems = useMemo(() => items.filter((item) => !item.isPremium), [items]);
  const categories = useMemo(() => {
    const discoveredNames = items
      .map((item) => item.category.trim())
      .filter((name) => name && name.toLowerCase() !== 'other');
    const additionalNames = Array.from(new Set(discoveredNames))
      .filter((name) => !featuredCategories.some((featured) => categoryMatches(name, featured)))
      .sort((a, b) => a.localeCompare(b));

    return [...featuredCategories, ...additionalNames].map((name) => ({
      name,
      count: items.filter((item) => categoryMatches(item.category, name)).length,
    }));
  }, [items]);
  const isSeller = Boolean(
    user?.isSeller || ['owner', 'seller'].includes(String(user?.role || '').toLowerCase())
  );
  const listingActionHref = isSeller ? '/post-item' : user ? '/seller/upgrade' : '/post-item';
  const listingActionLabel = isSeller ? 'Post an item' : user ? 'Become a seller' : 'Get started';

  return (
    <div className="min-h-screen bg-[#F0EBFF] text-[#1F2937]">
      <DesktopNavbar isHomePage transactionType={transactionType} onTransactionTypeChange={setTransactionType} />

      <main className="flex-1">

        {/* HERO */}
        <section className="relative min-h-[600px] overflow-hidden bg-[#060B31] group">
          <div
            className="absolute inset-0 bg-[#060B31] bg-cover bg-[position:right_center] bg-no-repeat"
            style={{ backgroundImage: `url(${heroBg})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060B31]/95 via-[#060B31]/65 to-[#060B31]/10 md:from-[#060B31]/90 md:via-[#060B31]/35 md:to-transparent" />

          <div className="relative mx-auto flex min-h-[600px] max-w-[1440px] flex-col justify-center px-5 pb-12 pt-32 sm:px-8 md:pt-36 lg:px-12">

            {/* Headline */}
            <div className="w-full max-w-[560px] text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#C7D2FE]">FasilLink Marketplace</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
                Find your next <span className="text-[#A78BFA]">place</span> or product
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
                Search trusted listings for homes, vehicles, land, events, and more.
              </p>

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

        <div className="homepage-below-hero">
          <div className="mx-auto max-w-[1440px] space-y-8 px-4 pb-12 pt-8 sm:px-6 md:px-8 md:pt-10">
            {itemsError && (
              <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">
                {itemsError}
              </p>
            )}

            {loading ? (
              <>
                <section className="rounded-[28px] border border-white/90 bg-white/90 p-5 shadow-[0_16px_44px_rgba(37,31,83,0.07)] sm:p-6" aria-label="Loading categories">
                  <div className="mb-6 h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 5 }, (_, index) => (
                      <div key={index} className="h-36 animate-pulse rounded-3xl bg-slate-100" />
                    ))}
                  </div>
                </section>
                <HomepageListingRail title="Listings" description="Loading listings" viewAllHref="/search">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="w-[min(78vw,280px)] shrink-0 snap-start">
                      <div className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-200" />
                      <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-slate-200" />
                      <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                    </div>
                  ))}
                </HomepageListingRail>
              </>
            ) : (
              <>
                <section className="rounded-2xl border border-white/90 bg-white/90 p-3 shadow-[0_10px_28px_rgba(37,31,83,0.06)] sm:p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6C3BFF]">Find what you need</p>
                      <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950 sm:text-xl">Browse by category</h2>
                    </div>
                    <Link
                      to="/search"
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-[#5630C6] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
                    >
                      View all
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {categories.map((category) => {
                      const slug = categorySlugFromName(category.name);
                      const href = slug
                        ? searchPathForCategory(slug)
                        : `/search?category=${encodeURIComponent(category.name)}`;
                      const icon = category.name === 'Homes'
                        ? <House aria-hidden="true" className="h-7 w-7" />
                        : category.name === 'Vehicles'
                          ? <CarFront aria-hidden="true" className="h-7 w-7" />
                          : category.name === 'Land'
                            ? <Map aria-hidden="true" className="h-7 w-7" />
                            : category.name === 'Events'
                              ? <CalendarDays aria-hidden="true" className="h-7 w-7" />
                              : <Shapes aria-hidden="true" className="h-7 w-7" />;

                      return (
                        <Link
                          key={category.name}
                          to={href}
                          className="group rounded-2xl border border-slate-200/80 bg-[#FCFBFF] p-2.5 transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white hover:shadow-[0_8px_20px_rgba(37,31,83,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6C3BFF]/30 sm:p-3"
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEE9FF] text-[#6138D8] transition group-hover:bg-[#6C3BFF] group-hover:text-white">
                            {icon}
                          </span>
                          <span className="mt-2 block text-sm font-bold text-slate-950">{category.name}</span>
                          <span className="mt-0.5 block text-xs text-slate-600">
                            {itemsError
                              ? 'Count unavailable'
                              : `${category.count.toLocaleString()} active ${category.count === 1 ? 'listing' : 'listings'}`}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>

                {premiumItems.length > 0 && (
                  <HomepageListingRail
                    title="Premium listings"
                    description="Featured in the marketplace"
                    viewAllHref="/search"
                  >
                    {premiumItems.map((item) => <HomepageListingCard key={`premium-${item.id}`} item={item} />)}
                  </HomepageListingRail>
                )}

                <HomepageListingRail
                  title="Recent additions"
                  description="Fresh listings"
                  viewAllHref="/search"
                >
                  {recentItems.length > 0 ? recentItems.map((item) => (
                    <HomepageListingCard key={`recent-${item.id}`} item={item} />
                  )) : (
                    <div className="w-full rounded-2xl border border-dashed border-slate-300 bg-[#FAF9FF] px-5 py-9 text-center">
                      <p className="text-lg font-semibold text-slate-900">
                        {itemsError
                          ? 'Listings are temporarily unavailable'
                          : items.length === 0 ? 'No active listings just yet' : 'No recent additions right now'}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {itemsError
                          ? 'Please try again later.'
                          : items.length === 0
                          ? 'When listings become available, you will find them here.'
                          : 'Premium listings are shown above; new additions will appear here.'}
                      </p>
                    </div>
                  )}
                </HomepageListingRail>
              </>
            )}

            <section className="homepage-cta-strip flex flex-col items-start justify-between gap-5 rounded-[28px] px-6 py-8 text-white sm:flex-row sm:items-center sm:px-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Have something to rent or sell?</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
                  Add your item to the FasilLink marketplace.
                </p>
              </div>
              <Link
                to={listingActionHref}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#5630C6] transition hover:bg-[#F0EBFF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              >
                {listingActionLabel}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </section>
          </div>
        </div>
      </main>

      <FloatingAIAssistant />
      <Footer />
    </div>
  );
};

export default DesktopHomepage;