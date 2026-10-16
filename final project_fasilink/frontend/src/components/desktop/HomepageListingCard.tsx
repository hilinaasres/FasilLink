import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  BedDouble,
  Bath,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  Star,
  UserRound,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FavoriteButton from '../favorites/FavoriteButton';

const noImagePlaceholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"%3E%3Crect width="640" height="480" fill="%23eeecf8"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%236b6580" font-family="sans-serif" font-size="24"%3EImage unavailable%3C/svg%3E';

export interface HomepageListingOwner {
  id?: string;
  name?: string;
  avatar?: string;
  verified?: boolean;
  phone?: string;
}

export interface HomepageListing {
  id: string;
  title: string;
  price: number;
  image: string;
  images?: string[];
  location: string;
  category: string;
  isPremium: boolean;
  purpose?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
  specifications?: Record<string, unknown>;
  owner?: HomepageListingOwner;
  rating?: number;
  reviews?: number;
  billingPeriod?: string;
}

interface HomepageListingCardProps {
  item: HomepageListing;
  variant?: 'home' | 'search';
  layout?: 'grid' | 'list';
  className?: string;
}

interface DetailChip {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

const displayValue = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string | number => typeof entry === 'string' || typeof entry === 'number')
      .map(String)
      .join(', ')
      .trim();
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return '';
};

const getSpecs = (item: HomepageListing): DetailChip[] => {
  const source = { ...item.metadata, ...item.specifications };
  const byKey = new Map(
    Object.entries(source).map(([key, value]) => [key.toLowerCase().replace(/[_\s-]/g, ''), value]),
  );
  const category = item.category.toLowerCase();
  const isHome = /home|house|property|apartment/.test(category);
  const isVehicle = /vehicle|car|truck|van/.test(category);
  const isEvent = /event|tent|chair/.test(category);
  const isLand = /land|plot|lot/.test(category);

  const fields: Array<{ label: string; aliases: string[]; icon?: React.ReactNode }> = isHome
    ? [
        { label: 'Beds', aliases: ['bedrooms', 'beds', 'bed'], icon: <BedDouble aria-hidden="true" className="h-3.5 w-3.5" /> },
        { label: 'Baths', aliases: ['bathrooms', 'baths', 'bath'], icon: <Bath aria-hidden="true" className="h-3.5 w-3.5" /> },
        { label: 'Area', aliases: ['area', 'size', 'square_feet', 'sqft', 'sqm'], icon: <Ruler aria-hidden="true" className="h-3.5 w-3.5" /> },
      ]
    : isVehicle
      ? [
          { label: 'Make', aliases: ['make', 'brand'] },
          { label: 'Model', aliases: ['model'] },
          { label: 'Year', aliases: ['year', 'model_year'] },
          { label: 'Transmission', aliases: ['transmission'] },
          { label: 'Fuel', aliases: ['fuel_type', 'fuel'] },
          { label: 'Mileage', aliases: ['mileage', 'miles', 'kilometers'] },
        ]
      : isEvent
        ? [
            { label: 'Quantity', aliases: ['quantity', 'qty', 'amount'] },
            { label: 'Size', aliases: ['size', 'dimensions'] },
            { label: 'Availability', aliases: ['availability', 'available'] },
          ]
        : isLand
          ? [
              { label: 'Area', aliases: ['area', 'plot_area', 'size', 'sqm'] },
              { label: 'Land type', aliases: ['land_type', 'plot_type', 'type'] },
            ]
          : [];

  return fields.flatMap(({ label, aliases, icon }) => {
    for (const alias of aliases) {
      const value = displayValue(byKey.get(alias.toLowerCase().replace(/[_\s-]/g, '')));
      if (value) return [{ label, value, icon }];
    }
    return [];
  }).slice(0, 4);
};

const normalizePhone = (phone?: string): string =>
  (phone || '').replace(/[^\d+]/g, '');

const ListingImage: React.FC<{ item: HomepageListing }> = ({ item }) => {
  const [imageIndex, setImageIndex] = useState(0);
  const images = useMemo(
    () => (item.images?.length ? item.images.filter(Boolean) : [item.image]).filter(Boolean),
    [item.image, item.images],
  );
  const image = images[imageIndex % Math.max(images.length, 1)] || noImagePlaceholder;

  const changeImage = (event: React.MouseEvent<HTMLButtonElement>, direction: number) => {
    event.preventDefault();
    event.stopPropagation();
    setImageIndex((current) => (current + direction + images.length) % images.length);
  };

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-t-[inherit] bg-[#ECEAF8]">
      <Link
        to={`/item/${encodeURIComponent(item.id)}`}
        aria-label={`View listing: ${item.title}`}
        className="absolute inset-0 block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#6C3BFF]"
      >
        <img
          src={image}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = noImagePlaceholder;
          }}
        />
      </Link>
      {item.purpose && (
        <span className={`pointer-events-none absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm ${
          item.purpose.toLowerCase() === 'rent' ? 'bg-emerald-600' : 'bg-[#6C3BFF]'
        }`}>
          {item.purpose.toLowerCase() === 'rent' ? 'For rent' : item.purpose.toLowerCase() === 'sell' ? 'For sale' : item.purpose}
        </span>
      )}
      <FavoriteButton
        item={{
          id: item.id,
          title: item.title,
          price: item.price,
          location: item.location,
          image_url: image,
          category: item.category,
          transaction_type: item.purpose,
        }}
        className="absolute right-3 top-3"
        size={17}
      />
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Show previous listing image"
            onClick={(event) => changeImage(event, -1)}
            className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/55 text-white shadow-sm transition hover:bg-slate-950/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Show next listing image"
            onClick={(event) => changeImage(event, 1)}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/55 text-white shadow-sm transition hover:bg-slate-950/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight aria-hidden="true" className="m-auto h-5 w-5" />
          </button>
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-slate-950/70 px-2 py-1 text-[11px] font-semibold text-white">
            {imageIndex % images.length + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
};

