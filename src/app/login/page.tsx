'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function quickLogin(role: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quickLogin: role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return; }
      router.push('/');
    } catch {
      setError('Network error');
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return; }
      router.push('/');
    } catch {
      setError('Network error');
      setLoading(false);
    }
  }

  return (
    <div className="animated-gradient-bg min-h-screen flex items-center justify-center px-4">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <img src="/IGS-logo.svg" alt="IGS" className="h-16 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">IGS Platform</h1>
        <p className="text-gray-500 mb-8">Market Demand & Saturation Analysis</p>

        {/* Quick login buttons */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Quick Login</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => quickLogin('super_admin')}
              disabled={loading}
              className="py-2 px-3 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              Super Admin
            </button>
            <button
              onClick={() => quickLogin('admin')}
              disabled={loading}
              className="py-2 px-3 rounded-lg bg-[#1a2b4a] text-white text-sm font-semibold hover:bg-[#243a63] disabled:opacity-50 transition-colors"
            >
              Admin
            </button>
            <button
              onClick={() => quickLogin('user')}
              disabled={loading}
              className="py-2 px-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              User
            </button>
            <button
              onClick={() => quickLogin('viewer')}
              disabled={loading}
              className="py-2 px-3 rounded-lg bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300 disabled:opacity-50 transition-colors"
            >
              Viewer
            </button>
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or sign in with credentials</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#1a2b4a] text-white rounded-lg font-semibold hover:bg-[#243a63] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 text-gray-400 text-sm">Custom made by IGS for Outdoor Expressions</p>
      </div>
    </div>
  );
}
