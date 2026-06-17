'use client';

import { useState } from 'react';
import { AggregatedData, NationalBenchmarks, ZipDataMap } from '@/types/data';
import { formatCurrency, formatCurrencyFull, formatPercent, formatNumber } from '@/lib/formatters';
import { calculateAggregatedOpportunityScore } from '@/lib/calculations';

interface DashboardPanelProps {
  data: AggregatedData;
  selectedZips: string[];
  selectedMSAs?: string[];
  benchmarks: NationalBenchmarks | null;
  zipData: ZipDataMap;
  onRemoveZip: (zip: string) => void;
}

type Tier = 'good' | 'average' | 'bad';

function getTier(value: number, thresholds: { low: number; high: number }): Tier {
  if (value >= thresholds.high) return 'good';
  if (value >= thresholds.low) return 'average';
  return 'bad';
}

function getTierColors(tier: Tier): { bg: string; text: string; label: string } {
  switch (tier) {
    case 'good':
      return { bg: 'bg-green-50', text: 'text-green-700', label: 'Above Avg' };
    case 'average':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Average' };
    case 'bad':
      return { bg: 'bg-red-50', text: 'text-red-700', label: 'Below Avg' };
  }
}

type PersonaTierResult = { tier: Tier; isNeutral: boolean };

function getPersonaTier(
  personaKey: string,
  selectedPercent: number,
  nationalPercent: number
): PersonaTierResult {
  const diff = selectedPercent - nationalPercent;
  const threshold = 2; // 2 percentage point threshold for "average"

  // Premium personas: higher is better (more high-value customers = good)
  if (personaKey === 'fullService' || personaKey === 'maintenanceLawncare' || personaKey === 'maintenanceOnly') {
    if (diff > threshold) return { tier: 'good', isNeutral: false };
    if (diff < -threshold) return { tier: 'bad', isNeutral: false };
    return { tier: 'average', isNeutral: false };
  }

  // Low-value personas: lower is better (fewer low-value customers = good)
  if (diff < -threshold) return { tier: 'good', isNeutral: false };
  if (diff > threshold) return { tier: 'bad', isNeutral: false };
  return { tier: 'average', isNeutral: false };
}

interface PersonaBreakdownProps {
  data: AggregatedData;
  benchmarks: NationalBenchmarks | null;
  isNational: boolean;
  personaLabels: Record<string, string>;
}

