import React, { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DesktopNavbar from '../components/desktop/DesktopNavbar';
import Footer from '../components/desktop/Footer';
import ItemCard from '../components/desktop/ItemCard';
import Button from '../components/desktop/Button';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';

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
}

const DesktopFavoritesPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const { favorites: favItems, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const { user } = useAuth();

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
    image: item.image_url || item.image || 'https://via.placeholder.com/800x600?text=No+Image+Available',
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
  }), [parseMetadata]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      if (Array.isArray(favItems) && favItems.length > 0) {
        setItems(favItems.map((it: any) => normalizeItem(it)));
      } else {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, user, favItems, normalizeItem]);

  const handleFavoriteToggle = (itemId: string) => {
    const found = favItems.find((f: any) => String(f.id) === String(itemId));
    const payload = found || { id: itemId };
    toggleFavorite(payload as any);
  };

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <DesktopNavbar transactionType="all" onTransactionTypeChange={() => {}} />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <Heart className="w-8 h-8 text-[#6C3BFF]" />
              <h1 className="text-4xl font-bold text-neutral-900">My Favorites</h1>
            </div>
            <p className="text-neutral-600">Your saved listings ({items.length})</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-64 bg-neutral-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : items.length > 0 ? (
            <>
              <div className="grid grid-cols-4 gap-6 mb-12">
                {items.map((item) => (
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
                    isFavorited={true}
                    isPremium={item.isPremium}
                    views={item.views}
                    type={item.purpose === 'rent' ? 'rent' : 'sell'}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>

              <div className="bg-gradient-to-r from-[#6C3BFF] to-[#5A2FE0] rounded-lg p-12 text-center text-white">
                <h2 className="text-3xl font-bold mb-4">Discover More Great Listings</h2>
                <p className="text-lg opacity-90 mb-6">
                  Based on your favorites, we have personalized recommendations for you
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/')}
                  className="bg-white text-[#6C3BFF] hover:bg-neutral-50"
                >
                  Explore Recommendations
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-24">
              <Heart className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">No Favorites Yet</h2>
              <p className="text-neutral-600 mb-8">
                Start adding items to your favorites to keep track of listings you love
              </p>
              <Button variant="primary" size="lg" onClick={() => navigate('/')}>
                Explore Listings
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DesktopFavoritesPage;
