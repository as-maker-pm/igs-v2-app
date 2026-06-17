import fs from 'fs';
import path from 'path';

const TENANTS_FILE = path.join(process.cwd(), 'data', 'tenants.json');

export interface TenantFeatures {
  driveTime: boolean;
  export: boolean;
  multiSite: boolean;
  pdfExport: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  brandName: string;
  slug: string;
  industry: string;
  plan: 'Basic' | 'Professional' | 'Enterprise';
  primaryContact: { name: string; email: string };
  adminInvite?: { name: string; email: string };
  status: 'Active' | 'Inactive' | 'Provisioning';
  driveTimeDefaults: { m5: boolean; m10: boolean; m15: boolean };
  demandModel: string;
  colorScheme: string;
  demandFile?: string;
  providerFile?: string;
  dataVintage?: string;
  features: TenantFeatures;
  userCount: number;
  lastActive?: string;
  createdAt: string;
}

export const PLAN_FEATURES: Record<Tenant['plan'], TenantFeatures> = {
  Basic:        { driveTime: false, export: true,  multiSite: false, pdfExport: false },
  Professional: { driveTime: true,  export: true,  multiSite: false, pdfExport: false },
  Enterprise:   { driveTime: true,  export: true,  multiSite: true,  pdfExport: true  },
};

export function getTenants(): Tenant[] {
  try {
    const raw = fs.readFileSync(TENANTS_FILE, 'utf-8');
    return JSON.parse(raw) as Tenant[];
  } catch {
    return [];
  }
}

export function saveTenants(tenants: Tenant[]): void {
  fs.writeFileSync(TENANTS_FILE, JSON.stringify(tenants, null, 2), 'utf-8');
}

export function createTenant(data: Omit<Tenant, 'id' | 'createdAt'>): Tenant {
  const tenants = getTenants();
  const tenant: Tenant = { ...data, id: `tenant-${Date.now()}`, createdAt: new Date().toISOString() };
  tenants.push(tenant);
  saveTenants(tenants);
  return tenant;
}

export function updateTenant(id: string, data: Partial<Omit<Tenant, 'id' | 'createdAt'>>): Tenant | null {
  const tenants = getTenants();
  const idx = tenants.findIndex(t => t.id === id);
  if (idx === -1) return null;
  tenants[idx] = { ...tenants[idx], ...data };
  saveTenants(tenants);
  return tenants[idx];
}

export function deleteTenant(id: string): boolean {
  const tenants = getTenants();
  const idx = tenants.findIndex(t => t.id === id);
  if (idx === -1) return false;
  tenants.splice(idx, 1);
  saveTenants(tenants);
  return true;
}
