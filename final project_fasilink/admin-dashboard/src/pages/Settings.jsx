import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { createAdminAccount, getUsers } from '../services/adminService';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  name: '',
  email: '',
  password: '',
  adminRole: 'ADMIN',
};

export default function Settings() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState(initialForm);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const resolvedAdminRole = String(user?.adminRole || user?.admin_role || '').trim().toUpperCase();
  const isSuperAdmin = resolvedAdminRole === 'SUPER_ADMIN';

  const adminAccounts = useMemo(
    () => users.filter((item) => String(item.role || '').toLowerCase() === 'admin' || item.admin_role),
    [users]
  );

  useEffect(() => {
    async function loadAdmins() {
      try {
        const data = await getUsers();
        setUsers(data || []);
      } catch (error) {
        notify('Unable to load admin accounts.', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadAdmins();
  }, [notify]);

  const refreshAdmins = async () => {
    const data = await getUsers();
    setUsers(data || []);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        adminRole: form.adminRole,
      };
      await createAdminAccount(payload);
      notify('Sub-admin account created successfully.', 'success');
      setForm(initialForm);
      await refreshAdmins();
    } catch (error) {
      notify(error?.response?.data?.error || 'Unable to create sub-admin account.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="panel-card p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Restricted access</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Super admin only</h2>
        <p className="mt-3 text-sm text-slate-400">Only a super admin can create or manage sub-admin accounts from this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="panel-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Super admin console</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Create sub-admin accounts</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Enter a sub-admin email and password here. The backend saves the account in the database, hashes the password securely, and the new login works immediately.
            </p>
          </div>
          <div className="rounded-3xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
            Current user: {user?.name || 'Super Admin'}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel-card p-5">
          <h3 className="text-lg font-semibold text-white">New sub-admin</h3>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-1">
              <span className="text-sm text-slate-300">Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Optional display name"
                className="w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </label>

            <label className="space-y-2 md:col-span-1">
              <span className="text-sm text-slate-300">Account type</span>
              <select
                value={form.adminRole}
                onChange={(e) => setForm((prev) => ({ ...prev, adminRole: e.target.value }))}
                className="w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="ADMIN">Admin</option>
                <option value="MODERATOR">Moderator</option>
              </select>
            </label>

            <label className="space-y-2 md:col-span-1">
              <span className="text-sm text-slate-300">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="subadmin@example.com"
                className="w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                required
              />
            </label>

            <label className="space-y-2 md:col-span-1">
              <span className="text-sm text-slate-300">Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="At least 8 characters"
                className="w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                required
                minLength={8}
              />
            </label>

            <div className="md:col-span-2 flex items-center justify-between gap-4 rounded-3xl border border-slate-800/90 bg-slate-950/80 px-4 py-4">
              <p className="text-sm text-slate-400">
                The new sub-admin can log in with the email and password you enter here after creation.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-3xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </form>
        </div>

        <div className="panel-card p-5">
          <h3 className="text-lg font-semibold text-white">Existing admin accounts</h3>
          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-4 text-sm text-slate-400">Loading admin accounts…</div>
            ) : adminAccounts.length ? (
              adminAccounts.slice(0, 6).map((account) => (
                <div key={account.id} className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{account.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{account.email}</p>
                    </div>
                    <span className="rounded-full bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200">
                      {String(account.admin_role || account.role || 'ADMIN').toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{account.status || 'active'}</span>
                    <span>{account.created_at ? new Date(account.created_at).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-4 text-sm text-slate-400">No admin accounts found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
