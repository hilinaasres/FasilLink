import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPayments, getChargingPayments } from '../services/adminService';
import { useToast } from '../context/ToastContext';

export default function Payments() {
  const [activeTab, setActiveTab] = useState('charging'); // 'charging' or 'legacy'
  const [chargingPayments, setChargingPayments] = useState([]);
  const [legacyPayments, setLegacyPayments] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const [chargingData, legacyData] = await Promise.all([
        getChargingPayments().catch(() => []),
        getPayments().catch(() => [])
      ]);
      setChargingPayments(chargingData);
      setLegacyPayments(legacyData);
    } catch (error) {
      notify('Unable to fetch transaction records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter & Search Logic
  const filteredCharging = chargingPayments.filter((p) => {
    const matchesSearch = 
      (p.owner_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.owner_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.item_title || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || p.payment_status.toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  const filteredLegacy = legacyPayments.filter((p) => {
    const matchesSearch = 
      (p.owner_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.item_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.transaction_id || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (p.payment_status || '').toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Upper Panel Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl"></div>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-pulse"></span>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-400">Finance & billing</p>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-white tracking-wide">Payment Monitoring</h2>
            <p className="mt-1 text-sm text-slate-400 max-w-xl">
              Track platform fee payments, listing activations, renewal fees, and transaction logs in real time.
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 border border-slate-800 px-5 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 active:scale-[0.98]"
          >
            <svg className="h-4.5 w-4.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
            </svg>
            Sync Records
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Navigation Tabs */}
        <div className="flex items-center p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 max-w-md">
          <button
            onClick={() => setActiveTab('charging')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'charging' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Listing & Renewal Fees
          </button>
          <button
            onClick={() => setActiveTab('legacy')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'legacy' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            System Logs (Legacy)
          </button>
        </div>

        {/* Filters */}
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
      </div>

      {/* Main payment tables */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 shadow-xl overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'charging' ? (
            <motion.div
              key="charging"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
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
                      <th className="px-6 py-5">Payment Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td colSpan="8" className="px-6 py-6 text-slate-500 text-center">
                            <div className="h-4 bg-slate-800/60 rounded-full w-2/3 mx-auto"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredCharging.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                          No charging transaction records found.
                        </td>
                      </tr>
                    ) : (
                      filteredCharging.map((payment) => (
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
                          <td className="px-6 py-5 text-slate-400 font-mono text-xs">
                            {new Date(payment.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="legacy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-slate-950/90 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-5">Transaction ID</th>
                      <th className="px-6 py-5">Owner</th>
                      <th className="px-6 py-5">Item Title</th>
                      <th className="px-6 py-5">Amount</th>
                      <th className="px-6 py-5">Method</th>
                      <th className="px-6 py-5">Status</th>
                      <th className="px-6 py-5">Date Logged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td colSpan="7" className="px-6 py-6 text-slate-500 text-center">
                            <div className="h-4 bg-slate-800/60 rounded-full w-2/3 mx-auto"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredLegacy.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                          No legacy transaction logs found.
                        </td>
                      </tr>
                    ) : (
                      filteredLegacy.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-5 font-mono text-purple-400 font-semibold">{payment.transaction_id || `#${payment.id}`}</td>
                          <td className="px-6 py-5 font-medium text-slate-200">{payment.owner_name || 'Owner'}</td>
                          <td className="px-6 py-5 text-slate-300 font-semibold">{payment.item_title || 'Platform Fee'}</td>
                          <td className="px-6 py-5 font-mono font-bold text-white">{Number(payment.amount).toLocaleString()} ETB</td>
                          <td className="px-6 py-5 text-slate-300">{payment.payment_method || 'Chapa Webhook'}</td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              payment.payment_status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            }`}>
                              {payment.payment_status}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
