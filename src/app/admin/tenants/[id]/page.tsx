'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';

interface Tenant {
  id: string;
  name: string;
  brandName: string;
  slug: string;
  industry: string;
  plan: 'Basic' | 'Professional' | 'Enterprise';
  status: 'Active' | 'Inactive' | 'Provisioning';
  primaryContact: { name: string; email: string };
  adminInvite?: { name: string; email: string };
  driveTimeDefaults: { m5: boolean; m10: boolean; m15: boolean };
  demandModel: string;
  colorScheme: string;
  demandFile?: string;
  providerFile?: string;
  dataVintage?: string;
  features: { driveTime: boolean; export: boolean; multiSite: boolean; pdfExport: boolean };
  userCount: number;
  lastActive?: string;
  createdAt: string;
}

interface UserRow { id: string; email: string; name: string; role: string; createdAt: string; }
interface CurrentUser { id: string; email: string; name: string; role: string; }

const PLAN_COLORS: Record<string, string> = {
  Basic: 'bg-gray-100 text-gray-700',
  Professional: 'bg-blue-100 text-blue-800',
  Enterprise: 'bg-purple-100 text-purple-800',
};

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-800',
  Inactive: 'bg-gray-100 text-gray-600',
  Provisioning: 'bg-amber-100 text-amber-800',
};

function roleBadge(role: string) {
  if (role === 'super_admin') return 'bg-amber-100 text-amber-800';
  if (role === 'admin') return 'bg-[#1a2b4a] text-white';
  if (role === 'user') return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-600';
}

