import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, updateUser } = useDashboard();

  const initial = useMemo(
    () => ({
      name: user?.name || '',
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      country: user?.country || '',
      city: user?.city || '',
      address: user?.address || '',
      bio: user?.bio || '',
    }),
    [user]
  );

  const [form, setForm] = useState(initial);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Edit Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Keep your details up to date for a better experience.
        </p>
      </div>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          updateUser(form);
          navigate('/customer/profile');
        }}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Full name"
            value={form.name}
            onChange={(v) => setForm((p) => ({ ...p, name: v }))}
            placeholder="Your name"
          />
          <Field
            label="Username"
            value={form.username}
            onChange={(v) => setForm((p) => ({ ...p, username: v }))}
            placeholder="username"
          />
          <Field
            label="Email"
            value={form.email}
            onChange={(v) => setForm((p) => ({ ...p, email: v }))}
            placeholder="you@example.com"
            type="email"
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
            placeholder="+251..."
          />
          <Field
            label="Country"
            value={form.country}
            onChange={(v) => setForm((p) => ({ ...p, country: v }))}
            placeholder="Ethiopia"
          />
          <Field
            label="City"
            value={form.city}
            onChange={(v) => setForm((p) => ({ ...p, city: v }))}
            placeholder="Gondar"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Address
          </label>
          <input
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            placeholder="Street / Neighborhood"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none ring-brand-200 focus:border-brand-400 focus:ring-4 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Bio
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
            placeholder="Tell us a little about you..."
            className="mt-2 min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none ring-brand-200 focus:border-brand-400 focus:ring-4 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none ring-brand-200 focus:border-brand-400 focus:ring-4 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      />
    </div>
  );
}

