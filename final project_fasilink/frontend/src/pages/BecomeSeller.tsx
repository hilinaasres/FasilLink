import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BecomeSeller: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const { user, becomeSeller } = useAuth();

  const handleUpgrade = async () => {
    setError('');
    setSuccess('');

    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      await becomeSeller();
      setSuccess('Posting access is ready. Redirecting to the owner workspace...');
      setTimeout(() => {
        navigate('/owner/landing');
      }, 900);
    } catch (err: any) {
      if (err?.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setError(`Cannot reach backend API. Make sure the backend is running and reachable at ${API_BASE_URL}.`);
      } else {
        setError('Seller upgrade failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10">
        <div className="mb-8 space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-600">Post Item</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Open the post-item page</h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-500">
            Customers start here to get posting access. Item owners use a separate workspace, so the two pages are not the same.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-3xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 border border-emerald-100">
            {success}
          </div>
        )}

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-medium text-slate-700">What this page is for</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>• Start the item-posting flow as a customer</li>
              <li>• Keep owner workspace and customer page separate</li>
              <li>• Continue to the owner workspace only if you are the item owner</li>
              <li>• Keep your customer account unchanged</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-3xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/10 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Opening...' : 'Continue'}
          </button>
          <div className="text-center">
            <Link to="/owner/landing" className="text-sm font-semibold text-violet-700 hover:text-violet-800">
              Item owner? Go to the owner workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BecomeSeller;
