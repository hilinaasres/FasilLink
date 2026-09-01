import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getItems, updateItemStatus, getItem, updateItemNote } from '../services/adminService';
import { useToast } from '../context/ToastContext';

const statusLabels = {
  active: 'Active',
  pending_approval: 'Pending Approval',
  rejected: 'Rejected',
  sold: 'Sold',
  rented: 'Rented',
  expired: 'Expired',
  suspended: 'Suspended',
  removed: 'Removed',
};

export default function Items() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState(statusParam || 'all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  useEffect(() => {
    if (statusParam) {
      setFilter(statusParam);
    } else {
      setFilter('all');
    }
  }, [statusParam]);

  useEffect(() => {
    async function loadItems() {
      try {
        const data = await getItems();
        setItems(data);
      } catch (error) {
        notify('Unable to load items.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadItems();
  }, [notify]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter = filter === 'all' || item.status === filter;
      if (!matchesFilter) return false;
      if (!query) return true;
      return [item.title, item.category, item.owner_name, item.owner_email].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [filter, items, search]);

  const updateStatus = async (item, status) => {
    let rejectionReason;
    if (status === 'rejected') {
      rejectionReason = window.prompt('Please enter a reason for rejecting this listing.', 'Community guidelines violation');
      if (!rejectionReason) {
        return;
      }
    }
    try {
      await updateItemStatus(item.id, status, rejectionReason);
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, status } : row)));
      notify(`Item updated to ${statusLabels[status]}.`, 'success');
    } catch (error) {
      notify('Unable to update item status.', 'error');
    }
  };

  const handleRemove = async (item) => {
    if (!window.confirm(`Remove listing "${item.title}"? This cannot be undone.`)) return;
    await updateStatus(item, 'removed');
  };

  const handleUnsuspend = async (item) => {
    if (!window.confirm(`Unsuspend listing "${item.title}" and make it active again?`)) return;
    await updateStatus(item, 'active');
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  const openView = async (itemId) => {
    try {
      const data = await getItem(itemId);
      setModalItem(data);
      setAdminNote(data?.admin_note || data?.adminNote || '');
      setModalOpen(true);
    } catch (err) {
      notify('Unable to load item details.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="panel-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Item Management</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Approve, review and moderate listings</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                if (e.target.value === 'all') {
                  setSearchParams({});
                } else {
                  setSearchParams({ status: e.target.value });
                }
              }}
              className="rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items by title, category or owner"
              className="rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>
      </div>

      <div className="panel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-950/70 text-slate-500">
              <tr>
                <th className="px-5 py-5">Item</th>
                <th className="px-5 py-5">Category</th>
                <th className="px-5 py-5">Owner</th>
                <th className="px-5 py-5">Price</th>
                <th className="px-5 py-5">Type</th>
                <th className="px-5 py-5">Status</th>
                <th className="px-5 py-5">Created</th>
                <th className="px-5 py-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse border-t border-slate-800/80">
                    <td colSpan="8" className="px-5 py-5 text-slate-500">Loading items…</td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr className="border-t border-slate-800/80">
                  <td colSpan="8" className="px-5 py-7 text-center text-slate-400">No items match your filters.</td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-t border-slate-800/80 hover:bg-slate-950/80">
                    <td className="px-5 py-5">
                      <div className="font-medium text-white">{item.title}</div>
                      <p className="text-xs text-slate-500">{item.location}</p>
                    </td>
                    <td className="px-5 py-5 text-slate-300">{item.category || 'Uncategorized'}</td>
                    <td className="px-5 py-5 text-slate-300">{item.owner_name || 'Unknown'}</td>
                    <td className="px-5 py-5 text-slate-300">${item.price}</td>
                    <td className="px-5 py-5 text-slate-300">
                      <div>{item.transaction_type?.toUpperCase()}</div>
                      <div className="mt-2">
                        <button
                          onClick={() => openView(item.id)}
                          className="rounded-2xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                        >
                          View
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <span className="rounded-full bg-slate-800/90 px-3 py-1.5 text-xs text-slate-300">{statusLabels[item.status] || item.status}</span>
                    </td>
                    <td className="px-5 py-5 text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-5">
                      <div className="flex flex-wrap gap-3">
                        {item.status === 'pending_approval' && (
                          <>
                            <button
                              onClick={() => updateStatus(item, 'active')}
                              className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/15"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateStatus(item, 'rejected')}
                              className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/15"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {item.status === 'active' && (
                          <button
                            onClick={() => updateStatus(item, 'suspended')}
                            className="rounded-2xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/15"
                          >
                            Suspend
                          </button>
                        )}
                        {item.status === 'suspended' && (
                          <button
                            onClick={() => handleUnsuspend(item)}
                            className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/15"
                          >
                            Unsuspend
                          </button>
                        )}
                        {item.status !== 'removed' && (
                          <button
                            onClick={() => handleRemove(item)}
                            className="rounded-2xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {modalOpen && modalItem && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 max-w-3xl w-full bg-slate-900 rounded-2xl p-6 shadow-lg overflow-auto" style={{ maxHeight: '85vh' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{modalItem.title}</h3>
                <p className="text-sm text-slate-400">{modalItem.category} • {modalItem.location}</p>
              </div>
              <div>
                <button onClick={() => setModalOpen(false)} className="text-sm text-slate-400">Close</button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                {modalItem.images && modalItem.images.length > 0 && (
                  <div className="space-y-2">
                    {modalItem.images.map((src, idx) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <img key={idx} src={src} alt={`img-${idx}`} className="w-full rounded-md object-cover" />
                    ))}
                  </div>
                )}
                {modalItem.legal_document && (
                  <div className="mt-3">
                    <a href={modalItem.legal_document} target="_blank" rel="noreferrer" className="text-sky-300 underline">View legal document</a>
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-300">Description</h4>
                <p className="text-sm text-slate-400 mt-2">{modalItem.description}</p>

                <h4 className="mt-4 text-sm font-semibold text-slate-300">Metadata</h4>
                <pre className="mt-2 text-xs text-slate-400 bg-slate-800 p-3 rounded-md overflow-auto">{JSON.stringify(modalItem.metadata || {}, null, 2)}</pre>

                <h4 className="mt-4 text-sm font-semibold text-slate-300">Contact</h4>
                <p className="text-sm text-slate-400 mt-2">{modalItem.contact_phone || modalItem.owner_phone || '—'}</p>
                <h4 className="mt-4 text-sm font-semibold text-slate-300">Admin note (internal)</h4>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add an internal message for the owner (this will not be sent to the owner unless you choose to)"
                  className="w-full mt-2 min-h-[80px] p-2 rounded-md bg-slate-800 text-slate-200 border border-slate-700 resize-vertical"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await updateItemNote(modalItem.id, adminNote);
                        notify('Admin note saved (internal).', 'success');
                        // refresh modal item
                        const refreshed = await getItem(modalItem.id);
                        setModalItem(refreshed);
                      } catch (err) {
                        notify('Unable to save admin note.', 'error');
                      }
                    }}
                    className="rounded-2xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500"
                  >
                    Save note
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
