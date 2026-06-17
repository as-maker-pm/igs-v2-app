'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

const ROLES = ['viewer', 'user', 'admin', 'super_admin'];

function roleBadge(role: string) {
  if (role === 'super_admin') return 'bg-amber-100 text-amber-800';
  if (role === 'admin') return 'bg-[#1a2b4a] text-white';
  if (role === 'user') return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-600';
}

function roleLabel(role: string) {
  return role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Add user form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newPassword, setNewPassword] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.user) { router.push('/login'); return; }
      setCurrentUser(meData.user);

      const usersRes = await fetch('/api/admin/users');
      if (!usersRes.ok) { setError('Failed to load users'); setLoading(false); return; }
      const usersData = await usersRes.json();
      setUsers(usersData.users);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleRoleChange(id: string, role: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this user?')) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, name: newName, role: newRole, password: newPassword }),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error || 'Failed to add user'); setAdding(false); return; }
    setUsers(prev => [...prev, data.user]);
    setNewEmail(''); setNewName(''); setNewRole('user'); setNewPassword('');
    setAdding(false);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader currentUser={currentUser} activeNav="projects" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/" className="text-blue-600 hover:underline text-sm mb-4 inline-block">← Back to Map</Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">NAME</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">EMAIL</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">ROLE</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">JOINED</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge(user.role)}`}>
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-8">
                      <select
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        disabled={user.role === 'super_admin' && !isSuperAdmin}
                        className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {ROLES.filter(r => r !== 'super_admin' || isSuperAdmin).map(r => (
                          <option key={r} value={r}>{roleLabel(r)}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={user.id === currentUser?.id || (user.role === 'super_admin' && !isSuperAdmin)}
                        className="text-red-500 hover:text-red-700 disabled:text-gray-300 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add User Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add User</h2>
          <form onSubmit={handleAddUser} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {ROLES.filter(r => r !== 'super_admin' || isSuperAdmin).map(r => (
                  <option key={r} value={r}>{roleLabel(r)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••" />
            </div>
            {addError && <div className="col-span-2 text-red-600 text-sm">{addError}</div>}
            <div className="col-span-2">
              <button type="submit" disabled={adding}
                className="bg-[#1a2b4a] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#243a63] disabled:opacity-50 transition-colors">
                {adding ? 'Adding…' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
