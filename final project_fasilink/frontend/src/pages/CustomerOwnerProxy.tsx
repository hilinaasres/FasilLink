import React from 'react';

export default function CustomerOwnerProxy({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
