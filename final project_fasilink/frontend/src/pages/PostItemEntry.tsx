import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PostItemEntry() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleContinue = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.isSeller || String(user.role || '').toLowerCase() === 'owner' || String(user.role || '').toLowerCase() === 'seller') {
      navigate('/owner/dashboard');
      return;
    }
    navigate('/customer-posting');
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-600">Post Item</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Do you want to continue?</h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-500">
            This opens the customer publishing form. Your account stays a customer account.
          </p>
        </div>

        <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
          <p className="text-sm font-semibold text-slate-900">Continue to:</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The owner dashboard for item owners, or the customer publishing form for customers.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-3xl bg-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700"
          >
            <ArrowRight size={18} />
            Continue
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <X size={18} />
            Cancel
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link to={user?.isSeller ? '/owner/dashboard' : '/customer-posting'} className="text-sm font-semibold text-violet-700 hover:text-violet-800">
            Skip ahead to your dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}