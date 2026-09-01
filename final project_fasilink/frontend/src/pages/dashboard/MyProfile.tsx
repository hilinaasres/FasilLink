import React, { useEffect, useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { Camera, CheckCircle2, X } from 'lucide-react';
import api from '../../services/api';
import { buildCustomerProfileFromUser, syncProfilesFromApiUser } from '../../utils/profileSync';
import resizeImageFileToDataUrl from '../../utils/image';
import { useAuth } from '../../context/AuthContext';

export default function MyProfile() {
  const { user, updateUser } = useDashboard();
  const API_ROOT = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/api\/?$/, '');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [country, setCountry] = useState(user?.country || 'Ethiopia');
  const [city, setCity] = useState(user?.city || 'Gondar');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { logout } = useAuth();
  const { setUser, token: authToken } = useAuth();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get('/auth/me');
        const apiUser = response.data?.user;
        if (apiUser) {
          const customer = buildCustomerProfileFromUser(apiUser);
          updateUser(customer);
          syncProfilesFromApiUser(apiUser);
          return;
        }
      } catch {
        // use dashboard context fallback
      }
    };
    loadProfile();
  }, [updateUser]);

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setCountry(user?.country || 'Ethiopia');
    setCity(user?.city || 'Gondar');
    setAvatarPreview(user?.avatar || '');
  }, [user]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // create an optimized data URL and preview
    resizeImageFileToDataUrl(file, 600, 0.8)
      .then((dataUrl) => {
        setAvatarPreview(dataUrl);
        setAvatarDataUrl(dataUrl);
      })
      .catch(() => {
        // fallback to blob preview
        const url = URL.createObjectURL(file);
        setAvatarPreview(url);
        setAvatarDataUrl(null);
      });
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setCountry(user?.country || 'Ethiopia');
    setCity(user?.city || 'Gondar');
    setAvatarPreview(user?.avatar || '');
    setError('');
    setSuccess('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      setError('Please complete all required fields before saving.');
      setSuccess('');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: any = {
        name,
        email,
        phone,
        country,
        city,
        address: `${city}, ${country}`,
      };
      if (avatarDataUrl) payload.profileImage = avatarDataUrl;
      const response = await api.patch('/auth/profile', payload);
      const updated = response.data?.user;
      if (updated) {
        // Prefer fresh server copy after update
        try {
          const me = await api.get('/auth/me');
          const fresh = me.data?.user || updated;
          const customer = buildCustomerProfileFromUser(fresh);
          updateUser({ ...customer, avatar: fresh.profile_image || fresh.profileImage || avatarPreview });
          syncProfilesFromApiUser(fresh);
          try {
            setUser({
              id: fresh.id,
              fullName: fresh.name,
              name: fresh.name,
              email: fresh.email,
              phone: fresh.phone || null,
              role: fresh.role,
              isSeller: Boolean(fresh.isSeller || fresh.is_seller),
              token: authToken || undefined,
              avatar: fresh.profile_image || fresh.profileImage || avatarPreview,
            } as any);
          } catch {}
        } catch {
          const customer = buildCustomerProfileFromUser(updated);
          updateUser({ ...customer, avatar: updated.profile_image || updated.profileImage || avatarPreview });
          syncProfilesFromApiUser(updated);
          try {
            setUser({
              id: updated.id,
              fullName: updated.name,
              name: updated.name,
              email: updated.email,
              phone: updated.phone || null,
              role: updated.role,
              isSeller: Boolean(updated.isSeller || updated.is_seller),
              token: authToken || undefined,
              avatar: updated.profile_image || updated.profileImage || avatarPreview,
            } as any);
          } catch {}
        }
      } else {
        // API didn't return updated user; try to re-fetch server copy
        try {
          const me = await api.get('/auth/me');
          const fresh = me.data?.user;
          if (fresh) {
            const customer = buildCustomerProfileFromUser(fresh);
            updateUser({ ...customer, avatar: avatarPreview });
            syncProfilesFromApiUser(fresh);
          } else {
            updateUser({ name, email, phone, country, city, avatar: avatarPreview });
          }
        } catch {
          updateUser({ name, email, phone, country, city, avatar: avatarPreview });
        }
      }
      setSuccess('Profile updated successfully');
    } catch (err: unknown) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      // If update fails, persist changes locally in the dashboard context as a fallback
      try {
        updateUser({ name, email, phone, country, city, avatar: avatarPreview });
      } catch (e) {
        console.error('Failed to persist profile locally:', e);
      }
      // If error is authentication related, clear auth and prompt login
      const status = (err as any)?.response?.status;
      if (status === 401 || /token/i.test(String(apiError || ''))) {
        try {
          logout();
        } catch {}
        setError(apiError ? `${apiError} (changes applied locally)` : 'Invalid token. (changes applied locally)');
        // do not auto-navigate away; user can sign in again from navbar
      } else {
        setError(apiError ? `${apiError} (changes applied locally)` : 'Unable to save profile. Changes applied locally.');
      }
      setSuccess('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-violet-600">My profile</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-950">Update your account details</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Keep your profile polished and accurate to improve your marketplace experience.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              <CheckCircle2 size={18} className="text-violet-600" />
              Secure profile
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 text-center">
              <div className="mx-auto mb-6 h-28 w-28 overflow-hidden rounded-[1.4rem] bg-violet-600 text-3xl font-semibold text-white shadow-lg shadow-violet-600/20">
                {(() => {
                  const toDisplay = (() => {
                    if (!avatarPreview) return null;
                    try {
                      const s = String(avatarPreview);
                      if (s.startsWith('data:')) return s;
                      if (s.startsWith('/uploads/') || s.includes('profile_')) {
                        const base = s.startsWith('/uploads/') ? `${API_ROOT}${s}` : s;
                        return `${base}${base.includes('?') ? '&' : '?'}t=${Date.now()}`;
                      }
                      return s;
                    } catch {
                      return avatarPreview;
                    }
                  })();
                  return toDisplay ? (
                    <img src={toDisplay} alt="Avatar preview" className="h-full w-full object-cover" />
                  ) : (
                  user?.name
                    ?.split(' ')
                    .map((part) => part.charAt(0))
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                  );
                })()}
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-3xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100">
                <Camera size={18} />
                Upload Photo
                <input aria-label="Upload profile photo" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
              </label>
              <p className="mt-4 text-sm text-slate-500">Preferred image size is 400x400px.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {(error || success) && (
                <div className={`rounded-3xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                  {error || success}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="relative">
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder=" "
                    className="peer h-14 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    required
                  />
                  <label htmlFor="profile-name" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:text-xs peer-focus:text-violet-600">
                    Full Name
                  </label>
                </div>

                <div className="relative">
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=" "
                    className="peer h-14 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    required
                  />
                  <label htmlFor="profile-email" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:text-xs peer-focus:text-violet-600">
                    Email Address
                  </label>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="relative">
                  <input
                    id="profile-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder=" "
                    className="peer h-14 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    required
                  />
                  <label htmlFor="profile-phone" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:text-xs peer-focus:text-violet-600">
                    Phone Number
                  </label>
                </div>

                <div className="relative">
                  <select
                    id="profile-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="peer h-14 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="" disabled hidden>Select country</option>
                    <option>Ethiopia</option>
                    <option>United States</option>
                    <option>Kenya</option>
                    <option>United Kingdom</option>
                  </select>
                  <label htmlFor="profile-country" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all">
                    Country
                  </label>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="relative">
                  <input
                    id="profile-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder=" "
                    className="peer h-14 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    required
                  />
                  <label htmlFor="profile-city" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:text-xs peer-focus:text-violet-600">
                    City
                  </label>
                </div>
                <div className="hidden sm:block" />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex h-14 items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <X size={18} />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-14 items-center justify-center rounded-3xl bg-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