const HomepageListingCard: React.FC<HomepageListingCardProps> = ({
  item,
  variant = 'home',
  layout = 'grid',
  className = '',
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const searchVariant = variant === 'search';
  const listLayout = searchVariant && layout === 'list';
  const specs = useMemo(() => getSpecs(item), [item]);
  const phone = normalizePhone(item.owner?.phone);

  const openChat = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!item.owner?.id || String(user.id) === item.owner.id) return;
    const params = new URLSearchParams({
      with: item.owner.id,
      item: item.id,
      name: item.owner.name || 'Owner',
      title: item.title,
    });
    navigate(`/chats?${params.toString()}`);
  };

  const ownerInfo = item.owner?.id || item.owner?.name || item.owner?.avatar || item.owner?.verified;
  const premiumStyle = item.isPremium
    ? 'border-[#D8CCFF] shadow-[0_10px_28px_rgba(88,53,180,0.12)]'
    : 'border-slate-200/80 shadow-[0_8px_24px_rgba(30,27,75,0.07)]';

  return (
    <article
      className={`group relative min-w-0 overflow-hidden rounded-2xl border bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(30,27,75,0.13)] ${premiumStyle} ${listLayout ? 'flex flex-col sm:flex-row' : ''} ${!searchVariant ? 'homepage-listing-card w-[min(78vw,300px)] shrink-0 snap-start' : ''} ${className}`}
    >
      <div className={listLayout ? 'sm:w-[34%] sm:min-w-[220px]' : ''}>
        <ListingImage item={item} />
      </div>

      <div className={`min-w-0 ${listLayout ? 'flex flex-1 flex-col justify-center' : ''} ${searchVariant ? 'p-4' : 'p-3.5'}`}>
        {item.isPremium && (
          <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-[#6C3BFF] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
            <Star aria-hidden="true" className="h-3 w-3 fill-current" />
            Premium
          </span>
        )}

        {item.rating && item.rating > 0 ? (
          <div className="mb-1 flex items-center gap-1 text-xs">
            <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-slate-800">{item.rating.toFixed(1)}</span>
            {!!item.reviews && <span className="text-slate-500">({item.reviews})</span>}
          </div>
        ) : null}

        <Link
          to={`/item/${encodeURIComponent(item.id)}`}
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
        >
          <h3 className="line-clamp-2 text-base font-bold leading-5 text-[#111B42] transition-colors group-hover:text-[#5B31D5]">
            {item.title}
          </h3>
        </Link>

        <p className="mt-2 text-lg font-extrabold tracking-tight text-[#5130BE]">
          ETB {item.price.toLocaleString()}
          {item.billingPeriod && <span className="ml-1 text-xs font-medium text-slate-500">/{item.billingPeriod}</span>}
        </p>

        <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-600">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#6C3BFF]" />
          <span className="truncate">{item.location}</span>
        </p>

        {specs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5">
            {specs.map((spec) => (
              <span key={`${spec.label}-${spec.value}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#26355F]">
                {spec.icon}
                <span>{spec.value}</span>
                <span className="font-normal text-slate-500">{spec.label}</span>
              </span>
            ))}
          </div>
        )}

        {ownerInfo && (
          <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-slate-100 pt-2.5">
            {item.owner?.avatar ? (
              <img
                src={item.owner.avatar}
                alt=""
                loading="lazy"
                className="h-8 w-8 shrink-0 rounded-full object-cover"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F0EBFF] text-[#6C3BFF]">
                <UserRound aria-hidden="true" className="h-4 w-4" />
              </span>
            )}
            <span className="min-w-0 truncate text-xs font-semibold text-slate-800">
              {item.owner?.name}
            </span>
            {item.owner?.verified && (
              <BadgeCheck aria-label="Verified owner" className="h-4 w-4 shrink-0 text-[#6C3BFF]" />
            )}
            <span className="ml-auto flex shrink-0 items-center gap-1">
              {item.owner?.id && (
                (String(user?.id || '') !== item.owner.id) && (
                <button
                  type="button"
                  onClick={openChat}
                  aria-label={`Chat with ${item.owner.name || 'owner'}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#6C3BFF] text-white transition hover:bg-[#582FE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF] focus-visible:ring-offset-2"
                >
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                </button>
                )
              )}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  aria-label={`Call ${item.owner?.name || 'owner'}`}
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-[#5130BE] transition hover:bg-[#F4F0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF] focus-visible:ring-offset-2"
                >
                  <Phone aria-hidden="true" className="h-4 w-4" />
                </a>
              )}
            </span>
          </div>
        )}

        {searchVariant && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <span className="max-w-[60%] truncate rounded-full bg-[#F0EBFF] px-2.5 py-1 text-[11px] font-semibold text-[#4C2BAC]">
              {item.category || 'Listing'}
            </span>
            <div className="flex items-center gap-2">
              <Link
                to={`/item/${encodeURIComponent(item.id)}`}
                className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[#6C3BFF] px-4 text-xs font-bold text-white transition hover:bg-[#582FE0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6C3BFF]/30"
              >
                View
              </Link>
            </div>
          </div>
        )}
      </div>

    </article>
  );
};

export default HomepageListingCard;
