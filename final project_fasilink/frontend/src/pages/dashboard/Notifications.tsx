import React from 'react';

const demo = [
  { id: 1, title: 'New message', body: 'A seller replied to your inquiry.', time: '2h ago', unread: true },
  { id: 2, title: 'Price drop', body: 'A listing you viewed dropped in price.', time: '1d ago', unread: false },
  { id: 3, title: 'Weekly digest', body: 'New listings in Gondar / Azezo.', time: '3d ago', unread: false },
];

export default function Notifications() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Updates about your account, listings, and activity.
        </p>
      </div>

      <div className="space-y-3">
        {demo.map((n) => (
          <div
            key={n.id}
            className={[
              'rounded-2xl border p-5 shadow-sm transition-colors',
              n.unread
                ? 'border-brand-200 bg-brand-50/60 dark:border-red-900/40 dark:bg-red-500/10'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {n.title}
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {n.body}
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                {n.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

