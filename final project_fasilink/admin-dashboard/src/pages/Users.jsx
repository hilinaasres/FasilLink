import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getUsers, updateUserStatus, createAdminAccount } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const statusMap = {
  active: 'Active',
  suspended: 'Suspended',
  revoked: 'Blocked',
};

export default function Users() {
  const [searchParams, setSearchParams] = useSearchParams();
  const roleFilter = searchParams.get('role');
  const statusFilter = searchParams.get('status');
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', name: '', adminRole: 'ADMIN' });
  const { notify } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = String(user?.adminRole || user?.admin_role || '').trim().toUpperCase() === 'SUPER_ADMIN';

  const clearFilters = () => {
    setSearchParams({});
  };

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await getUsers();
        setUsers(data);
      } catch (error) {
        notify('Unable to load users list.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, [notify]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (roleFilter && String(user.role || '').toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter && String(user.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [user.name, user.email, user.role].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [search, roleFilter, statusFilter, users]);

  const handleStatus = async (id, status) => {
    try {
      await updateUserStatus(id, status);
      setUsers((current) => current.map((user) => (user.id === id ? { ...user, status } : user)));
      notify(`User status updated to ${statusMap[status] || status}.`, 'success');
    } catch (error) {
      notify('Unable to update user status.', 'error');
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      await createAdminAccount(createForm);
      notify('Admin account created successfully.', 'success');
      setCreateForm({ email: '', password: '', name: '', adminRole: 'ADMIN' });
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      notify(error.response?.data?.error || 'Unable to create admin account.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="panel-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">User Management</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Active accounts and moderation tools</h2>
            {(roleFilter || statusFilter) && (
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-300">
                  <span>
                    Showing {roleFilter === 'owner' ? 'Item Owners' : roleFilter || ''}
                    {statusFilter ? ` (${statusMap[statusFilter] || statusFilter} accounts)` : ''}
                  </span>
                  <button
                    onClick={clearFilters}
                    className="ml-1 rounded-full p-0.5 hover:bg-sky-500/20 text-sky-400 transition"
                  >
                    ✕
                  </button>
                </span>
              </div>
            )}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or role"
            className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>
      </div>

      {isSuperAdmin && (
        <div className="panel-card p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Super Admin</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Create admin account</h3>
              <p className="mt-2 text-sm text-slate-400">Create a new admin login with email and password. Passwords are hashed before saving.</p>
            </div>
          </div>
          <form onSubmit={handleCreateAccount} className="mt-5 grid gap-4 lg:grid-cols-4">
            <input
              type="text"
              placeholder="Name (optional)"
              value={createForm.name}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
              className="rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <input
              type="email"
              placeholder="Admin email"
              value={createForm.email}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              className="rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <input
              type="password"
              placeholder="Temporary password"
              value={createForm.password}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
              className="rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <div className="flex gap-3">
              <select
                value={createForm.adminRole}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, adminRole: e.target.value }))}
                className="flex-1 rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="ADMIN">Admin</option>
                <option value="MODERATOR">Moderator</option>
              </select>
              <button
                type="submit"
                disabled={creating}
                className="rounded-3xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-950/70 text-slate-500">
              <tr>
                <th className="px-5 py-5">Profile</th>
                <th className="px-5 py-5">Role</th>
                <th className="px-5 py-5">Status</th>
                <th className="px-5 py-5">Join Date</th>
                <th className="px-5 py-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse border-t border-slate-800/80">
                    <td colSpan="5" className="px-5 py-5 text-slate-500">Loading user records…</td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr className="border-t border-slate-800/80">
                  <td colSpan="5" className="px-5 py-7 text-center text-slate-400">No users match your search.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-800/80">
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 text-sm font-semibold text-sky-300">{user.name?.charAt(0) || 'U'}</div>
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-slate-300">{user.role?.toUpperCase()}</td>
                    <td className="px-5 py-5">
                      <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-200' : user.status === 'suspended' ? 'bg-amber-500/10 text-amber-200' : 'bg-rose-500/10 text-rose-200'}`}>
                        {statusMap[user.status] || user.status}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-slate-400">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-5">
                      <div className="flex flex-wrap gap-3">
                        {user.status !== 'active' && (
                          <button
                            onClick={() => handleStatus(user.id, 'active')}
                            className="rounded-2xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                          >
                            Activate
                          </button>
                        )}
                        {user.status !== 'suspended' && (
                          <button
                            onClick={() => handleStatus(user.id, 'suspended')}
                            className="rounded-2xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/15"
                          >
                            Suspend
                          </button>
                        )}
                        {user.status !== 'revoked' && (
                          <button
                            onClick={() => handleStatus(user.id, 'revoked')}
                            className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/15"
                          >
                            Block
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
    </div>
  );
}