function roleLabel(role: string) {
  return role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'configuration' | 'data'>('overview');

  // Config edit state
  const [editMode, setEditMode] = useState(false);
  const [editConfig, setEditConfig] = useState<Partial<Tenant>>({});
  const [saving, setSaving] = useState(false);

  // Overrides state
  const [overrides, setOverrides] = useState({ driveTime: false, export: false, multiSite: false, pdfExport: false });

  // Upload state
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState<string | null>(null);

  // Add user form
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [newUserPw, setNewUserPw] = useState('');
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    async function load() {
      const [meRes, tRes, uRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/admin/tenants'),
        fetch('/api/admin/users'),
      ]);
      const meData = await meRes.json();
      if (!meData.user || meData.user.role !== 'super_admin') { router.push('/'); return; }
      setCurrentUser(meData.user);

      const tData = await tRes.json();
      const found = (tData.tenants || []).find((t: Tenant) => t.id === id);
      if (!found) { router.push('/admin/tenants'); return; }
      setTenant(found);
      setEditConfig(found);
      setOverrides(found.features);

      const uData = await uRes.json();
      setUsers(uData.users || []);
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function handleSaveConfig() {
    setSaving(true);
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editConfig),
    });
    const data = await res.json();
    if (res.ok) { setTenant(data.tenant); setEditMode(false); }
    setSaving(false);
  }

  async function handleApplyOverrides() {
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features: overrides }),
    });
    const data = await res.json();
    if (res.ok) setTenant(data.tenant);
  }

  async function handleRoleChange(userId: string, role: string) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (res.ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm('Delete this user?')) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    if (res.ok) setUsers(prev => prev.filter(u => u.id !== userId));
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddingUser(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newUserEmail, name: newUserName, role: newUserRole, password: newUserPw }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers(prev => [...prev, data.user]);
      setNewUserEmail(''); setNewUserName(''); setNewUserRole('user'); setNewUserPw('');
    }
    setAddingUser(false);
  }

  function simulateUpload(field: string) {
    setUploading(field);
    setUploadDone(null);
    setTimeout(() => { setUploading(null); setUploadDone(field); }, 1400);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const hasOverrides = tenant && JSON.stringify(tenant.features) !== JSON.stringify(overrides);

  if (loading || !tenant) return <div className="h-screen flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader currentUser={currentUser} activeNav="projects" />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Link href="/admin/tenants" className="text-blue-600 hover:underline text-sm mb-6 inline-block">← Back to Tenants</Link>

        {/* Title row */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-[#1a2b4a] flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {tenant.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
              <span className={`text-sm px-3 py-0.5 rounded-full font-medium ${PLAN_COLORS[tenant.plan]}`}>{tenant.plan}</span>
              <span className={`text-sm px-3 py-0.5 rounded-full font-medium ${STATUS_COLORS[tenant.status]}`}>{tenant.status}</span>
              {hasOverrides && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">⚡ Overrides Active</span>
              )}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {tenant.industry} · {tenant.slug} &nbsp;·&nbsp; Created {new Date(tenant.createdAt).toLocaleDateString()}
              {tenant.lastActive && ` · Last active ${new Date(tenant.lastActive).toLocaleDateString()}`}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
          {(['overview','users','configuration','data'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'text-[#1a2b4a] border-b-2 border-[#1a2b4a] -mb-px' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Tenant Details</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium">{tenant.name}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Brand Name</dt><dd className="font-medium">{tenant.brandName}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Slug</dt><dd className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{tenant.slug}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Industry</dt><dd className="font-medium">{tenant.industry}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Contact</dt><dd className="font-medium">{tenant.primaryContact.name}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Contact Email</dt><dd className="text-blue-600">{tenant.primaryContact.email}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Users</dt><dd className="font-medium">{tenant.userCount}</dd></div>
              </dl>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Plan & Features</h3>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-4 ${PLAN_COLORS[tenant.plan]}`}>{tenant.plan}</div>
              <dl className="space-y-3 text-sm">
                {Object.entries(tenant.features).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center">
                    <dt className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</dt>
                    <dd className={`font-medium ${v ? 'text-green-600' : 'text-gray-400'}`}>{v ? '✓ Enabled' : '✗ Disabled'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">NAME</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">EMAIL</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">ROLE</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge(user.role)}`}>{roleLabel(user.role)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-4">
                          <select value={user.role} onChange={e => handleRoleChange(user.id, e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {['viewer','user','admin','super_admin'].map(r => (
                              <option key={r} value={r}>{roleLabel(r)}</option>
                            ))}
                          </select>
                          <button onClick={() => handleDeleteUser(user.id)}
                            disabled={user.id === currentUser?.id}
                            className="text-red-500 hover:text-red-700 disabled:text-gray-300 text-xs font-medium">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Add User</h3>
              <form onSubmit={handleAddUser} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input value={newUserName} onChange={e => setNewUserName(e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="user@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                  <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['viewer','user','admin'].map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" value={newUserPw} onChange={e => setNewUserPw(e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                </div>
                <div className="col-span-2">
                  <button type="submit" disabled={addingUser}
                    className="bg-[#1a2b4a] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#243a63] disabled:opacity-50">
                    {addingUser ? 'Adding…' : 'Add User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Configuration Tab */}
        {activeTab === 'configuration' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Tenant Configuration</h3>
                {!editMode ? (
                  <button onClick={() => setEditMode(true)}
                    className="text-sm text-blue-600 hover:underline">Edit</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditMode(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                    <button onClick={handleSaveConfig} disabled={saving}
                      className="text-sm bg-[#1a2b4a] text-white px-4 py-1 rounded-lg hover:bg-[#243a63] disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {!editMode ? (
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div><dt className="text-gray-500 text-xs">Drive Time Defaults</dt>
                    <dd className="font-medium mt-1">
                      {[tenant.driveTimeDefaults.m5 && '5 min', tenant.driveTimeDefaults.m10 && '10 min', tenant.driveTimeDefaults.m15 && '15 min'].filter(Boolean).join(', ') || 'None'}
                    </dd>
                  </div>
                  <div><dt className="text-gray-500 text-xs">Demand Model</dt><dd className="font-medium mt-1">{tenant.demandModel}</dd></div>
                  <div><dt className="text-gray-500 text-xs">Color Scheme</dt><dd className="font-medium mt-1">{tenant.colorScheme}</dd></div>
                  <div><dt className="text-gray-500 text-xs">Status</dt>
                    <dd className="mt-1"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[tenant.status]}`}>{tenant.status}</span></dd>
                  </div>
                </dl>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Drive Time Defaults</label>
                    <div className="flex gap-4">
                      {(['m5','m10','m15'] as const).map(k => (
                        <label key={k} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox"
                            checked={(editConfig.driveTimeDefaults ?? tenant.driveTimeDefaults)[k]}
                            onChange={e => setEditConfig(prev => ({ ...prev, driveTimeDefaults: { ...(prev.driveTimeDefaults ?? tenant.driveTimeDefaults), [k]: e.target.checked } }))}
                            className="w-4 h-4 text-blue-600 rounded" />
                          <span className="text-sm">{k === 'm5' ? '5 min' : k === 'm10' ? '10 min' : '15 min'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Demand Model</label>
                    <select value={editConfig.demandModel ?? tenant.demandModel}
                      onChange={e => setEditConfig(prev => ({ ...prev, demandModel: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Huff gravity model (default)</option>
                      <option>Simple ZIP aggregation</option>
                      <option>Custom model</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Color Scheme</label>
                    <select value={editConfig.colorScheme ?? tenant.colorScheme}
                      onChange={e => setEditConfig(prev => ({ ...prev, colorScheme: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Purple / Green (default)</option>
                      <option>Blue / Orange</option>
                      <option>Navy / Gold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select value={editConfig.status ?? tenant.status}
                      onChange={e => setEditConfig(prev => ({ ...prev, status: e.target.value as Tenant['status'] }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Active</option>
                      <option>Inactive</option>
                      <option>Provisioning</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Super Admin Overrides */}
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
              <h3 className="font-semibold text-amber-900 mb-1">Super Admin Overrides</h3>
              <p className="text-xs text-amber-700 mb-4">Override plan-level feature flags for this tenant only.</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {(Object.keys(overrides) as (keyof typeof overrides)[]).map(k => (
                  <label key={k} className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setOverrides(prev => ({ ...prev, [k]: !prev[k] }))}
                      className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${overrides[k] ? 'bg-amber-500' : 'bg-gray-300'} relative`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${overrides[k] ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-sm font-medium text-amber-900 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                  </label>
                ))}
              </div>
              <button onClick={handleApplyOverrides}
                className="bg-amber-500 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors">
                Apply Overrides
              </button>
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Data Schema Reference</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-700 mb-1">Demand File (CSV)</div>
                  <div className="text-xs text-gray-500">Required: zip_code, demand_score</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-700 mb-1">Provider File (CSV)</div>
                  <div className="text-xs text-gray-500">Required: lat, lng</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {[
                { label: 'Demand Data File', field: 'demandFile', current: tenant.demandFile },
                { label: 'Provider File', field: 'providerFile', current: tenant.providerFile },
              ].map(({ label, field, current }) => (
                <div key={field} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h4 className="font-medium text-gray-900 mb-1">{label}</h4>
                  {current && <p className="text-xs text-gray-500 mb-3">Current: {current}</p>}
                  <div
                    onClick={() => simulateUpload(field)}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    {uploading === field ? (
                      <div className="text-blue-600 text-sm">Validating… <span className="animate-spin inline-block">⟳</span></div>
                    ) : uploadDone === field ? (
                      <div className="text-green-600 text-sm font-medium">✓ Validated & Ready</div>
                    ) : (
                      <div className="text-gray-400 text-sm">Drop CSV here or click to upload</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
