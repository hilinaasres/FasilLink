import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import MarketplaceCard from '../components/MarketplaceCard';
import { useFavorites } from '../context/FavoritesContext';

export default function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites();

  if (favorites.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Favorites
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            You haven’t saved any items yet. Tap the heart on a listing to save it here.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/search"
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Browse Listings
            </Link>
            <Link
              to="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            My Favorites
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {favorites.length} saved item{favorites.length === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          to="/search"
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Continue Browsing
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {favorites.map((fav, idx) => (
          <motion.div
            key={fav.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(0.2, idx * 0.04) }}
            className="relative"
          >
            {/* Remove quick action */}
            <button
              type="button"
              onClick={() => removeFavorite(String(fav.id))}
              className="absolute right-3 top-3 z-20 inline-flex items-center justify-center rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-black/5 hover:bg-white dark:bg-slate-900/80 dark:ring-white/10"
              title="Remove"
            >
              <Trash2 size={18} className="text-slate-700 dark:text-slate-100" />
            </button>

            <MarketplaceCard
              item={{
                id: Number(fav.id),
                title: fav.title,
                price: Number(fav.price || 0),
                location: fav.location || '',
                transaction_type: (fav.transaction_type as any) || 'sell',
                image_url: fav.image_url,
                avg_rating: undefined,
                rating_count: undefined,
                category: fav.category,
              }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

