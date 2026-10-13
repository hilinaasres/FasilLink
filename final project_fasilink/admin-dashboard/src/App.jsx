import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Items from './pages/Items';
import ItemLifecycle from './pages/ItemLifecycle';
import Payments from './pages/Payments';
import Categories from './pages/Categories';
import Charging from './pages/Charging';
import AIMonitor from './pages/AIMonitor';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter basename={routerBasename}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/users" element={<Users />} />
                <Route path="/items" element={<Items />} />
                <Route path="/item-lifecycle" element={<ItemLifecycle />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/charging" element={<Charging />} />
                <Route path="/ai-monitor" element={<AIMonitor />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
