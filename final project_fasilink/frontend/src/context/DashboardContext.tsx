import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  gender: string;
  country: string;
  city: string;
  address: string;
  bio: string;
  avatar: string;
  joinDate: string;
  role: string;
}

interface DashboardContextType {
  user: User | null;
  updateUser: (data: Partial<User>) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);
const DARK_MODE_STORAGE_KEY = 'app_dark_mode';

const defaultUser: User = {
  id: 1,
  name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
  phone: '+1234567890',
  gender: 'Male',
  country: 'Ethiopia',
  city: 'Gondar',
  address: 'Azezo, Gondar',
  bio: '',
  avatar: '',
  joinDate: '2024-01-15',
  role: 'customer',
};

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('dash_user');
      return saved ? JSON.parse(saved) : defaultUser;
    } catch {
      return defaultUser;
    }
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(DARK_MODE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('dash_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem(DARK_MODE_STORAGE_KEY, JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  const updateUser = (data: Partial<User>) => {
    const API_ROOT = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/api\/?$/, '');
    const addTs = (url?: string | null) => {
      if (!url) return url || '';
      try {
        const s = String(url);
        if (s.startsWith('/uploads/') || s.includes('profile_')) {
          const base = s.startsWith('/uploads/') ? `${API_ROOT}${s}` : s;
          // avoid adding duplicate timestamp if already present
          if (/[?&]t=\d+/.test(base)) return base;
          return `${base}${base.includes('?') ? '&' : '?'}t=${Date.now()}`;
        }
      } catch {}
      return url;
    };
    if (data.avatar) data.avatar = addTs(data.avatar as string) as any;
    setUser((prev) => (prev ? { ...prev, ...data } : defaultUser));
  };

  return (
    <DashboardContext.Provider value={{ user, updateUser, isDarkMode, toggleDarkMode: () => setIsDarkMode((p) => !p), sidebarOpen, setSidebarOpen }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
};