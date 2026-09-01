import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import { syncProfilesFromApiUser } from '../utils/profileSync';
import './Auth.css';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'customer' | 'owner'>('customer');
  const country = 'Ethiopia';

  // Per-field error state
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | ''>('');

  // Validation helpers
  const emailValid = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneValid = /^09\d{8}$/.test(phone.trim());
  const strongPassword = isStrongPassword(password);
  const passwordMismatch = password && confirmPassword && password !== confirmPassword;
  const canSubmit =
    !!name &&
    emailValid &&
    phoneValid &&
    strongPassword &&
    !passwordMismatch &&
    !nameError &&
    !emailError &&
    !phoneError &&
    !passwordError &&
    !confirmPasswordError;

  function isStrongPassword(value: string) {
    return /^(?=.{8,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/.test(value);
  }

  function getPasswordStrength(value: string) {
    if (!value) return '';
    if (value.length < 8) return 'weak';
    let score = 0;
    if (/[A-Z]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[\W_]/.test(value)) score++;
    if (score >= 4 && value.length >= 12) return 'strong';
    if (score >= 3) return 'medium';
    return 'weak';
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate all fields on submit
    let hasError = false;
    if (!name) {
      setNameError('Full name is required');
      hasError = true;
    }
    if (!emailValid) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }
    if (!phoneValid) {
      setPhoneError('Phone number must start with 09 and be exactly 10 digits');
      hasError = true;
    }
    if (!isStrongPassword(password)) {
      setPasswordError('Password must be at least 8 characters, include a number and a special character');
      hasError = true;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        country,
        isSeller: role === 'owner',
      });

      const registeredUser = response.data?.user;
      if (registeredUser) {
        syncProfilesFromApiUser({
          ...registeredUser,
          phone: registeredUser.phone || phone,
          country: registeredUser.country || country,
        });
      } else {
        syncProfilesFromApiUser({
          name,
          email,
          phone,
          country,
          isSeller: role === 'owner',
        });
      }
      setSuccess('Account created successfully. Please check your email to verify your account. Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err: any) {
      const serverError = err?.response?.data?.error;
      if (serverError) {
        // Show duplicate email error inline
        if (serverError.toLowerCase().includes('email')) {
          setEmailError(serverError);
        } else {
          setError(serverError);
        }
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setError(`Cannot reach backend API. Make sure the backend is running and reachable at ${API_BASE_URL}.`);
      } else {
        setError('Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Field blur handlers for validation
  const handleNameBlur = () => {
    if (!name) setNameError('Full name is required');
    else setNameError('');
  };
  const handleEmailBlur = () => {
    if (!emailValid) setEmailError('Please enter a valid email address');
    else setEmailError('');
  };
  const handlePhoneBlur = () => {
    if (!phoneValid) setPhoneError('Phone number must start with 09 and be exactly 10 digits');
    else setPhoneError('');
  };
  const handlePasswordBlur = () => {
    if (!isStrongPassword(password)) setPasswordError('Password must be at least 8 characters, include a number and a special character');
    else setPasswordError('');
  };
  const handleConfirmPasswordBlur = () => {
    if (password !== confirmPassword) setConfirmPasswordError('Passwords do not match');
    else setConfirmPasswordError('');
  };

  // Live password strength
  const handlePasswordChange = (val: string) => {
    setPassword(val);
    setPasswordStrength(getPasswordStrength(val));
    if (!isStrongPassword(val)) setPasswordError('Password must be at least 8 characters, include a number and a special character');
    else setPasswordError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10">
        <div className="mb-8 space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-600">Create your account</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Register for FasilLink</h1>
          <p className="mx-auto max-w-md text-sm leading-6 text-slate-500">
            Create a secure user profile to browse marketplace listings, access your dashboard, and manage your account.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleRegister}>
          {(error || success) && (
            <div className={`rounded-3xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
              {error || success}
            </div>
          )}


            <div className="relative mb-2">
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
                onBlur={handleNameBlur}
                placeholder=" "
                className={`peer h-14 w-full rounded-3xl border ${nameError ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 bg-slate-50 focus:border-violet-500 focus:ring-violet-100'} px-4 text-sm text-slate-900 outline-none transition`}
                required
              />
              <label htmlFor="name" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:text-xs peer-focus:text-violet-600">
                Full Name
              </label>
              {nameError && <div className="text-xs text-red-600 mt-1">{nameError}</div>}
            </div>

            <div className="relative mb-2">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                onBlur={handleEmailBlur}
                placeholder=" "
                className={`peer h-14 w-full rounded-3xl border ${emailError ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 bg-slate-50 focus:border-violet-500 focus:ring-violet-100'} px-4 text-sm text-slate-900 outline-none transition`}
                required
              />
              <label htmlFor="email" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:text-xs peer-focus:text-violet-600">
                Email Address
              </label>
              {emailError && <div className="text-xs text-red-600 mt-1">{emailError}</div>}
            </div>

            <div className="relative mb-2">
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(''); }}
                onBlur={handlePhoneBlur}
                placeholder=" "
                className={`peer h-14 w-full rounded-3xl border ${phoneError ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 bg-slate-50 focus:border-violet-500 focus:ring-violet-100'} px-4 text-sm text-slate-900 outline-none transition`}
                required
              />
              <label htmlFor="phone" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:text-xs peer-focus:text-violet-600">
                Phone Number
              </label>
              {phoneError && <div className="text-xs text-red-600 mt-1">{phoneError}</div>}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="relative mb-2">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={handlePasswordBlur}
                  placeholder=" "
                  className={`peer h-14 w-full rounded-3xl border ${passwordError ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 bg-slate-50 focus:border-violet-500 focus:ring-violet-100'} px-4 pr-12 text-sm text-slate-900 outline-none transition`}
                  required
                />
                <label htmlFor="password" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:text-xs peer-focus:text-violet-600">
                  Password
                </label>
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-violet-600"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {passwordError && <div className="text-xs text-red-600 mt-1">{passwordError}</div>}
                {password && (
                  <div className="text-xs mt-1" style={{ color: passwordStrength === 'strong' ? '#16a34a' : passwordStrength === 'medium' ? '#eab308' : '#dc2626' }}>
                    Password strength: {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                  </div>
                )}
              </div>

              <div className="relative mb-2">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (confirmPasswordError) setConfirmPasswordError(''); }}
                  onBlur={handleConfirmPasswordBlur}
                  placeholder=" "
                  className={`peer h-14 w-full rounded-3xl border px-4 pr-12 text-sm outline-none transition ${confirmPasswordError ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 bg-slate-50 focus:border-violet-500 focus:ring-violet-100'}`}
                  required
                />
                <label htmlFor="confirmPassword" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:text-xs peer-focus:text-violet-600">
                  Confirm Password
                </label>
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-violet-600"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {confirmPasswordError && <div className="text-xs text-red-600 mt-1">{confirmPasswordError}</div>}
              </div>
            </div>

            {/* Country is locked to Ethiopia, hide dropdown */}
            <input type="hidden" value="Ethiopia" readOnly />

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Account Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all duration-200 ${
                    role === 'customer'
                      ? 'border-violet-600 bg-violet-50/40 text-violet-700 font-semibold ring-4 ring-violet-50'
                      : 'border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="text-2xl mb-1">🛒</span>
                  <span className="text-sm font-medium">Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('owner')}
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all duration-200 ${
                    role === 'owner'
                      ? 'border-violet-600 bg-violet-50/40 text-violet-700 font-semibold ring-4 ring-violet-50'
                      : 'border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="text-2xl mb-1">🔑</span>
                  <span className="text-sm font-medium">Item Owner</span>
                </button>
              </div>
            </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-3xl bg-violet-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-400"
            disabled={loading || !canSubmit}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <a href="/login" className="font-semibold text-violet-600 transition hover:text-violet-700">
            Login here
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;
