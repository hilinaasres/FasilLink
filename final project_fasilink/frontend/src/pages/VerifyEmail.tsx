import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import './Auth.css';

const VerifyEmail: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Verifying your email...');
  const [error, setError] = useState('');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setError('Verification token is missing.');
        setMessage('');
        return;
      }

      try {
        const response = await api.post('/auth/verify-email', { token });
        setMessage(response.data?.message || 'Email verified successfully. Redirecting to login...');
        setTimeout(() => navigate('/login?verified=1'), 1800);
      } catch (err: any) {
        const errorMessage = err?.response?.data?.error || 'Unable to verify your email. Please try again.';
        setError(errorMessage);
        setMessage('');
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Email Verification</h2>
        {error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div style={{ color: '#115e59', backgroundColor: '#ecfdf5', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '1rem' }}>
            {message}
          </div>
        )}
        <p className="auth-footer">
          Return to <button type="button" className="link-button" onClick={() => navigate('/login')}>Login</button>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
