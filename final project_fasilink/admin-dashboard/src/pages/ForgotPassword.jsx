import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await forgotPassword({ email });
      notify('If your admin email exists, a reset link has been sent.', 'success');
      setEmail('');
    } catch (error) {
      notify(error?.response?.data?.error || 'Unable to process password reset right now.', 'error');
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
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-white">Forgot password</h1>
          <p className="mt-2 text-sm text-slate-400">Enter your admin email and we will send a recovery link with secure instructions.</p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-300">
            Admin email
            <input
              className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/95 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-3xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Sending reset link...' : 'Send reset link'}
          </button>
          <div className="text-center text-sm text-slate-400">
            <Link to="/login" className="text-sky-400 hover:text-sky-300">
              Back to login
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
