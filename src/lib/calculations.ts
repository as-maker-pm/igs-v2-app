import { ZipData, ZipDataMap, AggregatedData, Taxonomies, AggregatedTaxonomies, NationalBenchmarks } from '@/types/data';

export function aggregateSelection(
  selectedZips: string[],
  zipData: ZipDataMap
): AggregatedData {
  // If no ZIPs selected, aggregate ALL ZIPs for national stats
  const zipsToAggregate = selectedZips.length === 0
    ? Object.keys(zipData)
    : selectedZips;

  const isNational = selectedZips.length === 0;

  let totalDemand = 0;
  let totalPopulation = 0;
  let totalPopulationForTaxonomy = 0; // Track population for ZIPs with taxonomy data

  // Collect distinct provider IDs across all selected ZIPs (no double-counting)
  const distinctProviderIds = new Set<string>();

  const personaTotals = {
    fullService: 0,
    maintenanceLawncare: 0,
    maintenanceOnly: 0,
    minimal: 0,
    installOnly: 0,
  };

  // Population-weighted taxonomy totals
  const taxonomyWeighted: Taxonomies = {
    brandLoyal: 0,
    couponClippers: 0,
    priceBuyers: 0,
    qualityBuyers: 0,
    savers: 0,
    spenders: 0,
  };

  zipsToAggregate.forEach((zip) => {
    const data = zipData[zip];
    if (!data) return;

    const demand = data.demand || 0;
    const population = data.population || 0;
    totalDemand += demand;
    totalPopulation += population;

    // Union provider IDs for distinct count (no double-counting)
    (data.providerIds || []).forEach(id => distinctProviderIds.add(id));

    // Calculate persona $ amounts (% * demand)
    if (data.personas) {
      personaTotals.fullService += (data.personas.fullService / 100) * demand;
      personaTotals.maintenanceLawncare += (data.personas.maintenanceLawncare / 100) * demand;
      personaTotals.maintenanceOnly += (data.personas.maintenanceOnly / 100) * demand;
      personaTotals.minimal += (data.personas.minimal / 100) * demand;
      personaTotals.installOnly += (data.personas.installOnly / 100) * demand;
    }

    // Population-weighted taxonomy aggregation
    if (data.taxonomies && population > 0) {
      totalPopulationForTaxonomy += population;
      taxonomyWeighted.brandLoyal += data.taxonomies.brandLoyal * population;
      taxonomyWeighted.couponClippers += data.taxonomies.couponClippers * population;
      taxonomyWeighted.priceBuyers += data.taxonomies.priceBuyers * population;
      taxonomyWeighted.qualityBuyers += data.taxonomies.qualityBuyers * population;
      taxonomyWeighted.savers += data.taxonomies.savers * population;
      taxonomyWeighted.spenders += data.taxonomies.spenders * population;
    }
  });

  // Distinct provider count (no double-counting across selected ZIPs)
  const distinctProviderCount = distinctProviderIds.size;

  // Saturation = Total Demand / Distinct Provider Count (market crowding metric)
  const saturation = distinctProviderCount > 0 ? totalDemand / distinctProviderCount : null;

  // Calculate persona percentages from total demand
  const personas = {
    fullService: {
      percent: totalDemand > 0 ? (personaTotals.fullService / totalDemand) * 100 : 0,
      amount: personaTotals.fullService,
    },
    maintenanceLawncare: {
      percent: totalDemand > 0 ? (personaTotals.maintenanceLawncare / totalDemand) * 100 : 0,
      amount: personaTotals.maintenanceLawncare,
    },
    maintenanceOnly: {
      percent: totalDemand > 0 ? (personaTotals.maintenanceOnly / totalDemand) * 100 : 0,
      amount: personaTotals.maintenanceOnly,
    },
    minimal: {
      percent: totalDemand > 0 ? (personaTotals.minimal / totalDemand) * 100 : 0,
      amount: personaTotals.minimal,
    },
    installOnly: {
      percent: totalDemand > 0 ? (personaTotals.installOnly / totalDemand) * 100 : 0,
      amount: personaTotals.installOnly,
    },
  };

  // Population-weighted average taxonomies with counts
  const taxonomies: AggregatedTaxonomies | null = totalPopulationForTaxonomy > 0
    ? {
        brandLoyal: {
          percent: taxonomyWeighted.brandLoyal / totalPopulationForTaxonomy,
          count: Math.round(taxonomyWeighted.brandLoyal),
        },
        couponClippers: {
          percent: taxonomyWeighted.couponClippers / totalPopulationForTaxonomy,
          count: Math.round(taxonomyWeighted.couponClippers),
        },
        priceBuyers: {
          percent: taxonomyWeighted.priceBuyers / totalPopulationForTaxonomy,
          count: Math.round(taxonomyWeighted.priceBuyers),
        },
        qualityBuyers: {
          percent: taxonomyWeighted.qualityBuyers / totalPopulationForTaxonomy,
          count: Math.round(taxonomyWeighted.qualityBuyers),
        },
        savers: {
          percent: taxonomyWeighted.savers / totalPopulationForTaxonomy,
          count: Math.round(taxonomyWeighted.savers),
        },
        spenders: {
          percent: taxonomyWeighted.spenders / totalPopulationForTaxonomy,
          count: Math.round(taxonomyWeighted.spenders),
        },
      }
    : null;

  return {
    totalDemand,
    saturation,
    distinctProviderCount,
    totalPopulation,
    personas,
    taxonomies,
    zipCount: isNational ? zipsToAggregate.length : selectedZips.length,
  };
}

