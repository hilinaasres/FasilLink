import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getChargingRules, 
  createChargingRule, 
  updateChargingRule, 
  deleteChargingRule, 
  toggleChargingRule,
  getChargingPayments
} from '../services/adminService';
import { useToast } from '../context/ToastContext';

export default function Charging() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const { notify } = useToast();

  // Tab State
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' or 'payments'

  // Payments State
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form State
  const [formData, setFormData] = useState({
    listing_type: 'New Item',
    transaction_type: 'Sale',
    category: 'Homes',
    min_price: '',
    max_price: '',
    fee_percentage: ''
  });

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await getChargingRules();
      setRules(data);
    } catch (error) {
      notify('Unable to load charging rules.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      setPaymentsLoading(true);
      const data = await getChargingPayments();
      setPayments(data);
    } catch (error) {
      notify('Unable to load payment records.', 'error');
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    if (activeTab === 'payments') {
      loadPayments();
    }
  }, [activeTab]);

  const handleOpenAdd = () => {
    setEditingRule(null);
    setFormData({
      listing_type: 'New Item',
      transaction_type: 'Sale',
      category: 'Homes',
      min_price: '0',
      max_price: '999999',
      fee_percentage: '5.00'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      listing_type: rule.listing_type,
      transaction_type: rule.transaction_type,
      category: rule.category,
      min_price: parseFloat(rule.min_price),
      max_price: parseFloat(rule.max_price),
      fee_percentage: parseFloat(rule.fee_percentage)
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this charging rule? This action cannot be undone.')) return;
    try {
      await deleteChargingRule(id);
      notify('Charging rule deleted successfully.', 'success');
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      notify('Failed to delete charging rule.', 'error');
    }
  };

  const handleToggle = async (id) => {
    try {
      const updated = await toggleChargingRule(id);
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      notify(`Rule status updated to ${updated.is_active ? 'Active' : 'Inactive'}.`, 'success');
    } catch (error) {
      notify('Failed to toggle rule status.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Number(formData.min_price) < 0 || Number(formData.max_price) <= Number(formData.min_price)) {
      notify('Max price must be greater than min price.', 'error');
      return;
    }
    if (Number(formData.fee_percentage) < 0 || Number(formData.fee_percentage) > 100) {
      notify('Fee percentage must be between 0 and 100.', 'error');
      return;
    }

    try {
      if (editingRule) {
        const updated = await updateChargingRule(editingRule.id, formData);
        setRules((prev) => prev.map((r) => (r.id === editingRule.id ? updated : r)));
        notify('Charging rule updated successfully.', 'success');
      } else {
        const created = await createChargingRule(formData);
        setRules((prev) => [created, ...prev]);
        notify('Charging rule created successfully.', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      notify('Failed to save charging rule.', 'error');
    }
  };

  // Filter Payments
  const filteredPayments = payments.filter((p) => {
    const matchesSearch = 
      (p.owner_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.owner_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.item_title || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || (p.payment_status || '').toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl"></div>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-pulse"></span>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-400">Settings panel</p>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-white tracking-wide">FasilLink Charging Settings</h2>
            <p className="mt-1 text-sm text-slate-400 max-w-xl">
              Configure dynamic percentage-based fee rules for listing new items and renewing expired listings, and monitor marketplace payments.
            </p>
          </div>
          {activeTab === 'rules' ? (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/40 transition hover:bg-purple-500 hover:shadow-purple-500/20 active:scale-[0.98]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Create Fee Rule
            </button>
          ) : (
            <button
              onClick={loadPayments}
              className="flex items-center gap-2 rounded-2xl bg-slate-900 border border-slate-800 px-5 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 active:scale-[0.98]"
            >
              <svg className="h-4.5 w-4.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
              </svg>
              Refresh Payments
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Filters bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Navigation Tabs */}
        <div className="flex items-center p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 max-w-md">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'rules' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Fee Rules
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'payments' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Payment Monitoring
          </button>
        </div>

        {/* Filters (only show for Payments tab) */}
        {activeTab === 'payments' && (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search field */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by owner, listing..."
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 pl-10 text-xs text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition"
              />
              <svg className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid / Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'rules' ? (
          <motion.div
            key="rules"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Rules Table container */}
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-slate-950/90 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-5">Listing Type</th>
                      <th className="px-6 py-5">Transaction Type</th>
                      <th className="px-6 py-5">Category</th>
                      <th className="px-6 py-5">Price Range</th>
                      <th className="px-6 py-5">Fee Rate</th>
                      <th className="px-6 py-5">Status</th>
                      <th className="px-6 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td colSpan="7" className="px-6 py-6 text-slate-500 text-center">
                            <div className="h-4 bg-slate-800/60 rounded-full w-3/4 mx-auto"></div>
                          </td>
                        </tr>
                      ))
                    ) : rules.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                          <svg className="mx-auto h-12 w-12 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          No charging rules defined yet.
                        </td>
                      </tr>
                    ) : (
                      rules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-slate-900/30 transition-colors group">
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              rule.listing_type === 'New Item' 
                                ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' 
                                : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                            }`}>
                              {rule.listing_type}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              rule.transaction_type === 'Rent' 
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            }`}>
                              {rule.transaction_type}
                            </span>
                          </td>
                          <td className="px-6 py-5 font-semibold text-slate-200">{rule.category}</td>
                          <td className="px-6 py-5 text-slate-300 font-mono">
                            {Number(rule.min_price).toLocaleString()} ETB – {Number(rule.max_price) > 9999999 ? '∞' : Number(rule.max_price).toLocaleString() + ' ETB'}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-1">
                              <span className="text-base font-bold text-white">{rule.fee_percentage}%</span>
                              <span className="text-[10px] uppercase text-purple-400 tracking-wider">of price</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <button
                              onClick={() => handleToggle(rule.id)}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                rule.is_active ? 'bg-purple-600' : 'bg-slate-800'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  rule.is_active ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenEdit(rule)}
                                className="p-2 rounded-xl bg-slate-900 text-slate-300 hover:text-purple-400 hover:bg-slate-800 transition"
                                title="Edit Rule"
                              >
                                <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(rule.id)}
                                className="p-2 rounded-xl bg-rose-500/10 text-rose-300 hover:text-rose-200 hover:bg-rose-500/25 transition"
                                title="Delete Rule"
                              >
                                <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="payments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Payments Table container */}
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-slate-950/90 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-5">Item Details</th>
                      <th className="px-6 py-5">Owner</th>
                      <th className="px-6 py-5">Rule Type</th>
                      <th className="px-6 py-5">Listing Price</th>
                      <th className="px-6 py-5">Fee Calculated</th>
                      <th className="px-6 py-5">Method</th>
                      <th className="px-6 py-5">Status</th>
                      <th className="px-6 py-5">Activation Status</th>
                      <th className="px-6 py-5">Payment Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {paymentsLoading ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td colSpan="9" className="px-6 py-6 text-slate-500 text-center">
                            <div className="h-4 bg-slate-800/60 rounded-full w-2/3 mx-auto"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-6 py-12 text-center text-slate-400">
                          No charging transaction records found.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-5">
                            <div>
                              <p className="font-semibold text-slate-100">{payment.item_title || 'Unknown Listing'}</p>
                              <span className="text-[10px] text-slate-400 font-mono">ID: #{payment.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div>
                              <p className="font-medium text-slate-200">{payment.owner_name || 'Owner'}</p>
                              <p className="text-xs text-slate-400">{payment.owner_email || '—'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                payment.listing_type === 'New Item' 
                                  ? 'bg-purple-500/10 text-purple-300 border border-purple-500/10' 
                                  : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/10'
                              }`}>
                                {payment.listing_type}
                              </span>
                              <p className="text-xs text-slate-400 mt-1">{payment.category} · {payment.transaction_type}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5 font-mono font-medium text-slate-300">
                            {Number(payment.item_price).toLocaleString()} ETB
                          </td>
                          <td className="px-6 py-5">
                            <div>
                              <p className="font-bold text-white font-mono">{Number(payment.fee_amount).toLocaleString()} ETB</p>
                              <p className="text-[10px] text-purple-400 font-semibold">{payment.fee_percentage}% rule rate</p>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-slate-300 font-medium">{payment.payment_method || 'Chapa'}</td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              payment.payment_status === 'Paid'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : payment.payment_status === 'Pending'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : payment.payment_status === 'Rejected'
                                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                payment.payment_status === 'Paid' ? 'bg-emerald-400' : payment.payment_status === 'Pending' ? 'bg-amber-400' : 'bg-rose-400'
                              }`}></span>
                              {payment.payment_status}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              payment.item_activation_status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : payment.item_activation_status === 'pending_approval'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : payment.item_activation_status === 'sold'
                                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/10'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                              {payment.item_activation_status || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-slate-400 font-mono text-xs">
                            {new Date(payment.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl"
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
            >
              {/* Modal Glow Accent */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>

              <div className="p-6">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <h3 className="text-lg font-bold text-white">
                    {editingRule ? 'Edit Charging Rule' : 'Create New Fee Rule'}
                  </h3>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-full p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  {/* Listing & Transaction Types */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Listing Type</label>
                      <select
                        value={formData.listing_type}
                        onChange={(e) => setFormData({ ...formData, listing_type: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition"
                      >
                        <option value="New Item">New Item</option>
                        <option value="Renewal">Renewal</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Transaction Type</label>
                      <select
                        value={formData.transaction_type}
                        onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition"
                      >
                        <option value="Sale">Sale</option>
                        <option value="Rent">Rent</option>
                      </select>
                    </div>
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition"
                    >
                      <option value="Homes">Homes</option>
                      <option value="Vehicles">Vehicles</option>
                      <option value="Land">Land</option>
                      <option value="Event Materials">Event Materials</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Services">Services</option>
                      <option value="All">All Categories (Fallback)</option>
                    </select>
                  </div>

                  {/* Price Ranges */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Min Price (ETB)</label>
                      <input
                        type="number"
                        required
                        value={formData.min_price}
                        onChange={(e) => setFormData({ ...formData, min_price: e.target.value })}
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Max Price (ETB)</label>
                      <input
                        type="number"
                        required
                        value={formData.max_price}
                        onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
                        placeholder="999999"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition"
                      />
                    </div>
                  </div>

                  {/* Fee Percentage */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Fee Percentage (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.fee_percentage}
                        onChange={(e) => setFormData({ ...formData, fee_percentage: e.target.value })}
                        placeholder="5.00"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-3 pr-8 py-3 text-sm text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-sm font-semibold text-purple-400">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-1/2 rounded-xl border border-slate-850 bg-slate-850 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/20 transition hover:bg-purple-500 hover:shadow-purple-500/10"
                    >
                      {editingRule ? 'Save Changes' : 'Create Rule'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
