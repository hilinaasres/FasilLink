import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ensureChapaPayerDetails, extractChapaCheckoutUrl, extractChapaTxRef } from '../../utils/chapaPayer';
import {
  clearChapaPaymentContext,
  getChapaReturnParams,
  saveChapaPaymentContext,
} from '../../utils/chapaPayment';
import { fetchRenewalPreview, type RenewalPreview } from './ownerItemApi';

export default function OwnerRenewItem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const basePath = location.pathname.startsWith('/seller')
    ? '/seller'
    : location.pathname.startsWith('/customer-posting')
    ? '/customer-posting'
    : '/owner';

  const [preview, setPreview] = useState<RenewalPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await fetchRenewalPreview(id);
        setPreview(data);
      } catch (err: unknown) {
        const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(apiError || 'Could not load renewal details.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const { paymentSuccess, txRef } = getChapaReturnParams(searchParams);
    if (!paymentSuccess || !txRef) return;

    const verify = async () => {
      setPaying(true);
      setError('');
      try {
        let res;
        try {
          res = await api.get(`/payment/verify/${encodeURIComponent(txRef)}`, {
            params: { trx_ref: txRef, status: searchParams.get('status') || 'success' },
          });
        } catch {
          res = await api.post('/payment/confirm-renewal', {
            tx_ref: txRef,
            trx_ref: txRef,
            item_id: id,
            status: searchParams.get('status') || 'success',
          });
        }

        if (res.data?.itemId || res.data?.success || res.data?.message) {
          clearChapaPaymentContext();
          setSuccess(
            res.data?.message || 'Renewal payment verified. Your listing is active again.'
          );
          setTimeout(() => navigate(`${basePath}/manage`), 1500);
        } else {
          setError('Payment verification failed. Please try again.');
        }
      } catch (err: unknown) {
        const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(apiError || 'Payment verification failed.');
      } finally {
        setPaying(false);
      }
    };
    verify();
  }, [searchParams, basePath, navigate, id]);

  const handlePay = async (method: 'Chapa' | 'Sandbox') => {
    if (!id || !preview) return;
    setPaying(true);
    setError('');
    setSuccess('');
    try {
      if (method === 'Chapa' && preview.renewal.requires_payment) {
        const payer = await ensureChapaPayerDetails(user);

        const customization = {
          title: (`FasilLink Renew`).slice(0, 16),
          description: (`Renewal: ${preview.item.title || 'Renewal'}`).slice(0, 50),
        };

        const response = await api.post('/payment/initialize', {
          ...payer,
          payment_type: 'renewal',
          amount: preview.renewal.fee_amount,
          itemId: id,
          item_id: id,
          return_base: basePath,
          customization,
        });
        const checkoutUrl = extractChapaCheckoutUrl(response.data);
        const txRef = extractChapaTxRef(response.data);
        if (checkoutUrl && txRef) {
          saveChapaPaymentContext(txRef, id);
          window.location.href = checkoutUrl;
          return;
        }
        throw new Error(
          (response.data as { error?: string })?.error ||
            'Chapa checkout could not be started. Check your email on file and try again.'
        );
      }

      const payRes = await api.post('/payment/pay-listing', {
        item_id: id,
        method: method === 'Sandbox' ? 'Mock Sandbox' : 'Renewal',
      });

      if (payRes.data?.success) {
        setSuccess('Renewal complete! Your listing is active again.');
        setTimeout(() => navigate(`${basePath}/manage`), 1500);
      } else {
        setError('Payment could not be completed.');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Renewal payment failed.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">Loading renewal details...</div>
    );
  }

  if (!preview) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error || 'Listing not found'}</p>
        <Link to={`${basePath}/manage`} className="text-brand-600 font-semibold hover:underline">
          Back to manage items
        </Link>
      </div>
    );
  }

  const { item, renewal } = preview;
  const isRent = String(item.transaction_type).toLowerCase() === 'rent';

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(`${basePath}/manage`)}
          aria-label="Back to manage items"
          title="Back to manage items"
          className="rounded-full border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-700"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
            Listing renewal
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
            Reactivate your {isRent ? 'rent' : 'sale'} listing
          </h1>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Item information</h2>
          <div className="mt-4 flex gap-4">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.title}
                className="h-24 w-32 rounded-2xl object-cover"
              />
            )}
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
              <p className="text-slate-500">Category: {item.category}</p>
              <p className="text-slate-500">Price: ETB {Number(item.price).toLocaleString()}</p>
              <p className="text-slate-500">Location: {item.location}</p>
              <p className="text-slate-500">
                Current status:{' '}
                <span className="font-medium text-amber-600">{item.status_label}</span>
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Listings marked as <strong>{isRent ? 'Rented' : 'Sold'}</strong> cannot go back to Active
            without paying a renewal fee set by the admin charging rules.
          </p>
        </div>

        <div className="rounded-3xl border border-brand-200 bg-brand-50/50 p-6 shadow-sm dark:border-brand-800 dark:bg-brand-500/10">
          <div className="flex items-center gap-2 text-brand-700 dark:text-brand-200">
            <RefreshCw size={20} />
            <h2 className="text-lg font-semibold">Renewal fee</h2>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Listing type</span>
              <span className="font-medium">Renewal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Transaction</span>
              <span className="font-medium capitalize">{item.transaction_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Fee rate</span>
              <span className="font-medium">{renewal.fee_percentage}%</span>
            </div>
            <div className="flex justify-between border-t border-brand-200 pt-3 text-base dark:border-brand-800">
              <span className="font-semibold text-slate-900 dark:text-white">Total due</span>
              <span className="font-bold text-brand-700 dark:text-brand-200">
                ETB {renewal.fee_amount.toLocaleString()}
              </span>
            </div>
          </div>

          {renewal.requires_payment ? (
            <div className="mt-6 flex flex-col gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chapa test mode: you will be redirected to the Chapa checkout page. Use the email on
                your account ({user?.email || localStorage.getItem('fasilink-owner-email') || 'logged-in email'}).
              </p>
              <button
                type="button"
                disabled={paying}
                onClick={() => handlePay('Chapa')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                <CreditCard size={16} />
                {paying ? 'Processing...' : 'Pay with Chapa'}
              </button>
              <button
                type="button"
                disabled={paying}
                onClick={() => handlePay('Sandbox')}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                Test pay (Sandbox)
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={paying}
              onClick={() => handlePay('Sandbox')}
              className="mt-6 w-full rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Activate for free
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
