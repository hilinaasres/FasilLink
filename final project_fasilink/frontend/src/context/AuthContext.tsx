import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAuthToken } from '../services/api';
import { syncProfilesFromApiUser } from '../utils/profileSync';

type AuthUser = {
  id: number | string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  isSeller?: boolean;
  token?: string | null;
  avatar?: string | null;
  profile_image?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  loginState: boolean;
  setUser: (u: AuthUser | null) => void;
  setToken: (t: string | null) => void;
  logout: () => void;
  becomeSeller: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCAL_KEY = 'user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed || null;
      }
    } catch {}
    return null;
  });

  const [token, setTokenState] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.token) setAuthToken(parsed.token);
        return parsed?.token || null;
      }
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState(false);

  const persist = useCallback((u: AuthUser | null) => {
    if (!u) {
      localStorage.removeItem(LOCAL_KEY);
      setUserState(null);
      setTokenState(null);
      setAuthToken(null);
      return;
    }
    const API_ROOT = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/api\/?$/, '');
    const addTs = (url: string | null | undefined) => {
      if (!url) return null;
      try {
        const s = String(url);
        // If it's a backend-relative uploads path, prefix with API root
        if (s.startsWith('/uploads/') || s.includes('profile_')) {
          const base = s.startsWith('/uploads/') ? `${API_ROOT}${s}` : s;
          // avoid adding duplicate timestamp if already present
          if (/[?&]t=\d+/.test(base)) return base;
          return `${base}${base.includes('?') ? '&' : '?'}t=${Date.now()}`;
        }
      } catch {}
      return url;
    };

    const payload = {
      id: u.id,
      fullName: u.fullName || u.name || null,
      email: u.email || null,
      phone: u.phone || null,
      role: u.role || 'user',
      isSeller: Boolean(u.isSeller),
      token: u.token || null,
      avatar: addTs((u as any).avatar || (u as any).profile_image || null),
    };
    if (payload.email) {
      try {
        localStorage.setItem('fasilink-owner-email', payload.email);
      } catch {}
    }
    if (payload.fullName) {
      try {
        localStorage.setItem('fasilink-owner-name', payload.fullName);
      } catch {}
    }
    if (payload.phone) {
      try {
        localStorage.setItem('fasilink-owner-phone', payload.phone);
      } catch {}
    }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(payload));
    setUserState(payload as AuthUser);
    setTokenState(payload.token as string | null);
    if (payload.token) setAuthToken(payload.token);
  }, []);

  const loadUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/auth/me');
      const profile = res.data?.user;
      if (!profile) return;
      syncProfilesFromApiUser(profile);
      persist({
        id: profile.id,
        fullName: profile.name,
        name: profile.name,
        email: profile.email,
        phone: profile.phone || null,
        role: profile.role,
        isSeller: Boolean(profile.isSeller),
        token,
        avatar: profile.profile_image || profile.profileImage || null,
        profile_image: profile.profile_image || profile.profileImage || null,
      });
    } catch {
      // ignore — payment flow will still use server-side profile lookup
    }
  }, [persist, token]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const setUser = useCallback((u: AuthUser | null) => persist(u), [persist]);
  const setToken = useCallback((t: string | null) => {
    const cur = user ? { ...user, token: t } : null;
    persist(cur);
  }, [persist, user]);

  const logout = useCallback(() => {
    persist(null);
  }, [persist]);

  const becomeSeller = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.post('/auth/become-seller');
      const updatedUser = res.data?.user;
      const newToken = res.data?.token || res.data?.token;
      if (updatedUser) {
        syncProfilesFromApiUser(updatedUser);
        const u = {
          id: updatedUser.id,
          fullName: updatedUser.name || updatedUser.fullName,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone || null,
          role: updatedUser.role || 'user',
          isSeller: Boolean(updatedUser.is_seller || updatedUser.isSeller),
          token: newToken || (user?.token ?? null),
        };
        persist(u);
      }
    } finally {
      setLoading(false);
    }
  }, [persist, user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    loginState: Boolean(user && token),
    setUser,
    setToken,
    logout,
    becomeSeller,
  }), [becomeSeller, loading, logout, setToken, setUser, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
