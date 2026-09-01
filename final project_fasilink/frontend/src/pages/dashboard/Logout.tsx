import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Logout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return (
    <div className="py-10 text-center">
      <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
        Signing you out…
      </div>
    </div>
  );
}

