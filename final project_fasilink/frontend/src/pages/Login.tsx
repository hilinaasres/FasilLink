import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { API_BASE_URL } from '../services/api';
import './Auth.css';
import { useAuth } from '../context/AuthContext';
import { syncProfilesFromApiUser } from '../utils/profileSync';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });

      if (!response?.data?.token || !response?.data?.user) {
        throw new Error('Login response did not include expected credentials.');
      }

      const token = response.data.token;
      const u = response.data.user;
      syncProfilesFromApiUser(u);

      const authUser = {
        id: u.id,
        fullName: u.name || u.fullName,
        email: u.email,
        phone: u.phone || null,
        role: u.role || 'user',
        isSeller: Boolean(u.isSeller),
        token,
      };
      setUser(authUser);

      console.log("LOGIN USER:", authUser);
      if (authUser.role === "admin") {
        navigate("/admin/dashboard");
      } else if (authUser.isSeller === true) {
        navigate("/owner/dashboard");
      } else {
        navigate("/");
      }
    } catch (err: any) {
        let message = 'Failed to login. Try again.';
        if (err?.response) {
          message = err.response.data?.error || err.response.data?.message || err.response.statusText || message;
        } else if (err?.request) {
          message = `Unable to reach server at ${API_BASE_URL}.`;
        } else if (err?.message) {
          message = err.message;
        }
        if (message && message.toLowerCase().includes('pending')) {
        setError('Account pending verification. Please verify your email or resend the verification email.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const verified = searchParams.get('verified');
    const reset = searchParams.get('reset');
    if (verified === '1') {
      setSuccess('Your email was verified successfully. Please log in.');
    } else if (reset === '1') {
      setSuccess('Your password has been reset. Please log in with your new password.');
    }
  }, [searchParams]);

  const handleResendVerification = async () => {
    setError('');
    setSuccess('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter the email address used during registration.');
      return;
    }

    setResendLoading(true);
    try {
      const response = await api.post('/auth/resend-verification', { email: email.trim().toLowerCase() });
      setSuccess(response.data?.message || 'Verification email resent. Check your inbox.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login to FasilLink</h2>
        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              id="email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="you@example.com"
              required 
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter your password"
              required 
            />
          </div>
          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="auth-actions-row">
          <button type="button" className="link-button" onClick={() => navigate('/forgot-password')}>
            Forgot password?
          </button>
          <button
            type="button"
            className="link-button"
            disabled={resendLoading}
            onClick={handleResendVerification}
          >
            {resendLoading ? 'Resending...' : 'Resend verification'}
          </button>
        </div>
        <p className="auth-footer">
          Don't have an account? <a href="/register">Register here</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
