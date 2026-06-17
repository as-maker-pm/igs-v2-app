#!/usr/bin/env node
/**
 * Fix script: Updates all data files to use consistent 5-digit padded ZIP codes
 *
 * Problem: Provider counts and GeoJSON were stored without leading zeros (e.g., "1001")
 *          but zip_data uses padded ZIPs (e.g., "01001")
 *
 * Solution: Read all data files, pad the ZIPs consistently, and update them
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'public', 'data');

console.log('Fixing ZIP code padding across all data files...\n');

// Read the existing files
const providerCounts = JSON.parse(fs.readFileSync(path.join(dataDir, 'provider_counts.json'), 'utf8'));
const zipData = JSON.parse(fs.readFileSync(path.join(dataDir, 'zip_data.json'), 'utf8'));

// Track stats
let fixedCount = 0;
let alreadyCorrect = 0;

// Create a map of padded ZIPs to provider counts
const paddedProviderCounts = {};
for (const [zip, count] of Object.entries(providerCounts)) {
  const paddedZip = String(zip).padStart(5, '0');
  paddedProviderCounts[paddedZip] = (paddedProviderCounts[paddedZip] || 0) + count;
}

// Update zip_data with correct provider counts
for (const [zip, data] of Object.entries(zipData)) {
  const correctCount = paddedProviderCounts[zip] || 0;
  const currentCount = data.providerCount || 0;

  if (correctCount !== currentCount) {
    // Update provider count
    zipData[zip].providerCount = correctCount;

    // Recalculate demandPerProviderZip
    const demand = data.demand || 0;
    zipData[zip].demandPerProviderZip = correctCount > 0 ? demand / correctCount : null;

    fixedCount++;

    // Log first few fixes as examples
    if (fixedCount <= 5) {
      console.log(`  Fixed ZIP ${zip}: ${currentCount} → ${correctCount} providers`);
    }
  } else if (currentCount > 0) {
    alreadyCorrect++;
  }
}

console.log(`\n  ... and ${fixedCount - 5} more fixes\n`);

// Write updated zip_data.json
fs.writeFileSync(
  path.join(dataDir, 'zip_data.json'),
  JSON.stringify(zipData, null, 2)
);

// Also update provider_counts.json with padded ZIPs
fs.writeFileSync(
  path.join(dataDir, 'provider_counts.json'),
  JSON.stringify(paddedProviderCounts, null, 2)
);

// Fix providers.geojson - pad ZIP codes in provider properties
console.log('Fixing providers.geojson...');
const providersGeoJson = JSON.parse(fs.readFileSync(path.join(dataDir, 'providers.geojson'), 'utf8'));
let geoJsonFixedCount = 0;

providersGeoJson.features.forEach(feature => {
  if (feature.properties && feature.properties.zip) {
    const originalZip = feature.properties.zip;
    const paddedZip = String(originalZip).padStart(5, '0');
    if (originalZip !== paddedZip) {
      feature.properties.zip = paddedZip;
      geoJsonFixedCount++;
    }
  }
});

fs.writeFileSync(
  path.join(dataDir, 'providers.geojson'),
  JSON.stringify(providersGeoJson)
);

console.log(`  Fixed ${geoJsonFixedCount} provider ZIP codes in GeoJSON\n`);

console.log('Summary:');
console.log(`  zip_data.json: Fixed ${fixedCount} ZIP codes`);
console.log(`  providers.geojson: Fixed ${geoJsonFixedCount} provider ZIPs`);
console.log(`  Already correct: ${alreadyCorrect} ZIP codes`);
console.log(`\nFiles updated:`);
console.log(`  - ${path.join(dataDir, 'zip_data.json')}`);
console.log(`  - ${path.join(dataDir, 'provider_counts.json')}`);
console.log(`  - ${path.join(dataDir, 'providers.geojson')}`);
console.log('\nDone!');
