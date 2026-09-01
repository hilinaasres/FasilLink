import React, { useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import AIAssistant from './pages/AIAssistant';
// import Chat removed - legacy component
// New Desktop Components
import DesktopHomepage from './pages/DesktopHomepage';
import DesktopSearchResults from './pages/DesktopSearchResults';
import DesktopItemDetail from './pages/DesktopItemDetail';
import DesktopFavoritesPage from './pages/DesktopFavoritesPage';
import DesktopCategoryPage from './pages/DesktopCategoryPage';
import Chat from './pages/Chat';
import DesktopNotificationsPage from './pages/DesktopNotificationsPage';
import OwnerDashboard from './pages/OwnerDashboard';
import BecomeSeller from './pages/BecomeSeller';
import PostItemEntry from './pages/PostItemEntry';
import CustomerPostingPage from './pages/CustomerPostingPage';
import OwnerOverview from './pages/owner/OwnerOverview';
import OwnerAddItem from './pages/owner/OwnerAddItem';
import TermsAndConditions from './pages/TermsAndConditions';
import OwnerManageItems from './pages/owner/OwnerManageItems';
import OwnerChat from './pages/owner/OwnerChat';
import OwnerRenewItem from './pages/owner/OwnerRenewItem';
import OwnerNotifications from './pages/owner/OwnerNotifications';
import OwnerProfile from './pages/owner/OwnerProfile';
import OwnerSecurity from './pages/owner/OwnerSecurity';
import OwnerLogout from './pages/owner/OwnerLogout';
import CustomerOwnerProxy from './pages/CustomerOwnerProxy';
import { DashboardProvider } from './context/DashboardContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { NotificationProvider } from './context/NotificationContext';
import CustomerDashboardLayout from './pages/dashboard/CustomerDashboardLayout';
import DashboardOverview from './pages/dashboard/Overview';
import MyProfile from './pages/dashboard/MyProfile';
import EditProfile from './pages/dashboard/EditProfile';
import Favorites from './pages/dashboard/Favorites';
import Notifications from './pages/dashboard/Notifications';
import Security from './pages/dashboard/Security';
import Addresses from './pages/dashboard/Addresses';
import Logout from './pages/dashboard/Logout';
import FavoritesPage from './pages/Favorites';

type Role = 'user' | 'owner' | 'seller' | 'admin' | 'guest';
const DARK_MODE_STORAGE_KEY = 'app_dark_mode';

function normalizeRole(role: unknown, isSeller = false): Role {
  const r = String(role || '').toLowerCase();
  if (r === 'admin') return 'admin';
  if (isSeller || r === 'owner' || r === 'item_owner' || r === 'seller') return 'seller';
  if (r === 'customer' || r === 'user') return 'user';
  return 'guest';
}

function getDefaultDashboardPath(role: Role) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'seller' || role === 'owner') return '/seller';
  if (role === 'user') return '/';
  return '/login';
}

