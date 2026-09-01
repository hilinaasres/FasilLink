import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function OwnerLogout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
      <div>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">Signing out…</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Redirecting you to the login page.</p>
      </div>
    </div>
  );
}
