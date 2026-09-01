import React, { useState } from 'react';

export default function Security() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const disabled = !current || !next || next !== confirm;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Security
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Update your password and keep your account secure.
        </p>
      </div>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          // Placeholder: wire to backend endpoint when available.
          setCurrent('');
          setNext('');
          setConfirm('');
          alert('Password update UI ready. Connect to backend when endpoint is available.');
        }}
      >
        <Field label="Current password" value={current} onChange={setCurrent} />
        <Field label="New password" value={next} onChange={setNext} />
        <Field label="Confirm new password" value={confirm} onChange={setConfirm} />

        {next && confirm && next !== confirm && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-200">
            Passwords do not match.
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={disabled}
            className={[
              'rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm',
              disabled ? 'bg-slate-400 dark:bg-slate-700' : 'bg-brand-600 hover:bg-brand-700',
            ].join(' ')}
          >
            Update Password
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none ring-brand-200 focus:border-brand-400 focus:ring-4 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      />
    </div>
  );
}

