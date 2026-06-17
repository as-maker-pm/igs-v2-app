const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'public', 'data');

// Helper to escape CSV values
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Convert zip_data.json to CSV
function convertZipData() {
  console.log('Converting zip_data.json to CSV...');

  const jsonPath = path.join(dataDir, 'zip_data.json');
  const csvPath = path.join(dataDir, 'zip_data.csv');

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const zips = Object.values(data);

  // Define columns (excluding providerIds array)
  const columns = [
    'zip', 'placeName', 'county', 'state', 'cbsaFips', 'cbsaName',
    'demand', 'demandPerProviderZip', 'providerCount',
    'population', 'medianIncome', 'demandPerCapita', 'providersPer10k',
    'hasDemand', 'hasProviders', 'hasPopulation',
    'demandPerProviderPctile', 'demandPerCapitaPctile', 'totalDemandPctile', 'providersPer10kPctile',
    'demandPerProviderClipped', 'demandPerCapitaClipped', 'residentialUtilization', 'demandPerProviderCounty',
    // Flattened personas
    'personas_fullService', 'personas_maintenanceLawncare', 'personas_maintenanceOnly',
    'personas_minimal', 'personas_installOnly',
    // Flattened taxonomies
    'taxonomies_brandLoyal', 'taxonomies_couponClippers', 'taxonomies_priceBuyers',
    'taxonomies_qualityBuyers', 'taxonomies_savers', 'taxonomies_spenders'
  ];

  // Write header
  let csv = columns.join(',') + '\n';

  // Write rows
  for (const zip of zips) {
    const row = columns.map(col => {
      if (col.startsWith('personas_')) {
        const key = col.replace('personas_', '');
        return escapeCSV(zip.personas?.[key]);
      } else if (col.startsWith('taxonomies_')) {
        const key = col.replace('taxonomies_', '');
        return escapeCSV(zip.taxonomies?.[key]);
      } else {
        return escapeCSV(zip[col]);
      }
    });
    csv += row.join(',') + '\n';
  }

  fs.writeFileSync(csvPath, csv);

  const stats = fs.statSync(csvPath);
  console.log(`Created zip_data.csv (${(stats.size / 1024 / 1024).toFixed(1)} MB, ${zips.length} rows)`);
}

// Convert providers.geojson to CSV
function convertProviders() {
  console.log('Converting providers.geojson to CSV...');

  const jsonPath = path.join(dataDir, 'providers.geojson');
  const csvPath = path.join(dataDir, 'providers.csv');

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const features = data.features;

  // Define columns
  const columns = ['name', 'url', 'address', 'city', 'state', 'zip', 'latitude', 'longitude', 'isTopCompetitor'];

  // Write header
  let csv = columns.join(',') + '\n';

  // Write rows
  for (const feature of features) {
    const props = feature.properties;
    const coords = feature.geometry.coordinates;

    const row = [
      escapeCSV(props.name),
      escapeCSV(props.url),
      escapeCSV(props.address),
      escapeCSV(props.city),
      escapeCSV(props.state),
      escapeCSV(props.zip),
      escapeCSV(coords[1]), // latitude (GeoJSON is [lng, lat])
      escapeCSV(coords[0]), // longitude
      escapeCSV(props.isTopCompetitor)
    ];
    csv += row.join(',') + '\n';
  }

  fs.writeFileSync(csvPath, csv);

  const stats = fs.statSync(csvPath);
  console.log(`Created providers.csv (${(stats.size / 1024 / 1024).toFixed(1)} MB, ${features.length} rows)`);
}

// Run conversions
console.log('Starting CSV conversion...\n');
convertZipData();
convertProviders();
console.log('\nConversion complete!');