function PersonaBreakdownTable({ data, benchmarks, isNational, personaLabels }: PersonaBreakdownProps) {
  const [showAmounts, setShowAmounts] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-800">Persona Breakdown</h3>
        <button
          onClick={() => setShowAmounts(!showAmounts)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            showAmounts
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {showAmounts ? 'Show %' : 'Show $'}
        </button>
      </div>

      <div className="bg-gray-100/30 rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2.5 bg-gray-100/50 border-b border-gray-200">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Persona</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Selected</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Benchmark</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-200">
          {Object.entries(data.personas).map(([key, value]) => {
            const nationalPercent = benchmarks?.personaAverages[key as keyof typeof benchmarks.personaAverages] || 0;
            const tierResult = benchmarks && !isNational ? getPersonaTier(key, value.percent, nationalPercent) : null;

            // Determine text color based on tier
            let tierTextColor = 'text-gray-800';
            if (tierResult && !isNational) {
              if (tierResult.tier === 'good') {
                tierTextColor = 'text-green-600';
              } else if (tierResult.tier === 'bad') {
                tierTextColor = 'text-red-600';
              } else if (tierResult.tier === 'average') {
                tierTextColor = 'text-amber-600';
              }
            }

            const delta = value.percent - nationalPercent;
            const deltaStr = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
            const tooltipText = !isNational ? `${deltaStr}pp vs benchmark` : '';

            const nationalAmount = benchmarks
              ? (nationalPercent / 100) * (benchmarks.totalDemand || data.totalDemand)
              : 0;

            return (
              <div
                key={key}
                className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2 hover:bg-gray-100/30 transition-colors"
              >
                <span className="text-sm text-gray-800">{personaLabels[key]}</span>
                <span
                  className={`text-sm font-medium text-right tabular-nums ${tierTextColor}`}
                  title={tooltipText}
                >
                  {showAmounts ? formatCurrency(value.amount) : formatPercent(value.percent)}
                </span>
                <span className="text-sm text-gray-500 text-right tabular-nums">
                  {showAmounts ? formatCurrency(nationalAmount) : formatPercent(nationalPercent)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {!isNational && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
            <span>Above Avg</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
            <span>Average</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
            <span>Below Avg</span>
          </div>
        </div>
      )}
    </div>
  );
}

function OpportunityGauge({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="mb-2">
        <span className="text-xs text-gray-600 font-bold">Business Opportunity</span>
      </div>
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
          style={{
            width: `${clampedScore}%`,
            backgroundColor: '#1e3a5f',
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}

export default function DashboardPanel({
  data,
  selectedZips,
  selectedMSAs = [],
  benchmarks,
  zipData,
  onRemoveZip,
}: DashboardPanelProps) {
  const isNational = selectedZips.length === 0;
  const hasMSASelection = selectedMSAs.length > 0;

  // Calculate opportunity score using unified geometric mean formula
  // Demand-weighted average of individual ZIP scores
  const opportunityScore = isNational
    ? 50 // Neutral for national view
    : calculateAggregatedOpportunityScore(selectedZips, zipData);

  // Get tier info for metric cards
  const demandTier = benchmarks && !isNational
    ? getTier(data.totalDemand, benchmarks.demandThresholds)
    : null;
  const saturationTier = benchmarks && !isNational && data.saturation
    ? getTier(data.saturation, benchmarks.saturationThresholds)
    : null;

  const demandColors = demandTier ? getTierColors(demandTier) : { bg: 'bg-purple-50', text: 'text-purple-600', label: '' };
  const saturationColors = saturationTier ? getTierColors(saturationTier) : { bg: 'bg-green-50', text: 'text-green-600', label: '' };

  const personaLabels: Record<string, string> = {
    fullService: 'Full Service',
    maintenanceLawncare: 'Maint + Lawncare',
    maintenanceOnly: 'Maintenance Only',
    minimal: 'Minimal',
    installOnly: 'Install Only',
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">
          {isNational
            ? 'National Summary'
            : hasMSASelection
              ? selectedMSAs.length === 1
                ? (() => {
                    const msaZip = Object.values(zipData).find(z => z.cbsaFips === selectedMSAs[0]);
                    return msaZip?.cbsaName?.split(',')[0] || `1 MSA (${data.zipCount} ZIPs)`;
                  })()
                : `${selectedMSAs.length} MSAs (${data.zipCount} ZIPs)`
              : selectedZips.length === 1
                ? (() => {
                    const zip = selectedZips[0];
                    const zipInfo = zipData[zip];
                    return zipInfo?.placeName
                      ? `${zip} - ${zipInfo.placeName}, ${zipInfo.state}`
                      : `ZIP ${zip}`;
                  })()
                : `Selection (${data.zipCount} ZIPs)`}
        </h2>
      </div>
      {isNational && (
        <p className="text-xs text-gray-500">
          Click ZIP codes to filter. Shift+click for multi-select.
        </p>
      )}

      {/* Business Opportunity Gauge */}
      {!isNational && <OpportunityGauge score={opportunityScore} />}

      {/* Key Metrics with dynamic coloring */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className={`${demandColors.bg} rounded-lg p-2`}
          title={demandTier ? `${getTierColors(demandTier).label} - compared to national distribution` : ''}
        >
          <div className={`text-xs ${demandTier ? demandColors.text : 'text-purple-600'} font-medium`}>Total Demand</div>
          <div className={`text-xl font-bold ${demandTier ? demandColors.text.replace('text-', 'text-').replace('700', '900') : 'text-purple-900'}`}>
            {formatCurrency(data.totalDemand)}
          </div>
          {demandTier && (
            <div className={`text-xs ${demandColors.text}`}>
              {demandColors.label}
            </div>
          )}
          {!demandTier && (
            <div className="text-xs text-purple-600">
              {formatCurrencyFull(data.totalDemand)}
            </div>
          )}
        </div>

        <div
          className={`${saturationColors.bg} rounded-lg p-2`}
          title={saturationTier ? `${getTierColors(saturationTier).label} - compared to national distribution` : ''}
        >
          <div className={`text-xs ${saturationTier ? saturationColors.text : 'text-green-600'} font-medium`}>Demand/Provider</div>
          <div className={`text-xl font-bold ${saturationTier ? saturationColors.text.replace('700', '900') : 'text-green-900'}`}>
            {data.saturation ? formatCurrency(data.saturation) : 'N/A'}
          </div>
          {saturationTier && (
            <div className={`text-xs ${saturationColors.text}`}>
              {saturationColors.label}
            </div>
          )}
          {!saturationTier && (
            <div className="text-xs text-green-600">
              Market Saturation
            </div>
          )}
        </div>
      </div>

      {/* Persona Breakdown - Table with benchmark comparison */}
      <div className="border-t border-gray-200 pt-2">
        <PersonaBreakdownTable
          data={data}
          benchmarks={benchmarks}
          isNational={isNational}
          personaLabels={personaLabels}
        />
      </div>

      {/* Taxonomy Breakdown */}
      {data.taxonomies && (
        <div className="border-t border-gray-200 pt-2">
          <h3 className="text-sm font-medium text-gray-800 mb-2">Sociodemographics</h3>
          <div className="space-y-2">
            {Object.entries(data.taxonomies).map(([key, value]) => {
              const labels: Record<string, string> = {
                brandLoyal: 'Brand Loyal',
                couponClippers: 'Coupon Clippers',
                priceBuyers: 'Price Buyers',
                qualityBuyers: 'Quality Buyers',
                savers: 'Savers',
                spenders: 'Spenders',
              };
              return (
                <div key={key} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-800">{labels[key]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 tabular-nums">{formatPercent(value.percent * 100)}</span>
                      <span className="text-xs text-gray-500 tabular-nums">({formatNumber(value.count)})</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-500 rounded-full transition-all duration-300 group-hover:bg-slate-600"
                      style={{ width: `${value.percent * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected ZIPs - only show when ZIPs are selected */}
      {!isNational && (
        <div className="border-t border-gray-200 pt-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-800">Selected ZIPs</h3>
            <span className="text-xs text-gray-500">{selectedZips.length} selected</span>
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {selectedZips.map((zip) => (
              <span
                key={zip}
                className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {zip}
                <button
                  onClick={() => onRemoveZip(zip)}
                  className="ml-1.5 text-gray-400 hover:text-red-500"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
