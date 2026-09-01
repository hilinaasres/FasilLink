import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Edit3,
  Trash2,
} from 'lucide-react';
import {
  OwnerItem,
  OwnerItemStatus,
} from './ownerStorage';
import {
  deleteOwnerItemApi,
  fetchOwnerItems,
  getApiErrorMessage,
  isRenewalRequiredError,
  updateOwnerItemApi,
} from './ownerItemApi';

const getStatusOptions = (item: OwnerItem): OwnerItemStatus[] => {
  if (item.status === 'Pending') return ['Pending'];
  if (item.status === 'Sold' || item.status === 'Rented') return [item.status];
  if (item.saleType === 'Rent') return ['Active', 'Rented'];
  return ['Active', 'Sold'];
};

const OwnerManageItems = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useMemo(() => location.pathname.startsWith('/seller')
    ? '/seller'
    : location.pathname.startsWith('/customer-posting')
    ? '/customer-posting'
    : '/owner', [location.pathname]);
  const [items, setItems] = useState<OwnerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<OwnerItem>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchOwnerItems();
      setItems(data);
    } catch (err: unknown) {
      console.error('Failed to load owner items:', err);
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(apiError || 'Could not load your listings. Please try again.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (!editingId) {
      setDraft({});
      return;
    }
    const item = items.find((entry) => entry.id === editingId);
    setDraft(item ? { ...item } : {});
  }, [editingId, items]);

  const handleEdit = (item: OwnerItem) => {
    setEditingId(item.id);
    setMessage('');
    setError('');
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Remove this listing from the marketplace?')) return;
    try {
      await deleteOwnerItemApi(itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      if (editingId === itemId) setEditingId(null);
      setMessage('Listing removed.');
    } catch (err: unknown) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(apiError || 'Could not delete listing.');
    }
  };

  const redirectToRenewal = (itemId: string) => {
    setMessage('');
    setError('');
    navigate(`${basePath}/renew/${itemId}`);
  };

  const handleStatusChange = async (item: OwnerItem, nextStatus: OwnerItemStatus) => {
    if (nextStatus === item.status) return;

    if ((item.status === 'Sold' || item.status === 'Rented') && nextStatus === 'Active') {
      redirectToRenewal(item.id);
      return;
    }
    if (item.status === 'Pending') {
      setError('Pending listings are approved by admin. You cannot change status yet.');
      setMessage('');
      return;
    }

    setUpdatingStatusId(item.id);
    setError('');
    setMessage('');

    try {
      const updated = await updateOwnerItemApi(item.id, { status: nextStatus });
      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? updated : entry))
      );
      setMessage(`Status updated to ${nextStatus}.`);
      setError('');
    } catch (err: unknown) {
      const renewalErr = err as { response?: { status?: number; data?: { requires_renewal?: boolean } } };
      if (
        isRenewalRequiredError(err) ||
        (renewalErr.response?.status === 402 && renewalErr.response?.data?.requires_renewal)
      ) {
        redirectToRenewal(isRenewalRequiredError(err) ? err.itemId : item.id);
        return;
      }
      setMessage('');
      setError(getApiErrorMessage(err, 'Could not update status.'));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId || !draft.title || !draft.description || draft.price === undefined) {
      setMessage('Please fill title, description, and price before saving.');
      setError('');
      return;
    }
    try {
      const updated = await updateOwnerItemApi(editingId, {
        title: draft.title,
        category: draft.category,
        description: draft.description,
        price: Number(draft.price),
        location: draft.location,
        status: draft.status,
      });
      setItems((prev) =>
        prev.map((entry) => (entry.id === editingId ? updated : entry))
      );
      setMessage('Item saved successfully.');
      setError('');
    } catch (err: unknown) {
      const renewalErr = err as { response?: { status?: number; data?: { requires_renewal?: boolean } } };
      if (
        isRenewalRequiredError(err) ||
        (renewalErr.response?.status === 402 && renewalErr.response?.data?.requires_renewal)
      ) {
        redirectToRenewal(isRenewalRequiredError(err) ? err.itemId : editingId);
        return;
      }
      setMessage('');
      setError(getApiErrorMessage(err, 'Could not save changes.'));
    }
  };

  const activeCount = useMemo(
    () => items.filter((item) => item.status === 'Active').length,
    [items]
  );

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Inventory</div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Manage listings</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              All items you posted from your seller account
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-3xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100">
              Active: {activeCount} / {items.length}
            </div>
            <Link
              to="../add"
              className="rounded-3xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Add item
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-200">
          {message}
        </div>
      )}

      {editingId && (
        <form onSubmit={handleSave} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Editing item</div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Update fields and save changes.</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Item title
              <input
                value={draft.title || ''}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Price (ETB)
              <input
                type="number"
                value={draft.price ?? ''}
                onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Status
              <select
                value={draft.status || 'Pending'}
                disabled={draft.status === 'Pending' || draft.status === 'Sold' || draft.status === 'Rented'}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerItemStatus })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20 disabled:opacity-60"
              >
                {(editingId
                  ? getStatusOptions(items.find((i) => i.id === editingId)!)
                  : ['Pending']
                ).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Category
              <input
                value={draft.category || ''}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Description
            <textarea
              rows={4}
              value={draft.description || ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Location
            <input
              value={draft.location || ''}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-3xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Save changes
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="px-6 py-5 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          Listing inventory
        </div>
        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">Loading your listings...</div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.24em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4">Item</th>
                  <th className="px-5 py-4">Price</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-20 overflow-hidden rounded-3xl bg-slate-100">
                          <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{item.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-slate-900 dark:text-slate-100">
                      ETB {item.price.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 align-top">
                      {item.status === 'Pending' ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          Pending approval
                        </span>
                      ) : item.status === 'Sold' || item.status === 'Rented' ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {item.status}
                        </span>
                      ) : (
                        <select
                          value={item.status}
                          disabled={updatingStatusId === item.id}
                          onChange={(e) => handleStatusChange(item, e.target.value as OwnerItemStatus)}
                          aria-label={`Change status for ${item.title}`}
                          title={`Change status for ${item.title}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
                        >
                          {getStatusOptions(item).map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        {(item.status !== 'Sold' && item.status !== 'Rented') && (
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                        {(item.status === 'Sold' || item.status === 'Rented') && (
                          <button
                            type="button"
                            onClick={() => navigate(`${basePath}/renew/${item.id}`)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
                          >
                            <CheckCircle2 size={14} /> Renew to Active
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                      No listings found.{' '}
                      <Link to="../add" className="font-semibold text-brand-600 hover:underline">
                        Add an item
                      </Link>{' '}
                      to start selling.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(OwnerManageItems);
