import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const { login } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login({ email, password, remember });
      notify('Welcome back, admin. Redirecting to dashboard.', 'success');
      navigate('/dashboard');
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Unable to sign in. Check your credentials.';
      notify(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-[32px] border border-slate-800/90 bg-slate-900/95 p-8 shadow-glow"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-xl">
            <span className="text-2xl font-bold">F</span>
          </div>
          <h1 className="text-3xl font-semibold text-white">Admin sign in</h1>
          <p className="mt-2 text-sm text-slate-400">Secure access for platform governance, reports and monitoring.</p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-300">
            Email address
            <input
              className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/95 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-slate-300">
            Password
            <input
              className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/95 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <div className="flex items-center justify-between text-sm text-slate-400">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={remember} onChange={() => setRemember((prev) => !prev)} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-sky-500" />
              Remember me
            </label>
            <Link to="/forgot-password" className="font-medium text-sky-400 hover:text-sky-300">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-3xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
