'use client';

import { useState } from 'react';

interface PasswordFormProps {
  onSuccess: () => void;
}

export default function PasswordForm({ onSuccess }: PasswordFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('igs-demo-authenticated', 'true');
        onSuccess();
      } else {
        setError('Incorrect password');
        setPassword('');
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter password"
        className="w-full px-4 py-3 rounded-lg bg-gray-50
                   border border-gray-300 text-gray-800 placeholder-gray-400
                   focus:outline-none focus:ring-2 focus:ring-[#203A5B]"
        autoFocus
      />
      {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading || !password}
        className="mt-4 w-full py-3 rounded-lg bg-[#203A5B] hover:bg-[#2d4a6b]
                   text-white font-medium transition-colors disabled:opacity-50
                   cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? 'Verifying...' : 'Access Demo'}
      </button>
    </form>
  );
}
