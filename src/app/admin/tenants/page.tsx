'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppHeader, { ActiveNav } from '@/components/AppHeader';

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

const PLAN_FEATURES: Record<string, { driveTime: boolean; export: boolean; multiSite: boolean; pdfExport: boolean }> = {
  Basic:        { driveTime: false, export: true,  multiSite: false, pdfExport: false },
  Professional: { driveTime: true,  export: true,  multiSite: false, pdfExport: false },
  Enterprise:   { driveTime: true,  export: true,  multiSite: true,  pdfExport: true  },
};

// ── Onboarding Drawer ────────────────────────────────────────────────────────

interface OnboardingDrawerProps {
  onClose: () => void;
  onCreated: (tenant: Tenant) => void;
}

function OnboardingDrawer({ onClose, onCreated }: OnboardingDrawerProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', brandName: '', slug: '', industry: '', plan: 'Professional' as Tenant['plan'],
    contactName: '', contactEmail: '',
    demandFile: '', providerFile: '', dataVintage: '',
    driveTime5: true, driveTime10: true, driveTime15: false,
    demandModel: 'Huff gravity model (default)',
    colorScheme: 'Purple / Green (default)',
    adminName: '', adminEmail: '',
  });

  function set(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    setSaving(true);
    const features = PLAN_FEATURES[form.plan];
    const payload = {
      name: form.name, brandName: form.brandName || form.name,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
      industry: form.industry, plan: form.plan,
      primaryContact: { name: form.contactName, email: form.contactEmail },
      adminInvite: form.adminName ? { name: form.adminName, email: form.adminEmail } : undefined,
      status: 'Provisioning' as const,
      driveTimeDefaults: { m5: form.driveTime5, m10: form.driveTime10, m15: form.driveTime15 },
      demandModel: form.demandModel, colorScheme: form.colorScheme,
      demandFile: form.demandFile || undefined, providerFile: form.providerFile || undefined,
      dataVintage: form.dataVintage || undefined,
      features, userCount: 0,
    };
    const res = await fetch('/api/admin/tenants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { onCreated(data.tenant); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Onboard New Tenant</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          {[1,2,3,4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${step === s ? 'bg-[#1a2b4a] text-white' : step > s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{step > s ? '✓' : s}</div>
              {s < 4 && <div className={`h-0.5 w-8 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <span className="ml-2 text-sm text-gray-500">
            {step === 1 && 'Organization Details'}{step === 2 && 'Data Sources'}{step === 3 && 'Configuration'}{step === 4 && 'Invite Admin'}
          </span>
        </div>

        <div className="px-6 py-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Organization Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Acme Landscaping" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Brand Name</label>
                  <input value={form.brandName} onChange={e => set('brandName', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Same as org name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Slug</label>
                  <input value={form.slug} onChange={e => set('slug', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="acme-landscaping" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Industry</label>
                  <input value={form.industry} onChange={e => set('industry', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Landscaping & Lawn Care" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
                  <input value={form.contactName} onChange={e => set('contactName', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Email</label>
                  <input type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Plan</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Basic','Professional','Enterprise'] as const).map(p => (
                    <button key={p} onClick={() => set('plan', p)}
                      className={`rounded-xl border-2 p-4 text-left transition-colors ${form.plan === p ? 'border-[#1a2b4a] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="font-semibold text-sm mb-1">{p}</div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {Object.entries(PLAN_FEATURES[p]).map(([k, v]) => (
                          <div key={k} className={v ? 'text-green-600' : 'text-gray-300'}>
                            {v ? '✓' : '✗'} {k.replace(/([A-Z])/g, ' $1')}
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Upload or reference data files for this tenant.</p>
              <div className="grid grid-cols-2 gap-4">
                {[{label:'Demand Data File', field:'demandFile', placeholder:'demand_acme.csv'},{label:'Provider File', field:'providerFile', placeholder:'providers_acme.csv'}].map(({label,field,placeholder}) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <input value={(form as unknown as Record<string,string>)[field]} onChange={e => set(field, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={placeholder} />
                    <div className="mt-2 border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-xs text-gray-400 cursor-pointer hover:border-gray-300">
                      Drop CSV here or click to upload
                    </div>
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data Vintage</label>
                  <input value={form.dataVintage} onChange={e => set('dataVintage', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Q1 2024" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Drive Time Defaults</label>
                <div className="flex gap-4">
                  {([['driveTime5','5 min'],['driveTime10','10 min'],['driveTime15','15 min']] as const).map(([field, label]) => (
                    <label key={field} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={(form as unknown as Record<string,boolean>)[field]}
                        onChange={e => set(field, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Demand Model</label>
                <select value={form.demandModel} onChange={e => set('demandModel', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Huff gravity model (default)</option>
                  <option>Simple ZIP aggregation</option>
                  <option>Custom model</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Color Scheme</label>
                <select value={form.colorScheme} onChange={e => set('colorScheme', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Purple / Green (default)</option>
                  <option>Blue / Orange</option>
                  <option>Navy / Gold</option>
                  <option>Custom</option>
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Optionally invite an admin user for this tenant.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Admin Name</label>
                  <input value={form.adminName} onChange={e => set('adminName', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Smith" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Admin Email</label>
                  <input type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@tenant.com" />
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                An invitation email will be sent when the tenant is created.
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <button onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)}
              className="px-6 py-2 bg-[#1a2b4a] text-white rounded-lg text-sm font-semibold hover:bg-[#243a63]">
              Next →
            </button>
          ) : (
            <button onClick={handleCreate} disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Tenant'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

function TenantsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [expandedData, setExpandedData] = useState<string | null>(null);

  const rawTab = searchParams.get('tab') ?? 'projects';
  const activeTab = (rawTab === 'tenants' || rawTab === 'data') ? rawTab : 'projects';
  const activeNav: ActiveNav = activeTab === 'projects' ? 'projects' : activeTab === 'tenants' ? 'tenants' : 'data';

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.user || meData.user.role !== 'super_admin') { router.push('/'); return; }
      setCurrentUser(meData.user);

      const tRes = await fetch('/api/admin/tenants');
      const tData = await tRes.json();
      setTenants(tData.tenants || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this tenant?')) return;
    const res = await fetch(`/api/admin/tenants/${id}`, { method: 'DELETE' });
    if (res.ok) setTenants(prev => prev.filter(t => t.id !== id));
    else { const d = await res.json(); alert(d.error); }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader currentUser={currentUser} activeNav={activeNav} />

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Tenants tab action button (top-right) */}
        {activeTab === 'tenants' && (
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowOnboarding(true)}
              className="ml-auto bg-[#1a2b4a] text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#243a63]">
              + Onboard Tenant
            </button>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowOnboarding(true)}
              className="bg-[#1a2b4a] text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#243a63]">
              + New Project
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map(tenant => (
              <div key={tenant.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#1a2b4a] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {tenant.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 truncate">{tenant.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[tenant.plan]}`}>{tenant.plan}</span>
                      <span className="text-xs text-gray-500">{tenant.industry}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{tenant.slug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs mb-4">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[tenant.status]}`}>{tenant.status}</span>
                  {tenant.demandFile && <span className="text-green-600">✓ Data Ready</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); router.push(`/projects/${tenant.id}`); }} className="flex-1 text-center py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
                    Open Map →
                  </button>
                  <Link href={`/admin/tenants/${tenant.id}`} className="flex-1 text-center py-1.5 bg-[#1a2b4a] text-white rounded-lg text-xs font-medium hover:bg-[#243a63]">
                    Manage →
                  </Link>
                </div>
              </div>
            ))}
          </div>
          </>
        )}

        {/* Tenants Tab */}
        {activeTab === 'tenants' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">NAME</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">INDUSTRY</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">PLAN</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">STATUS</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">LAST ACTIVE</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/admin/tenants/${tenant.id}`)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{tenant.name}</td>
                    <td className="px-4 py-3 text-gray-600">{tenant.industry}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[tenant.plan]}`}>{tenant.plan}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[tenant.status]}`}>{tenant.status}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{tenant.lastActive ? new Date(tenant.lastActive).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-3">
                        <Link href={`/admin/tenants/${tenant.id}`} className="text-blue-600 hover:underline text-xs">Edit</Link>
                        <button onClick={() => handleDelete(tenant.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Data Schema Reference</h3>
              <p className="text-sm text-gray-600 mb-4">All tenant data files must conform to the IGS data schema.</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-700 mb-1">Demand File (CSV)</div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>zip_code, demand_score, population, ...</div>
                    <div>Required columns: zip_code, demand_score</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-700 mb-1">Provider File (CSV)</div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>lat, lng, name, zip_code, ...</div>
                    <div>Required columns: lat, lng</div>
                  </div>
                </div>
              </div>
            </div>

            {tenants.map(tenant => (
              <div key={tenant.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedData(expandedData === tenant.id ? null : tenant.id)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1a2b4a] flex items-center justify-center text-white text-sm font-bold">{tenant.name.charAt(0)}</div>
                    <span className="font-medium text-gray-900">{tenant.name}</span>
                    {tenant.demandFile && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Demand</span>}
                    {tenant.providerFile && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Providers</span>}
                  </div>
                  <span className="text-gray-400">{expandedData === tenant.id ? '▲' : '▼'}</span>
                </button>
                {expandedData === tenant.id && (
                  <div className="px-6 pb-6 grid grid-cols-2 gap-4">
                    {['Demand Data File','Provider File'].map(label => (
                      <div key={label} className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                        <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>
                        <div className="text-xs text-gray-400 mb-3">
                          {label === 'Demand Data File' ? (tenant.demandFile || 'No file') : (tenant.providerFile || 'No file')}
                        </div>
                        <div className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Drop CSV here or click to upload</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showOnboarding && (
        <OnboardingDrawer
          onClose={() => setShowOnboarding(false)}
          onCreated={tenant => setTenants(prev => [...prev, tenant])}
        />
      )}
    </div>
  );
}

export default function TenantsPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
      <TenantsPageInner />
    </Suspense>
  );
}