export function calculateQuantileBreaks(values: number[], numBreaks: number): number[] {
  if (values.length === 0) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const breaks: number[] = [];

  for (let i = 1; i < numBreaks; i++) {
    const idx = Math.floor((i / numBreaks) * sorted.length);
    breaks.push(sorted[idx]);
  }

  return breaks;
}

export function calculateNationalBenchmarks(zipData: ZipDataMap): NationalBenchmarks {
  const zips = Object.values(zipData);

  // Calculate demand percentiles (33rd and 67th)
  const demands = zips.map(z => z.demand).filter(d => d > 0).sort((a, b) => a - b);
  const demandLow = demands[Math.floor(demands.length * 0.33)] || 0;
  const demandHigh = demands[Math.floor(demands.length * 0.67)] || 0;

  // Calculate saturation (demand/provider) percentiles
  const saturations = zips
    .map(z => z.demandPerProviderZip)
    .filter((s): s is number => s !== null && s > 0)
    .sort((a, b) => a - b);
  const saturationLow = saturations[Math.floor(saturations.length * 0.33)] || 0;
  const saturationHigh = saturations[Math.floor(saturations.length * 0.67)] || 0;

  // Calculate national persona averages (demand-weighted)
  let totalDemand = 0;
  const personaTotals = {
    fullService: 0,
    maintenanceLawncare: 0,
    maintenanceOnly: 0,
    minimal: 0,
    installOnly: 0,
  };

  zips.forEach(z => {
    const demand = z.demand || 0;
    totalDemand += demand;
    if (z.personas) {
      personaTotals.fullService += (z.personas.fullService / 100) * demand;
      personaTotals.maintenanceLawncare += (z.personas.maintenanceLawncare / 100) * demand;
      personaTotals.maintenanceOnly += (z.personas.maintenanceOnly / 100) * demand;
      personaTotals.minimal += (z.personas.minimal / 100) * demand;
      personaTotals.installOnly += (z.personas.installOnly / 100) * demand;
    }
  });

  return {
    demandThresholds: { low: demandLow, high: demandHigh },
    saturationThresholds: { low: saturationLow, high: saturationHigh },
    personaAverages: {
      fullService: totalDemand > 0 ? (personaTotals.fullService / totalDemand) * 100 : 0,
      maintenanceLawncare: totalDemand > 0 ? (personaTotals.maintenanceLawncare / totalDemand) * 100 : 0,
      maintenanceOnly: totalDemand > 0 ? (personaTotals.maintenanceOnly / totalDemand) * 100 : 0,
      minimal: totalDemand > 0 ? (personaTotals.minimal / totalDemand) * 100 : 0,
      installOnly: totalDemand > 0 ? (personaTotals.installOnly / totalDemand) * 100 : 0,
    },
    totalDemand,
  };
}

/**
 * Calculate opportunity score using geometric mean of demand and saturation percentiles.
 * Returns 0-100 score where higher = better opportunity.
 *
 * @param demandPctile - Demand percentile (0-100)
 * @param saturationPctile - Demand per provider percentile (0-100), higher = less competition
 * @returns Opportunity score 0-100
 */
export function calculateOpportunityScore(
  demandPctile: number | null | undefined,
  saturationPctile: number | null | undefined
): number {
  // Handle missing data
  if (saturationPctile == null) {
    // No providers = high opportunity (untapped market), scaled by demand
    return demandPctile != null ? demandPctile : 50;
  }
  if (demandPctile == null) {
    return 50; // No demand data = neutral
  }

  // Normalize to 0-1
  const demandNorm = Math.max(0, Math.min(100, demandPctile)) / 100;
  const saturationNorm = Math.max(0, Math.min(100, saturationPctile)) / 100;

  // Geometric mean, scaled to 0-100
  return 100 * Math.sqrt(demandNorm * saturationNorm);
}

/**
 * Calculate demand-weighted opportunity score for multiple ZIPs.
 * Computes each ZIP's score first, then aggregates with demand weights.
 *
 * @param selectedZips - Array of ZIP codes
 * @param zipData - Full ZIP data map
 * @returns Weighted opportunity score 0-100
 */
export function calculateAggregatedOpportunityScore(
  selectedZips: string[],
  zipData: ZipDataMap
): number {
  if (selectedZips.length === 0) {
    return 50; // Neutral for no selection
  }

  let totalDemand = 0;
  let weightedScoreSum = 0;

  selectedZips.forEach((zip) => {
    const data = zipData[zip];
    if (!data) return;

    const demand = data.demand || 0;
    const score = calculateOpportunityScore(
      data.totalDemandPctile,
      data.demandPerProviderPctile
    );

    totalDemand += demand;
    weightedScoreSum += demand * score;
  });

  if (totalDemand === 0) {
    return 50; // Neutral if no demand
  }

  return weightedScoreSum / totalDemand;
}
