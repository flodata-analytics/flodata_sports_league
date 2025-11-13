import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { apiFetch } from '../utils/api';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'creating'
  const { signup } = useAuth();
  const navigate = useNavigate();

  const isGmail = (em) => /^(?:[A-Z0-9._%+-]+)@gmail\.com$/i.test((em || '').trim());

  // Derive a password hash using Web Crypto (PBKDF2-SHA256, 100k iterations)
  async function hashPassword(password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const iterations = 100000;
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, 256);
    const hashBytes = new Uint8Array(bits);
    const toBase64 = (u8) => btoa(String.fromCharCode(...u8));
    return {
      algo: 'PBKDF2-SHA256',
      iterations,
      salt: toBase64(salt),
      hash: toBase64(hashBytes),
    };
  }

  async function requestOtp() {
    try {
      setError('');
      setLoading(true);
      const data = await apiFetch('/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!data?.ok) throw new Error(data?.error || 'Failed to send OTP');
      setStep('otp');
    } catch (e) {
      if (e && e.status === 502) {
        setError('Unable to reach OTP server (502 Bad Gateway). Start the backend on http://localhost:5001 or set REACT_APP_API_BASE to your API URL.');
      } else {
        setError(e?.message || 'Failed to send OTP');
      }
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    try {
      setError('');
      setLoading(true);
      const data = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      if (!data?.ok) throw new Error(data?.error || 'Invalid OTP');
      setStep('creating');
      await doSignup();
    } catch (e) {
      if (e && e.status === 502) {
        setError('Unable to reach OTP server (502 Bad Gateway). Start the backend on http://localhost:5001 or set REACT_APP_API_BASE to your API URL.');
      } else {
        setError(e?.message || 'OTP verification failed');
      }
      setStep('otp');
    } finally {
      setLoading(false);
    }
  }

  async function doSignup() {
    // Create Firebase Auth user, then store password hash in Firestore securely
    const cred = await signup(email, password, displayName);
    try {
      // Hash client-side to avoid sending raw password around
      const hashObj = await hashPassword(password);
      await setDoc(doc(db, 'userCreds', cred.user.uid), {
        passwordHash: hashObj.hash,
        salt: hashObj.salt,
        algo: hashObj.algo,
        iterations: hashObj.iterations,
        createdAt: new Date()
      });
    } catch {}
    navigate('/');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password should be at least 6 characters');
    }

    if (!isGmail(email)) {
      return setError('Please use a valid Gmail address (e.g., name@gmail.com)');
    }

    try {
      setError('');
      setLoading(true);
      await requestOtp();
    } catch (error) {
      // Provide user-friendly messages without logging to console
      let msg = 'Failed to create an account.';
      const code = error?.code || '';
      switch (code) {
        case 'auth/configuration-not-found':
          msg = 'Authentication isn\'t set up for this Firebase project yet. In Firebase Console → Authentication, click "Get started" and enable Email/Password, then try again.';
          break;
        case 'auth/operation-not-allowed':
          msg = 'Email/Password sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method.';
          break;
        case 'auth/email-already-in-use':
          msg = 'This email is already in use. Try logging in instead.';
          break;
        case 'auth/invalid-email':
          msg = 'Invalid email address.';
          break;
        case 'auth/weak-password':
          msg = 'Password is too weak. Use at least 6 characters.';
          break;
        case 'auth/network-request-failed':
          msg = 'Network error. Check your connection and try again.';
          break;
        default:
          msg = `Failed to create an account: ${error?.message || code || 'Unknown error'}`;
      }
      setError(msg);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-brand-primary hover:text-brand-primaryDark"
            >
              sign in to existing account
            </Link>
          </p>
        </div>
        {step === 'form' && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="display-name" className="block text-sm font-medium text-gray-700">
                  Display Name
                </label>
                <input
                  id="display-name"
                  name="displayName"
                  type="text"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                  placeholder="Your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                  placeholder="Email address (must be Gmail)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center mt-6"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <div className="relative">
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center mt-6"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primaryDark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </div>
            <div className="text-center">
              <Link to="/" className="text-brand-primary hover:text-brand-primaryDark text-sm">
                Continue as guest (view only)
              </Link>
            </div>
          </form>
        )}
        {step === 'otp' && (
          <form className="mt-8 space-y-6" onSubmit={(e) => { e.preventDefault(); verifyOtp(); }}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
            )}
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">Enter OTP sent to {email}</label>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={requestOtp} disabled={loading} className="px-3 py-2 rounded bg-gray-200 text-gray-800 disabled:opacity-50">Resend</button>
              <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-50">{loading ? 'Verifying…' : 'Verify & Create Account'}</button>
            </div>
            <div className="text-center">
              <button type="button" className="text-sm text-gray-600 underline" onClick={() => setStep('form')}>Change email</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Signup;