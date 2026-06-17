/**
 * Data Preprocessing Script
 * Converts xlsx/csv files to JSON for the map application
 *
 * Run with: node scripts/preprocess-data.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Paths
const DATA_DIR = path.join(__dirname, '../../Data Sets');
const CORE_DATA_DIR = path.join(__dirname, '../../CoreData');
const OUTPUT_DIR = path.join(__dirname, '../public/data');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('Starting data preprocessing...\n');

// 1. Process Demand/Personas data
console.log('1. Processing demand data...');
const demandWorkbook = XLSX.readFile(path.join(DATA_DIR, 'outdoor expressions final demand copy.xlsx'));
const demandSheet = demandWorkbook.Sheets[demandWorkbook.SheetNames[0]];
const demandData = XLSX.utils.sheet_to_json(demandSheet);

console.log(`   Found ${demandData.length} ZIP codes in demand file`);

// 2. Process Taxonomy data
console.log('2. Processing taxonomy data...');
const taxonomyWorkbook = XLSX.readFile(path.join(DATA_DIR, 'population_taxonomies_example.xlsx'));
const taxonomySheet = taxonomyWorkbook.Sheets[taxonomyWorkbook.SheetNames[0]];
const taxonomyData = XLSX.utils.sheet_to_json(taxonomySheet);

// Index taxonomy by ZIP
const taxonomyByZip = {};
taxonomyData.forEach(row => {
  taxonomyByZip[String(row.zip).padStart(5, '0')] = {
    brandLoyal: row.brand_loyal || 0,
    couponClippers: row.coupon_clippers || 0,
    priceBuyers: row.price_buyers || 0,
    qualityBuyers: row.quality_buyers || 0,
    savers: row.savers || 0,
    spenders: row.spenders || 0
  };
});

console.log(`   Found ${taxonomyData.length} ZIP codes in taxonomy file`);

// 3. Process Providers data
console.log('3. Processing providers data...');
const providersPath = path.join(DATA_DIR, 'outdoor expressions providers copy.csv');
const providersWorkbook = XLSX.readFile(providersPath);
const providersSheet = providersWorkbook.Sheets[providersWorkbook.SheetNames[0]];
const providersData = XLSX.utils.sheet_to_json(providersSheet);

console.log(`   Found ${providersData.length} providers`);

// Count providers per ZIP and build provider IDs for deduplication
const providerCountByZip = {};
const providerIdsByZip = {};
providersData.forEach(row => {
  const zip = String(row.zip).padStart(5, '0');
  providerCountByZip[zip] = (providerCountByZip[zip] || 0) + 1;

  // Build unique provider ID for multi-ZIP deduplication
  const providerId = `${row.roll_up_name || ''}|${row.address || ''}|${row.city || ''}|${row.state_abr || ''}|${zip}`;
  if (!providerIdsByZip[zip]) providerIdsByZip[zip] = [];
  providerIdsByZip[zip].push(providerId);
});

// Convert providers to GeoJSON
const providersGeoJson = {
  type: 'FeatureCollection',
  features: providersData
    .filter(p => p.latitude && p.longitude && !isNaN(parseFloat(p.latitude)) && !isNaN(parseFloat(p.longitude)))
    .map(p => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(p.longitude), parseFloat(p.latitude)]
      },
      properties: {
        name: p.roll_up_name || 'Unknown',
        url: p.url || '',
        address: p.address || '',
        city: p.city || '',
        state: p.state_abr || '',
        zip: String(p.zip || '').padStart(5, '0'),
        isTopCompetitor: p.is_top_competitor === 1 || p.is_top_competitor === '1'
      }
    }))
};

console.log(`   ${providersGeoJson.features.length} providers with valid coordinates`);

// 4. Build combined ZIP data
console.log('4. Building combined ZIP data...');
const zipData = {};

demandData.forEach(row => {
  // Store ZIP with leading zeros (standard 5-digit format)
  const zipRaw = String(row.Zip);
  const zip = zipRaw.padStart(5, '0');
  // Handle column names with potential whitespace
  const demand = row[' All Demand ($) '] || row['All Demand ($)'] || 0;
  const demandPerProvider = row[' Demand Per Providers in County ($) '] || row['Demand Per Providers in County ($)'] || 0;
  // Try to find provider count with both formats
  const providerCount = providerCountByZip[zip] || providerCountByZip[zipRaw] || 0;

  zipData[zip] = {
    zip: zip,
    placeName: row.Place || '',
    county: row.County || '',
    cbsaFips: row['CBSA FIPS'] || '',
    cbsaName: row.CBSA || '',
    state: row.State || '',

    // Demand & Market Saturation (Demand per Provider)
    demand: demand,
    residentialUtilization: row['Residential Utilization (%)'] || 0,  // Keep original metric available
    demandPerProviderCounty: demandPerProvider,
    providerCount: providerCount,
    providerIds: providerIdsByZip[zip] || providerIdsByZip[zipRaw] || [],  // For multi-ZIP deduplication
    // Calculate demand per provider in ZIP (this IS the saturation metric)
    demandPerProviderZip: providerCount > 0 ? demand / providerCount : null,

    // Personas (as percentages, will multiply by demand for $ amounts)
    personas: {
      fullService: row['Residential Persona - Full Service (%)'] || 0,
      maintenanceLawncare: row['Residential Persona - Maintenance + Lawncare (%)'] || 0,
      maintenanceOnly: row['Residential Persona - Maintenance Only (%)'] || 0,
      minimal: row['Residential Persona - Minimal (%)'] || 0,
      installOnly: row['Residential Persona - Install Only (%)'] || 0
    },

    // Taxonomies (merge if available, try both formats)
    taxonomies: taxonomyByZip[zip] || taxonomyByZip[zipRaw] || null
  };
});

console.log(`   Combined data for ${Object.keys(zipData).length} ZIP codes`);

// 5. Calculate stats for color scales
console.log('5. Calculating statistics...');
const demandValues = Object.values(zipData).map(z => z.demand).filter(v => v != null && v > 0).sort((a, b) => a - b);
const saturationValues = Object.values(zipData).map(z => z.demandPerProviderZip).filter(v => v != null && v > 0).sort((a, b) => a - b);

console.log(`   Demand values count: ${demandValues.length}`);
console.log(`   Saturation (Demand/Provider) values count: ${saturationValues.length}`);

const getPercentile = (arr, p) => arr[Math.floor(arr.length * p)] || 0;

const stats = {
  demand: {
    min: demandValues[0] || 0,
    max: demandValues[demandValues.length - 1] || 0,
    median: getPercentile(demandValues, 0.5),
    p25: getPercentile(demandValues, 0.25),
    p75: getPercentile(demandValues, 0.75),
    p90: getPercentile(demandValues, 0.90),
    p95: getPercentile(demandValues, 0.95)
  },
  saturation: {
    min: saturationValues[0] || 0,
    max: saturationValues[saturationValues.length - 1] || 0,
    median: getPercentile(saturationValues, 0.5),
    p25: getPercentile(saturationValues, 0.25),
    p75: getPercentile(saturationValues, 0.75)
  },
  totalProviders: providersData.length,
  totalZips: Object.keys(zipData).length,
  zipsWithTaxonomy: Object.values(zipData).filter(z => z.taxonomies).length
};

console.log(`   Demand range: $${(stats.demand.min || 0).toLocaleString()} - $${(stats.demand.max || 0).toLocaleString()}`);
console.log(`   Saturation (Demand/Provider) range: $${(stats.saturation.min || 0).toLocaleString()} - $${(stats.saturation.max || 0).toLocaleString()}`);

// 6. Write output files
console.log('\n6. Writing output files...');

// ZIP data (main file)
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'zip_data.json'),
  JSON.stringify(zipData)
);
console.log(`   zip_data.json: ${(fs.statSync(path.join(OUTPUT_DIR, 'zip_data.json')).size / 1024 / 1024).toFixed(2)} MB`);

// Providers GeoJSON
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'providers.geojson'),
  JSON.stringify(providersGeoJson)
);
console.log(`   providers.geojson: ${(fs.statSync(path.join(OUTPUT_DIR, 'providers.geojson')).size / 1024 / 1024).toFixed(2)} MB`);

// Provider counts by ZIP
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'provider_counts.json'),
  JSON.stringify(providerCountByZip)
);
console.log(`   provider_counts.json: ${(fs.statSync(path.join(OUTPUT_DIR, 'provider_counts.json')).size / 1024).toFixed(2)} KB`);

// Stats file for frontend
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'stats.json'),
  JSON.stringify(stats, null, 2)
);
console.log(`   stats.json: ${(fs.statSync(path.join(OUTPUT_DIR, 'stats.json')).size / 1024).toFixed(2)} KB`);

console.log('\nPreprocessing complete!');
console.log(`Output files saved to: ${OUTPUT_DIR}`);
