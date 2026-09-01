import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { FavoriteItem, useFavorites } from '../../context/FavoritesContext';

export default function FavoriteButton({
  item,
  className = '',
  size = 20,
}: {
  item: FavoriteItem;
  className?: string;
  size?: number;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const id = String(item.id);
  const saved = isFavorite(id);

  const [showTip, setShowTip] = useState(false);

  const tip = useMemo(() => (saved ? 'Saved' : 'Save'), [saved]);

  return (
    <div className={`relative ${className}`}>
      <motion.button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const result = toggleFavorite(item);
          window.dispatchEvent(
            new CustomEvent('favorites:changed', {
              detail: { action: result.saved ? 'added' : 'removed', item },
            }),
          );
        }}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onFocus={() => setShowTip(true)}
        onBlur={() => setShowTip(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 0.18 }}
        aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
        className={[
          'group inline-flex items-center justify-center rounded-full',
          'bg-white/90 backdrop-blur shadow-sm ring-1 ring-black/5',
          'hover:bg-white active:bg-white',
          'dark:bg-slate-900/80 dark:ring-white/10',
          'transition-colors',
          saved ? 'text-red-600' : 'text-slate-800 dark:text-slate-100',
        ].join(' ')}
        style={{ width: size + 16, height: size + 16 }}
      >
        {/* Burst */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          initial={false}
          animate={
            saved
              ? { boxShadow: '0 0 0 0 rgba(239,68,68,0.0)' }
              : { boxShadow: '0 0 0 0 rgba(239,68,68,0.0)' }
          }
        />

        <Heart
          size={size}
          className="transition-transform duration-200 group-hover:scale-105"
          fill={saved ? 'currentColor' : 'none'}
          strokeWidth={2}
        />
      </motion.button>

      {showTip && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.14 }}
          className="pointer-events-none absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg"
        >
          {tip}
        </motion.div>
      )}
    </div>
  );
}

