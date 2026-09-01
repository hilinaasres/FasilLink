import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import {
  loadOwnerSecurity,
  OwnerSecurityState,
  saveOwnerSecurity,
} from './ownerStorage';

export default function OwnerSecurity() {
  const [security, setSecurity] = useState<OwnerSecurityState | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    setSecurity(loadOwnerSecurity());
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!security) return;
    if (currentPassword !== security.password) {
      setError('Current password is incorrect.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    const nextState: OwnerSecurityState = { password: newPassword };
    saveOwnerSecurity(nextState);
    setSecurity(nextState);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccess('Password updated successfully.');
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Security</div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Change your password</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Keep your account secure with a strong password. Use the form below to update your credentials.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100">
            Secure account management
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-200">
              {success}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="relative block rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              <span className="font-medium text-slate-700 dark:text-slate-300">Current password</span>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-2 w-full bg-transparent text-sm outline-none"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((value) => !value)}
                className="absolute right-4 top-5 text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </label>
            <label className="relative block rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              <span className="font-medium text-slate-700 dark:text-slate-300">New password</span>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-2 w-full bg-transparent text-sm outline-none"
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((value) => !value)}
                className="absolute right-4 top-5 text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </label>
            <label className="block rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              <span className="font-medium text-slate-700 dark:text-slate-300">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 w-full bg-transparent text-sm outline-none"
                placeholder="Confirm new password"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-3xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Lock size={18} /> Update password
          </button>
        </form>
      </div>
    </div>
  );
}
