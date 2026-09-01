import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Award, Shield, Star } from 'lucide-react';
import DesktopNavbar from '../components/desktop/DesktopNavbar';
import Footer from '../components/desktop/Footer';
import Button from '../components/desktop/Button';
import ItemCard from '../components/desktop/ItemCard';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';

interface ItemDetail {
  id: string;
  title: string;
  price: number;
  description: string;
  category: string;
  location: string;
  images: string[];
  rating: number;
  reviews: number;
  views: number;
  isPremium: boolean;
  purpose: 'rent' | 'sell';
  owner: {
    id: string;
    name: string;
    avatar?: string;
    verified: boolean;
    responseTime?: string;
    listings?: number;
  };
  specifications?: Record<string, string>;
  features?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
}

interface SimilarItem {
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
  purpose?: 'rent' | 'sell';
  isVerified?: boolean;
  imageCount?: number;
  features?: Array<{
    label: string;
    value: string;
    icon?: 'bed' | 'bath' | 'area' | 'garage' | 'custom';
  }>;
  tags?: string[];
}

const placeholderImage = 'https://via.placeholder.com/800x600?text=No+Image+Available';

const normalizeItemDetail = (raw: any): ItemDetail => {
  const images = Array.isArray(raw?.images) && raw.images.length > 0
    ? raw.images
    : [raw?.image || raw?.image_url || placeholderImage];

  const rating = Number(raw?.rating ?? raw?.avg_rating ?? 0);
  const reviews = Number(raw?.reviews ?? raw?.rating_count ?? 0);
  const views = Number(raw?.views ?? 0);
  const ownerName = String(raw?.owner?.name || raw?.owner_name || 'Item owner');

  return {
    id: String(raw?.id || ''),
    title: String(raw?.title || 'Untitled item'),
    price: Number(raw?.price || 0),
    description: String(raw?.description || ''),
    category: String(raw?.category || 'Listing'),
    location: String(raw?.location || 'Gondar'),
    images,
    rating: Number.isFinite(rating) ? rating : 0,
    reviews: Number.isFinite(reviews) ? reviews : 0,
    views: Number.isFinite(views) ? views : 0,
    isPremium: Boolean(raw?.isPremium || raw?.premium),
    purpose: String(raw?.purpose || raw?.transaction_type || 'sell').toLowerCase() === 'rent' ? 'rent' : 'sell',
    owner: {
      id: String(raw?.owner?.id || raw?.owner_id || ''),
      name: ownerName,
      avatar: raw?.owner?.avatar,
      verified: Boolean(raw?.owner?.verified),
      responseTime: raw?.owner?.responseTime,
      listings: Number(raw?.owner?.listings || 0),
    },
    specifications: raw?.specifications || undefined,
    features: Array.isArray(raw?.features) ? raw.features : undefined,
    metadata: raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : undefined,
    createdAt: String(raw?.createdAt || raw?.created_at || new Date().toISOString()),
  };
};

const normalizeSimilarItem = (raw: any): SimilarItem => ({
  id: String(raw?.id || ''),
  title: String(raw?.title || 'Untitled item'),
  price: Number(raw?.price || 0),
  image: String(raw?.image || raw?.image_url || placeholderImage),
  location: String(raw?.location || 'Gondar'),
  category: String(raw?.category || raw?.category_name || ''),
  subcity: String(raw?.subcity || raw?.sub_city || raw?.subCity || ''),
  kebele: String(raw?.kebele || raw?.kebele_name || ''),
  metadata: raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : undefined,
  rating: Number(raw?.rating || raw?.avg_rating || 0),
  reviews: Number(raw?.reviews || raw?.rating_count || 0),
  views: Number(raw?.views || 0),
  isPremium: Boolean(raw?.isPremium || raw?.premium),
  purpose: String(raw?.purpose || raw?.transaction_type || 'sell').toLowerCase() === 'rent' ? 'rent' : 'sell',
  isVerified: Boolean(raw?.verified || raw?.owner?.verified),
  imageCount: Number(raw?.imageCount || raw?.images?.length || 0),
  features: Array.isArray(raw?.features)
    ? raw.features.map((feature: string) => ({ label: feature, value: feature, icon: 'custom' }))
    : [],
  tags: Array.isArray(raw?.tags) ? raw.tags : Array.isArray(raw?.highlights) ? raw.highlights : [],
});

const DesktopItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const { toggleFavorite, isFavorite, favoritesById } = useFavorites();
  const [lightMode, setLightMode] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [canRate, setCanRate] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [similarItems, setSimilarItems] = useState<SimilarItem[]>([]);
  const { user } = useAuth();
  const isFavoriteRef = useRef(isFavorite);

  useEffect(() => {
    isFavoriteRef.current = isFavorite;
  }, [isFavorite]);

  useEffect(() => {
    if (!id) {
      setIsFavorited(false);
      return;
    }

    setIsFavorited(Boolean(isFavoriteRef.current(String(id))));
  }, [id, favoritesById]);

  const submitDesktopRating = async (value: number) => {
    if (!item?.id) return;
    if (!user) { navigate('/login'); return; }
    if (!canRate && myRating === null) return;
    if (ratingSaving) return;

    setRatingSaving(true);
    setRatingError('');

    try {
      const response = await api.post('/ratings', {
        item_id: item.id,
        rating: value,
      });

      setMyRating(value);
      setRatingAvg(Number(response.data?.avg_rating ?? ratingAvg));
      setRatingCount(Number(response.data?.rating_count ?? ratingCount));
      setCanRate(true);
    } catch (error: any) {
      console.error('Failed to save rating:', error);
      setRatingError(error?.response?.data?.error || 'Unable to save rating right now');
    } finally {
      setRatingSaving(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const loadItemDetails = async () => {
      try {
        setLoading(true);
        setRatingError('');
        setSelectedImage(0);

        const itemResponse = await api.get(`/api/items/${id}`);
        const nextItem = itemResponse.data?.item ? normalizeItemDetail(itemResponse.data.item) : null;

        if (cancelled) return;

        if (!nextItem) {
          setItem(null);
          return;
        }

        setItem(nextItem);
        setRatingAvg(nextItem.rating);
        setRatingCount(nextItem.reviews);
        setMyRating(null);
        setCanRate(false);

        if (user) {
          try {
            const ratingResponse = await api.get(`/ratings/item/${id}/me`);

            if (cancelled) return;

            setRatingAvg(Number(ratingResponse.data?.avg_rating ?? nextItem.rating ?? 0));
            setRatingCount(Number(ratingResponse.data?.rating_count ?? nextItem.reviews ?? 0));
            setMyRating(ratingResponse.data?.my_rating ?? null);
            setCanRate(Boolean(ratingResponse.data?.can_rate));
          } catch (error) {
            console.error('Failed to load item rating details:', error);
          }
        }
      } catch (error) {
        console.error('Failed to fetch item:', error);
        if (!cancelled) {
          setItem(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadItemDetails();

    return () => {
      cancelled = true;
    };
  }, [id, user]);

  useEffect(() => {
    if (!item?.id) {
      setSimilarItems([]);
      return;
    }

    let cancelled = false;

    const loadSimilarItems = async () => {
      try {
        const itemCategory = String(item.category || '').trim();
        if (!itemCategory) {
          if (!cancelled) setSimilarItems([]);
          return;
        }

        const response = await api.get('/items', {
          params: {
            category: itemCategory,
            limit: 30,
          },
        });

        if (cancelled) return;

        const rawItems: any[] = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.items)
            ? response.data.items
            : [];

        const itemLocation = String(item.location || '').trim().toLowerCase();
        const itemPurpose = String(item.purpose || '').trim().toLowerCase();
        const itemPrice = Number(item.price || 0);
        const itemTitleWords = new Set(
          String(item.title || '')
            .toLowerCase()
            .split(/\s+/)
            .map((word) => word.trim())
            .filter(Boolean)
        );

        const scoredItems = rawItems
          .filter((candidate: any) => String(candidate?.id) !== String(item.id))
          .map((candidate: any) => {
            const candidateCategory = String(candidate?.category || '').trim().toLowerCase();
            const candidateLocation = String(candidate?.location || '').trim().toLowerCase();
            const candidateTransactionType = String(candidate?.transaction_type || candidate?.purpose || '').trim().toLowerCase();
            const candidatePrice = Number(candidate?.price || 0);
            const candidateTitleWords = new Set(
              String(candidate?.title || '')
                .toLowerCase()
                .split(/\s+/)
                .map((word: string) => word.trim())
                .filter(Boolean)
            );

            let score = 0;
            if (candidateCategory === itemCategory.toLowerCase()) score += 30;
            if (candidateLocation && itemLocation && candidateLocation.includes(itemLocation)) score += 20;
            if (candidateTransactionType && itemPurpose && candidateTransactionType === itemPurpose) score += 15;

            if (itemPrice > 0) {
              const priceDiffRatio = Math.abs(candidatePrice - itemPrice) / itemPrice;
              score += Math.max(0, 10 - priceDiffRatio * 10);
            }

            const titleMatches = [...itemTitleWords].filter((word) => candidateTitleWords.has(word)).length;
            score += titleMatches * 5;

            return {
              item: normalizeSimilarItem(candidate),
              score,
            };
          })
          .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
          .slice(0, 4)
          .map(({ item }: { item: SimilarItem }) => item);

        if (!cancelled) {
          setSimilarItems(scoredItems);
        }
      } catch {
        if (!cancelled) {
          setSimilarItems([]);
        }
      }
    };

    loadSimilarItems();

    return () => {
      cancelled = true;
    };
  }, [item?.id, item?.category, item?.location, item?.price, item?.purpose]);

  const handleChat = () => {
    if (!user) { navigate('/login'); return; }
    if (!item?.owner?.id) return;
    if (String(user.id) === String(item.owner.id)) return;
    const params = new URLSearchParams({
      with: item.owner.id,
      item: item.id,
      name: item.owner.name,
      title: item.title,
    });
    navigate(`/chats?${params.toString()}`);
  };

  // ✅ Fixed: persist favorite state to localStorage
  const handleFavorite = () => {
    if (!user) { navigate('/login'); return; }
    const newState = !isFavorited;
    setIsFavorited(newState);
    const payload = { id: id, title: item?.title || '', price: item?.price || 0, location: item?.location || '', image_url: item?.images?.[0] || '' };
    toggleFavorite(payload as any);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareMsg('Link copied!');
      setTimeout(() => setShareMsg(''), 2000);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-page">
        <DesktopNavbar transactionType="all" onTransactionTypeChange={() => {}} />
        <div className="flex-1 py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2 space-y-4">
                <div className="aspect-video bg-neutral-200 rounded-lg animate-pulse"></div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-square bg-neutral-200 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 h-fit space-y-4">
                <div className="h-8 bg-neutral-200 rounded animate-pulse"></div>
                <div className="h-24 bg-neutral-100 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col bg-page">
        <DesktopNavbar transactionType="all" onTransactionTypeChange={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-neutral-600 text-lg mb-4">Item not found</p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isOwner = Boolean(user && item?.owner?.id && String(user.id) === String(item.owner.id));

  return (
    <div className={`min-h-screen flex flex-col bg-page ${lightMode ? 'item-light-mode' : ''}`}>
      <DesktopNavbar transactionType="all" onTransactionTypeChange={() => {}} />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-8">

            {/* Left Column */}
            <div className="col-span-2 space-y-8">

              {/* Main Image */}
              <div className="relative bg-white rounded-lg overflow-hidden shadow-soft">
                <img
                  src={item.images[selectedImage] || item.images[0] || placeholderImage}
                  alt={item.title}
                  className="w-full h-96 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage; }}
                />
                <div className="absolute top-4 left-4 flex items-center gap-3">
                  {item.isPremium && (
                    <div className="bg-[#6C3BFF] text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Premium Listing
                    </div>
                  )}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setLightMode((v) => !v)}
                      className="rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-semibold text-[#6C3BFF] shadow-md backdrop-blur transition hover:bg-white"
                    >
                      {lightMode ? 'Normal mode' : 'Light mode'}
                    </button>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {item.images.length > 1 && (
                <div className="grid grid-cols-6 gap-2">
                  {item.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === index
                          ? 'border-[#6C3BFF] shadow-md'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${item.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage; }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Description */}
              <div className="bg-white rounded-lg p-6 shadow-soft">
                <h2 className="text-2xl font-bold text-neutral-900 mb-4">Description</h2>
                <p className="text-neutral-600 leading-relaxed mb-6">{item.description}</p>

                {/* Amenities / metadata */}
                {(() => {
                  const amenities: string[] = [];
                  try {
                    const metaAmenities = item.metadata?.amenities;
                    if (Array.isArray(metaAmenities)) {
                      metaAmenities.forEach((x: any) => x && amenities.push(String(x)));
                    } else if (typeof metaAmenities === 'string') {
                      metaAmenities.split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => amenities.push(s));
                    }

                    if (amenities.length === 0 && Array.isArray(item.features) && item.features.length) {
                      item.features.forEach((f: any) => {
                        if (!f) return;
                        if (typeof f === 'string') amenities.push(f);
                        else if (typeof f === 'object' && (f.label || f.value)) amenities.push(String(f.label || f.value));
                      });
                    }

                    if (amenities.length === 0 && item.specifications && Object.keys(item.specifications).length) {
                      Object.entries(item.specifications).forEach(([k, v]) => {
                        if (v) amenities.push(`${k}: ${v}`);
                      });
                    }
                  } catch (e) {
                    // ignore parsing problems
                  }

                  if (amenities.length === 0) return null;

                  return (
                    <div className="mt-4">
                      <h3 className="font-semibold text-neutral-900 mb-3">Amenities</h3>
                      <div className="flex flex-wrap gap-2">
                        {amenities.map((a, idx) => (
                          <span key={idx} className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Specifications */}
              {item.specifications && Object.keys(item.specifications).length > 0 && (
                <div className="bg-white rounded-lg p-6 shadow-soft">
                  <h2 className="text-2xl font-bold text-neutral-900 mb-4">Specifications</h2>
                  <div className="grid grid-cols-2 gap-6">
                    {Object.entries(item.specifications).map(([key, value]) => (
                      <div key={key} className="border-b border-neutral-200 pb-4">
                        <p className="text-sm font-medium text-neutral-500 uppercase tracking-wide">{key}</p>
                        <p className="text-neutral-900 font-semibold mt-2">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Items */}
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-6">Similar Items You May Like</h2>
                {similarItems.length > 0 ? (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
                    {similarItems.map((similarItem) => (
                      <ItemCard
                        key={similarItem.id}
                        id={similarItem.id}
                        title={similarItem.title}
                        price={similarItem.price}
                        image={similarItem.image}
                        location={similarItem.location}
                        category={similarItem.category}
                        subcity={similarItem.subcity}
                        kebele={similarItem.kebele}
                        metadata={similarItem.metadata}
                        rating={similarItem.rating}
                        reviews={similarItem.reviews}
                        isPremium={similarItem.isPremium}
                        isVerified={similarItem.isVerified}
                        views={similarItem.views}
                        imageCount={similarItem.imageCount}
                        tags={similarItem.tags}
                        type={similarItem.purpose === 'rent' ? 'rent' : 'sell'}
                        className="w-full"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right Column - Sticky Owner Card */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-soft sticky top-28">

                {/* Price */}
                <div className="mb-6">
                  <p className="text-3xl font-extrabold text-[#6C3BFF]">
                    ETB {item.price.toLocaleString()}
                    {item.purpose === 'rent' && <span className="text-base font-medium text-neutral-500"> / month</span>}
                  </p>
                  <span className="inline-block mt-1 text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-[#EDE9FE] text-[#6C3BFF]">
                    For {item.purpose === 'rent' ? 'Rent' : 'Sale'}
                  </span>
                </div>

                {/* Owner Info */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-neutral-100">
                  <div className="w-14 h-14 bg-[#6C3BFF] rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {item.owner.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-neutral-900 truncate">{item.owner.name}</h3>
                      {item.owner.verified && <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-neutral-500">{item.owner.listings || 0} listings</p>
                    {item.owner.responseTime && (
                      <p className="text-xs text-neutral-500">Responds in {item.owner.responseTime}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!isOwner && (
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={handleChat}
                      className="flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat with Owner
                    </Button>
                  )}

                  {/* ✅ Fixed: heart icon always visible, persists on refresh */}
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    onClick={handleFavorite}
                    className={`flex items-center justify-center gap-2 transition-all ${
                      isFavorited ? 'border-red-400 text-red-500 bg-red-50 hover:bg-red-100' : ''
                    }`}
                  >
                    <Heart
                      className="w-4 h-4 transition-all"
                      style={isFavorited ? { fill: '#ef4444', color: '#ef4444' } : {}}
                    />
                    {isFavorited ? 'Saved ❤️' : 'Save to Favorites'}
                  </Button>
                </div>

                {/* Rating */}
                <div className="mb-6 rounded-2xl border border-neutral-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-neutral-900">Rating</span>
                    <span className="text-sm text-neutral-500">{ratingCount} review{ratingCount === 1 ? '' : 's'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => {
                      const active = myRating !== null
                        ? value <= myRating
                        : value <= Math.round(ratingAvg);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => submitDesktopRating(value)}
                          disabled={!canRate && myRating === null}
                          className={`rounded-full p-1 transition ${
                            (!canRate && myRating === null) ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-100'
                          }`}
                          aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                        >
                          <Star className={`h-5 w-5 ${active ? 'text-yellow-400' : 'text-slate-300'}`} />
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-neutral-500">
                    {myRating !== null
                      ? `Your rating: ${myRating} star${myRating > 1 ? 's' : ''}`
                      : canRate
                        ? 'Click a star to rate this item after chatting with the owner.'
                        : 'Start chatting with the owner to unlock rating.'}
                  </p>
                  {ratingError && <p className="mt-2 text-xs text-red-500">{ratingError}</p>}
                </div>

                {/* Item Stats */}
                <div className="space-y-3 pt-6 mt-4 border-t border-neutral-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Category</span>
                    <span className="font-semibold text-neutral-900">{item.category}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Location</span>
                    <span className="font-semibold text-neutral-900">{item.location}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Posted</span>
                    <span className="font-semibold text-neutral-900">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Views</span>
                    <span className="font-semibold text-neutral-900">{item.views.toLocaleString()}</span>
                  </div>
                </div>

                {/* Share */}
                <Button
                  variant="ghost"
                  size="lg"
                  fullWidth
                  onClick={handleShare}
                  className="mt-6 flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  {shareMsg || 'Share'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DesktopItemDetail;