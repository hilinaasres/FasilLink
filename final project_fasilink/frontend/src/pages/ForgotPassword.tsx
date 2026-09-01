import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../services/api';
import './Auth.css';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/password-reset-request', { email: email.trim().toLowerCase() });
      setMessage('If that account exists, a password reset email has been sent. Check your inbox.');
    } catch (err: any) {
      if (err?.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setError(`Cannot reach backend API. Ensure the backend is running at ${API_BASE_URL}.`);
      } else {
        setError('Unable to send password reset request. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Forgot Password</h2>
        {error && <div className="error-message">{error}</div>}
        {message && <div className="error-message" style={{ backgroundColor: '#ecfdf5', color: '#166534' }}>{message}</div>}
        <form onSubmit={handleSubmit}>
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
          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? 'Sending link...' : 'Send password reset email'}
          </button>
        </form>
        <p className="auth-footer">
          Remembered your password? <button type="button" className="link-button" onClick={() => navigate('/login')}>Login</button>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
