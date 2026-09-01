import React from 'react';

export default function Addresses() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Address
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your saved addresses for faster checkout and messaging.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Home
            </div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 dark:bg-red-500/10 dark:text-red-200">
              Default
            </span>
          </div>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Azezo, Gondar
          </div>
          <div className="mt-4 flex gap-2">
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
              Edit
            </button>
            <button className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-200">
              Remove
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Add a new address
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            You can save multiple addresses and set one as default.
          </p>
          <div className="mt-4">
            <button className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
              Add Address
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

