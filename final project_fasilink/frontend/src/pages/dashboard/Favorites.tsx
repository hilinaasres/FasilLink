import React from 'react';
import { Link } from 'react-router-dom';

export default function Favorites() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Favorites
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your saved listings in one place.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          No favorites yet
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Start exploring and tap the heart icon to save listings.
        </p>
        <div className="mt-5">
          <Link
            to="/search"
            className="inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Browse Listings
          </Link>
        </div>
      </div>
    </div>
  );
}

