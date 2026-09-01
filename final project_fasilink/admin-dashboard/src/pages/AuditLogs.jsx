import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getAuditLogs } from '../services/adminService';
import { useToast } from '../context/ToastContext';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await getAuditLogs();
        setLogs(data.logs || []);
      } catch (error) {
        notify('Unable to load audit logs.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [notify]);

  return (
    <div className="space-y-5">
      <div className="panel-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Audit logs</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Admin actions and security events</h2>
          </div>
          <p className="max-w-xl text-sm text-slate-400">Review logins, approvals, item changes and moderation updates with full audit context.</p>
        </div>
      </div>

      <div className="panel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-950/70 text-slate-500">
              <tr>
                <th className="px-5 py-5">Timestamp</th>
                <th className="px-5 py-5">Admin</th>
                <th className="px-5 py-5">Action</th>
                <th className="px-5 py-5">Resource</th>
                <th className="px-5 py-5">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse border-t border-slate-800/80">
                    <td colSpan="5" className="px-5 py-5 text-slate-500">Loading audit events…</td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr className="border-t border-slate-800/80">
                  <td colSpan="5" className="px-5 py-7 text-center text-slate-400">No audit events available.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-800/80 hover:bg-slate-950/80">
                    <td className="px-5 py-5 text-slate-200">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-5 py-5 text-slate-200">{log.admin_name || 'Admin'}</td>
                    <td className="px-5 py-5 text-slate-200">{log.action_type}</td>
                    <td className="px-5 py-5 text-slate-200">{log.resource_type || 'System'}</td>
                    <td className="px-5 py-5 text-slate-400">{log.ip_address || '–'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
