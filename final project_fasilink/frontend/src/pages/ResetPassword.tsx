import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { API_BASE_URL } from '../services/api';
import './Auth.css';

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Password reset token is missing.');
    }
  }, [token]);

  const isStrongPassword = (value: string) => {
    return /^(?=.{8,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/.test(value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Reset token is missing.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isStrongPassword(password)) {
      setError('Password must be 8+ characters and include upper-case, lower-case, number, and special character.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/password-reset', { token, password });
      setSuccess('Your password was reset successfully. Redirecting to login...');
      setTimeout(() => navigate('/login?reset=1'), 1200);
    } catch (err: any) {
      if (err?.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setError(`Cannot reach backend API. Ensure the backend is running at ${API_BASE_URL}.`);
      } else {
        setError('Unable to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
            />
          </div>
          <button type="submit" className="btn-primary full-width" disabled={loading || !token}>
            {loading ? 'Resetting password...' : 'Reset password'}
          </button>
        </form>
        <p className="auth-footer">
          Back to <button type="button" className="link-button" onClick={() => navigate('/login')}>Login</button>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