const AppContent: React.FC = () => {
  const location = useLocation();
  const { user, token } = useAuth();

  const role: Role = useMemo(() => normalizeRole(user?.role ?? 'user', Boolean(user?.isSeller)), [user?.role, user?.isSeller]);

  useEffect(() => {
    const applyTheme = () => {
      try {
        const saved = localStorage.getItem(DARK_MODE_STORAGE_KEY);
        const enabled = saved ? JSON.parse(saved) : false;
        document.documentElement.classList.toggle('dark', Boolean(enabled));
        document.body.classList.toggle('dark', Boolean(enabled));
      } catch {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    };

    applyTheme();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === DARK_MODE_STORAGE_KEY) {
        applyTheme();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const RequireRole = ({
    allow,
    children,
  }: {
    allow: Role[];
    children: React.ReactElement;
  }) => {
    const authed = Boolean(token && user);

    if (!authed) {
      return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    const effectiveRole = role;
    const isSeller = Boolean(user?.isSeller);
    const ok =
      allow.includes(effectiveRole) ||
      (allow.includes('user') && (effectiveRole === 'user' || effectiveRole === 'seller')) ||
      (allow.includes('seller') && effectiveRole === 'seller') ||
      (allow.includes('owner') && effectiveRole === 'admin') ||
      (allow.includes('owner') && isSeller);

    if (!ok) {
      return <Navigate to={getDefaultDashboardPath(effectiveRole)} replace />;
    }

    return children;
  };

  // Legacy Chat redirect preserving query params
  const LegacyChatRedirect: React.FC = () => {
    const { search } = useLocation();
    return <Navigate to={`/chats${search}`} replace />;
  };

  const CustomerPostingAddRedirect: React.FC = () => {
    if (!token || !user) {
      return <Navigate to="/login" replace state={{ from: '/customer-posting/add' }} />;
    }

    if (role === 'seller' || role === 'owner' || Boolean(user?.isSeller)) {
      return <Navigate to="/owner/add" replace />;
    }

    return (
      <RequireRole allow={['user']}>
        <CustomerOwnerProxy>
          <OwnerAddItem />
        </CustomerOwnerProxy>
      </RequireRole>
    );
  };

  return (
    <FavoritesProvider>
      <div className="app-shell with-fixed-navbar">
        {/* Navbar and Floating AI Chat removed per request */}
        <main>
          <Routes>
            {/* Desktop Marketplace Routes */}
            <Route path="/" element={<DesktopHomepage />} />
            <Route path="/homepage" element={<DesktopHomepage />} />
            <Route path="/marketplace" element={<DesktopHomepage />} />
            <Route path="/search" element={<DesktopSearchResults />} />
            <Route path="/item/:id" element={<DesktopItemDetail />} />
            <Route path="/category/:categoryId" element={<DesktopCategoryPage />} />
            {/* Alias routes for popular categories */}
            <Route path="/homes" element={<Navigate to="/search?category=homes" replace />} />
            <Route path="/event-materials" element={<Navigate to="/search?category=event-materials" replace />} />
            <Route path="/vehicles" element={<Navigate to="/search?category=vehicles" replace />} />
            <Route path="/vechies" element={<Navigate to="/search?category=vehicles" replace />} />
            <Route path="/rent" element={<DesktopSearchResults />} />
            <Route path="/sell" element={<DesktopSearchResults />} />
            <Route path="/favorites" element={<DesktopFavoritesPage />} />
            <Route path="/chats" element={<Chat />} />
            <Route path="/notifications" element={<DesktopNotificationsPage />} />
            <Route path="/post-item" element={<PostItemEntry />} />
            <Route
              path="/customer-posting"
              element={
                <RequireRole allow={['user']}>
                  <CustomerPostingPage />
                </RequireRole>
              }
            />
            <Route
              path="/customer-posting/add"
              element={<CustomerPostingAddRedirect />}
            />
            <Route
              path="/customer-posting/manage"
              element={
                <RequireRole allow={['user']}>
                  <CustomerOwnerProxy>
                    <OwnerManageItems />
                  </CustomerOwnerProxy>
                </RequireRole>
              }
            />
            <Route
              path="/customer-posting/chat"
              element={
                <RequireRole allow={['user']}>
                  <CustomerOwnerProxy>
                    <OwnerChat />
                  </CustomerOwnerProxy>
                </RequireRole>
              }
            />
            <Route
              path="/customer-posting/renew/:id"
              element={
                <RequireRole allow={['user']}>
                  <CustomerOwnerProxy>
                    <OwnerRenewItem />
                  </CustomerOwnerProxy>
                </RequireRole>
              }
            />
            <Route
              path="/customer-posting/notifications"
              element={
                <RequireRole allow={['user']}>
                  <CustomerOwnerProxy>
                    <OwnerNotifications />
                  </CustomerOwnerProxy>
                </RequireRole>
              }
            />
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            {/* Legacy Routes (backward compatibility) */}
            <Route path="/ai-assistant" element={<AIAssistant />} />
            {/* Legacy Chat redirect preserved by definition above */}
            <Route path="/chat" element={<LegacyChatRedirect />} />
            <Route
              path="/owner/*"
              element={
                <RequireRole allow={['owner', 'admin', 'seller']}>
                  <OwnerDashboard />
                </RequireRole>
              }
            >
              <Route index element={<OwnerOverview />} />
              <Route path="overview" element={<OwnerOverview />} />
              <Route path="dashboard" element={<OwnerOverview />} />
              <Route path="add" element={<OwnerAddItem />} />
              <Route path="manage" element={<OwnerManageItems />} />
              <Route path="renew/:id" element={<OwnerRenewItem />} />
              <Route path="chat" element={<OwnerChat />} />
              <Route path="notifications" element={<OwnerNotifications />} />
              <Route path="profile" element={<OwnerProfile />} />
              <Route path="security" element={<OwnerSecurity />} />
              <Route path="logout" element={<OwnerLogout />} />
            </Route>
            <Route path="/seller/upgrade" element={<BecomeSeller />} />
            <Route
              path="/seller/*"
              element={
                <RequireRole allow={['seller', 'admin']}>
                  <OwnerDashboard />
                </RequireRole>
              }
            >
              <Route index element={<OwnerOverview />} />
              <Route path="overview" element={<OwnerOverview />} />
              <Route path="dashboard" element={<OwnerOverview />} />
              <Route path="add" element={<OwnerAddItem />} />
              <Route path="manage" element={<OwnerManageItems />} />
              <Route path="renew/:id" element={<OwnerRenewItem />} />
              <Route path="chat" element={<OwnerChat />} />
              <Route path="notifications" element={<OwnerNotifications />} />
              <Route path="profile" element={<OwnerProfile />} />
              <Route path="security" element={<OwnerSecurity />} />
              <Route path="logout" element={<OwnerLogout />} />
            </Route>
            <Route
              path="/favorites"
              element={
                <RequireRole allow={['user']}>
                  <FavoritesPage />
                </RequireRole>
              }
            />
            <Route
              path="/customer/*"
              element={
                <RequireRole allow={['user']}>
                  <DashboardProvider>
                    <CustomerDashboardLayout />
                  </DashboardProvider>
                </RequireRole>
              }
            >
              <Route index element={<DashboardOverview />} />
              <Route path="overview" element={<DashboardOverview />} />
              <Route path="profile" element={<MyProfile />} />
              <Route path="profile/edit" element={<EditProfile />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="security" element={<Security />} />
              <Route path="addresses" element={<Addresses />} />
              <Route path="logout" element={<Logout />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/terms" element={<TermsAndConditions />} />
          </Routes>
        </main>
      </div>
    </FavoritesProvider>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
