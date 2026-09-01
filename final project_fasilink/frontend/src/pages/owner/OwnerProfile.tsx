import React, { useEffect, useState } from 'react';
import { Camera, Save } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  loadOwnerProfile,
  OwnerProfile as OwnerProfileData,
  saveOwnerProfile,
} from './ownerStorage';
import { buildOwnerProfileFromUser, syncProfilesFromApiUser } from '../../utils/profileSync';
import resizeImageFileToDataUrl from '../../utils/image';

export default function OwnerProfile() {
  const { user } = useAuth();
  const { setUser, token: authToken } = useAuth();
  const [profile, setProfile] = useState<OwnerProfileData | null>(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get('/auth/me');
        const apiUser = response.data?.user;
        if (apiUser) {
          setProfile(buildOwnerProfileFromUser(apiUser));
          syncProfilesFromApiUser(apiUser);
          return;
        }
      } catch {
        // fall back to local profile
      }

      const local = loadOwnerProfile();
      if (user?.email && !local.email) {
        local.email = user.email;
      }
      if (user?.fullName && local.fullName === 'Fasil Link Seller') {
        local.fullName = user.fullName;
      }
      setProfile(local);
    };

    loadProfile().finally(() => setLoading(false));
  }, [user]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage('');
    try {
      const cityPart = profile.address?.split(',')[0]?.trim() || 'Gondar';
      const payload: any = {
        name: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        business_name: profile.businessName,
        address: profile.address,
        bio: profile.bio,
        city: cityPart,
      };
      if (profile.avatarUrl && profile.avatarUrl.length < 350000) payload.profileImage = profile.avatarUrl;
      const response = await api.patch('/auth/profile', payload);
      const updated = response.data?.user;
      if (updated) {
        const nextProfile = buildOwnerProfileFromUser(updated);
        if (profile.avatarUrl) {
          nextProfile.avatarUrl = profile.avatarUrl;
        }
        setProfile(nextProfile);
        syncProfilesFromApiUser(updated);
        try {
          setUser({
            id: updated.id,
            fullName: updated.name,
            name: updated.name,
            email: updated.email,
            phone: updated.phone || null,
            role: updated.role,
            isSeller: Boolean(updated.is_seller || updated.isSeller),
            token: authToken || undefined,
            avatar: updated.profile_image || updated.profileImage || profile.avatarUrl || null,
          } as any);
        } catch {}
      } else {
        saveOwnerProfile(profile);
      }
      setMessage('Profile updated successfully.');
    } catch (err: unknown) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      // Fallback: save locally if server update fails (e.g., offline, server error, or localStorage full)
      try {
        saveOwnerProfile(profile);
      } catch (e) {
        console.error('Failed to save profile locally:', e);
      }
      setMessage(apiError ? `${apiError} (changes saved locally)` : 'Unable to save profile. Changes saved locally.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, 600, 0.8);
      if (dataUrl.length > 350000) {
        setMessage('Avatar image is too large after resizing. Please choose a smaller image.');
        return;
      }
      setProfile((prev) => (prev ? { ...prev, avatarUrl: dataUrl } : prev));
    } catch (e) {
      setMessage('Failed to process image. Please try another file.');
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading profile...</div>;
  }

  if (!profile) return null;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
              {(() => {
                const API_ROOT = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/api\/?$/, '');
                const src = profile.avatarUrl;
                let display = '';
                try {
                  if (src && String(src).startsWith('data:')) display = src;
                  else if (src && (String(src).startsWith('/uploads/') || String(src).includes('profile_'))) {
                    const base = String(src).startsWith('/uploads/') ? `${API_ROOT}${src}` : src;
                    display = `${base}${base.includes('?') ? '&' : '?'}t=${Date.now()}`;
                  } else {
                    display = src || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=facearea&facepad=4&w=200&h=200&q=80';
                  }
                } catch {}
                return (
                  <img src={display} alt="Profile" className="h-28 w-28 rounded-full object-cover shadow-sm" />
                );
              })()}
              <label className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition hover:bg-brand-700">
                <Camera size={18} />
                <input aria-label="Upload profile photo" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900 dark:text-white">{profile.fullName}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{profile.businessName}</div>
            </div>
          </div>
          <div className="mt-6 space-y-3 rounded-3xl bg-white p-4 shadow-sm dark:bg-slate-900">
            {uploading && (
              <div className="rounded-2xl border border-amber-200 bg-amber-100 px-4 py-3 text-sm text-amber-900">
                Uploading avatar image...
              </div>
            )}
            <div className="text-sm text-slate-500 dark:text-slate-400">Contact</div>
            <div className="text-sm text-slate-900 dark:text-slate-100">{profile.email}</div>
            <div className="text-sm text-slate-900 dark:text-slate-100">{profile.phone}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Address</div>
            <div className="text-sm text-slate-900 dark:text-slate-100">{profile.address}</div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">Business profile</div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Update your owner profile</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Registration details are saved here automatically. Update your public seller profile anytime.
            </p>
          </div>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Full name
                <input
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
                />
              </label>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Phone number
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Business name
                <input
                  value={profile.businessName}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
                />
              </label>
            </div>
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Address
              <input
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Bio
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={4}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              />
            </label>
            {message && (
              <div className={`rounded-3xl border p-4 text-sm ${message.includes('success') ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                {message}
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-3xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
