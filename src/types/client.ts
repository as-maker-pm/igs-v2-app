// Client configuration types for the admin system

export interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  demandColors: string[];
  saturationColors: string[];
  opportunityColors: string[];
  accentColor: string;
}

export interface ColumnMapping {
  // Core required fields
  zip: string;
  demand: string;

  // Optional standard fields
  placeName?: string;
  county?: string;
  state?: string;
  cbsaName?: string;
  cbsaFips?: string;
  providerCount?: string;
  demandPerProviderZip?: string;
  providerIds?: string;
  residentialUtilization?: string;
  demandPerProviderCounty?: string;

  // Persona fields
  personas?: {
    fullService?: string;
    maintenanceLawncare?: string;
    maintenanceOnly?: string;
    minimal?: string;
    installOnly?: string;
  };

  // Taxonomy fields
  taxonomies?: {
    brandLoyal?: string;
    couponClippers?: string;
    priceBuyers?: string;
    qualityBuyers?: string;
    savers?: string;
    spenders?: string;
  };
}

export interface CustomField {
  id: string;
  sourceColumn: string;
  displayName: string;
  type: 'number' | 'currency' | 'percent' | 'text';
  format?: string;
  showInPopup: boolean;
  showInDashboard: boolean;
}

export interface DashboardSettings {
  showDemand: boolean;
  showSaturation: boolean;
  showProviderCount: boolean;
  showPersonas: boolean;
  showTaxonomies: boolean;
  showOpportunityLayer: boolean;
}

export interface MapSettings {
  providerStates: string[];
  defaultCenter: [number, number];
  defaultZoom: number;
  showProvidersByDefault: boolean;
}

export interface Branding {
  logoPath: string | null;
  title: string;
  subtitle: string;
  colorScheme: ColorScheme;
}

export interface DataConfig {
  columnMapping: ColumnMapping | null;
  customFields: CustomField[];
  lastDataUpload: string | null;
  hasProviders: boolean;
}

export interface ClientConfig {
  id: string;
  slug: string;
  name: string;
  password: string;
  createdAt: string;
  updatedAt: string;

  branding: Branding;
  dataConfig: DataConfig;
  dashboardSettings: DashboardSettings;
  mapSettings: MapSettings;
}

export interface ClientRegistryEntry {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  isActive: boolean;
}

export interface ClientRegistry {
  clients: ClientRegistryEntry[];
  lastUpdated: string;
}

// Default values for new clients
export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  id: 'default',
  name: 'Default',
  primary: '#7c3aed',
  demandColors: ['#f3e5f5', '#e1bee7', '#ce93d8', '#ab47bc', '#8e24aa', '#4a148c'],
  saturationColors: ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#66bb6a', '#43a047', '#1b5e20'],
  opportunityColors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#cb181d'],
  accentColor: '#f97316',
};

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  showDemand: true,
  showSaturation: true,
  showProviderCount: true,
  showPersonas: true,
  showTaxonomies: true,
  showOpportunityLayer: true,
};

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  providerStates: [],
  defaultCenter: [-98.5795, 39.8283],
  defaultZoom: 4,
  showProvidersByDefault: false,
};

export function createDefaultClientConfig(id: string, slug: string, name: string): ClientConfig {
  const now = new Date().toISOString();
  return {
    id,
    slug,
    name,
    password: '',
    createdAt: now,
    updatedAt: now,
    branding: {
      logoPath: null,
      title: name,
      subtitle: 'Market Analysis Dashboard',
      colorScheme: DEFAULT_COLOR_SCHEME,
    },
    dataConfig: {
      columnMapping: null,
      customFields: [],
      lastDataUpload: null,
      hasProviders: false,
    },
    dashboardSettings: DEFAULT_DASHBOARD_SETTINGS,
    mapSettings: DEFAULT_MAP_SETTINGS,
  };
}
