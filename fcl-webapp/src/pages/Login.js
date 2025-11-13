import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (error) {
      setError('Failed to log in: ' + error.message);
    }
    setLoading(false);
  }

  return (
    <div style={{minHeight: 'calc(100vh - 64px - 64px)'}} className="flex items-center justify-center bg-gradient-to-br from-[#e7ecf7] to-[#f5f8ff] py-8 px-2 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl px-6 py-8 sm:px-8 sm:py-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#2c60ce] flex items-center justify-center mb-4 overflow-hidden">
            <img src="/Umpire1.svg" alt="Umpire" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-bold text-[#2c60ce] mb-2 text-center">Enter the Umpire’s Arena</h2>
          <form className="w-full" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm text-center">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label htmlFor="email-address" className="block text-sm font-medium text-[#2c60ce] mb-1">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-lg border border-[#cfd8e3] px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2c60ce] focus:border-[#2c60ce] text-base bg-[#f5f8ff]"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mb-6 relative">
              <label htmlFor="password" className="block text-sm font-medium text-[#2c60ce] mb-1">Password</label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="block w-full rounded-lg border border-[#cfd8e3] px-4 py-2 pr-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2c60ce] focus:border-[#2c60ce] text-base bg-[#f5f8ff]"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-[#2c60ce]" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-[#2c60ce]" />
                )}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-lg bg-[#2c60ce] text-white font-semibold text-base shadow hover:bg-[#1746a2] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c60ce] disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <div className="text-center mt-2">
              <Link to="/" className="text-[#2c60ce] hover:text-[#1746a2] text-sm font-medium">
                Continue as guest (view only)
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;