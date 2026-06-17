export interface Personas {
  fullService: number;
  maintenanceLawncare: number;
  maintenanceOnly: number;
  minimal: number;
  installOnly: number;
}

export interface Taxonomies {
  brandLoyal: number;
  couponClippers: number;
  priceBuyers: number;
  qualityBuyers: number;
  savers: number;
  spenders: number;
}

export interface AggregatedTaxonomies {
  brandLoyal: { percent: number; count: number };
  couponClippers: { percent: number; count: number };
  priceBuyers: { percent: number; count: number };
  qualityBuyers: { percent: number; count: number };
  savers: { percent: number; count: number };
  spenders: { percent: number; count: number };
}

export interface ZipData {
  zip: string;
  placeName: string;
  county: string;
  cbsaFips: string;
  cbsaName: string;
  state: string;
  demand: number;
  residentialUtilization: number;  // Original metric from Excel
  demandPerProviderCounty: number;
  providerCount: number;
  providerIds: string[];  // For multi-ZIP distinct provider deduplication
  demandPerProviderZip: number | null;  // This IS the saturation metric
  population: number;
  personas: Personas;
  taxonomies: Taxonomies | null;
  // New fields from data pipeline v2.1
  medianIncome?: number;
  demandPerCapita?: number;
  providersPer10k?: number;
  hasDemand?: boolean;
  hasProviders?: boolean;
  hasPopulation?: boolean;
  demandPerProviderPctile?: number;
  demandPerCapitaPctile?: number;
  totalDemandPctile?: number;
  demandPerProviderClipped?: number;
  demandPerCapitaClipped?: number;
}

export interface Provider {
  name: string;
  url: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  isTopCompetitor: boolean;
}

export interface ProviderGeoJson {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
    properties: Provider;
  }>;
}

export interface ZipDataMap {
  [zip: string]: ZipData;
}

export interface AggregatedData {
  totalDemand: number;
  saturation: number | null;  // Demand per distinct provider (market saturation)
  distinctProviderCount: number;  // Distinct provider count (no double-counting)
  totalPopulation: number;
  personas: {
    fullService: { percent: number; amount: number };
    maintenanceLawncare: { percent: number; amount: number };
    maintenanceOnly: { percent: number; amount: number };
    minimal: { percent: number; amount: number };
    installOnly: { percent: number; amount: number };
  };
  taxonomies: AggregatedTaxonomies | null;
  zipCount: number;
}

export type ActiveLayer = 'demand' | 'saturation';

export interface LayerVisibility {
  demand: boolean;
  saturation: boolean;
}

export interface MSAInfo {
  cbsaFips: string;
  cbsaName: string;
  zipCount: number;
  totalDemand: number;
}

export interface NationalBenchmarks {
  // Percentile thresholds for demand (33rd and 67th percentile)
  demandThresholds: { low: number; high: number };
  // Percentile thresholds for demand/provider
  saturationThresholds: { low: number; high: number };
  // National average persona percentages
  personaAverages: {
    fullService: number;
    maintenanceLawncare: number;
    maintenanceOnly: number;
    minimal: number;
    installOnly: number;
  };
  // Total national demand
  totalDemand: number;
}
