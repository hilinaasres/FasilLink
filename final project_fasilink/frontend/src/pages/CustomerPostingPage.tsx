import React from 'react';
import { Link } from 'react-router-dom';
import { Box, LogOut, MessageCircle, PlusCircle, RefreshCcw, User2, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const actions = [
  {
    title: 'Add New Item',
    description: 'Create a new listing with all details.',
    Icon: PlusCircle,
  },
  {
    title: 'Manage Items',
    description: 'Update listings, change status, or remove items.',
    Icon: Box,
  },
  {
    title: 'Chat with Customers',
    description: 'Respond to inquiries from your buyers.',
    Icon: MessageCircle,
  },
  {
    title: 'Renew Items',
    description: 'Keep high-performing listings visible.',
    Icon: RefreshCcw,
  },
  {
    title: 'Notification of Owner',
    description: 'See important owner updates and expiry alerts.',
    Icon: Bell,
  },
];

export default function CustomerPostingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 sm:p-10 lg:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-600">Customer Posting Page</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Welcome, {user?.name || 'Customer'}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Post your item from this separate customer workspace. Your account stays a customer account,
                and the owner tools are shown here only for the item posting flow.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/customer/profile"
                  className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <User2 size={18} />
                  Profile
                </Link>
                <Link
                  to="/customer/logout"
                  className="inline-flex items-center gap-2 rounded-3xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700"
                >
                  <LogOut size={18} />
                  Logout
                </Link>
              </div>
            </div>

            <div className="bg-[radial-gradient(circle_at_top,_rgba(167,139,250,0.22),_transparent_58%),linear-gradient(180deg,#faf5ff_0%,#f8fafc_100%)] p-8 sm:p-10 lg:p-12">
              <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-6 shadow-lg shadow-violet-500/5 backdrop-blur">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-600">Own UI</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">Post your item</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Use this area as your posting workspace for adding and managing items.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Workspace</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">What you can do here</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {actions.map((action) => {
              // map customer tiles to customer-scoped owner routes
              let to = '/customer-posting/manage';
              if (action.title === 'Add New Item') to = '/customer-posting/add';
              if (action.title === 'Manage Items') to = '/customer-posting/manage';
              if (action.title === 'Chat with Customers') to = '/customer-posting/chat';
              if (action.title === 'Renew Items') to = '/customer-posting/manage';
              if (action.title === 'Notification of Owner') to = '/customer-posting/notifications';

              return (
                <Link key={action.title} to={to} className="block">
                  <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 transition hover:border-violet-200 hover:bg-violet-50/40">
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-white p-3 text-violet-600 shadow-sm">
                        <action.Icon size={22} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">{action.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Your listings</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Customer owned items</h2>
            </div>
            <Link
              to="/search"
              className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Browse more items
            </Link>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
            Add your listings here after continuing from the post item confirmation page.
          </div>
        </section>
      </div>
    </div>
  );
}