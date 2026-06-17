'use client';

import { LayerVisibility, MSAInfo } from '@/types/data';
import MSASelector from './MSASelector';

// Color palettes (must match MapContainer)
const DEMAND_COLORS = ['#f3e5f5', '#ce93d8', '#ab47bc', '#8e24aa', '#6a1b9a', '#4a148c'];
const SATURATION_COLORS = ['#e8f5e9', '#a5d6a7', '#66bb6a', '#43a047', '#2e7d32', '#1b5e20'];
// Opportunity colors: cool (low) → hot (high opportunity)
const OPPORTUNITY_COLORS = [
  '#f5f5f5', // bin 0 - very light gray
  '#ffcdd2', // bin 1 - light pink/red
  '#ef5350', // bin 2 - medium red
  '#c62828', // bin 3 - dark red
  '#b71c1c', // bin 4 - very dark red
];

// Format helpers
const formatDemand = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const formatSaturation = (value: number) => `${value.toFixed(0)}%`;

interface LayerControlsProps {
  layerVisibility: LayerVisibility;
  onLayerToggle: (layer: 'demand' | 'saturation', visible: boolean) => void;
  showProviders: boolean;
  onToggleProviders: (show: boolean) => void;
  loadingProviders?: boolean;
  demandBreaks: number[];
  saturationBreaks: number[];
  opportunityBreaks: number[];
  selectedZipsCount?: number;
  onResetSelection?: () => void;
  msaList: MSAInfo[];
  selectedMSAs: string[];
  onMSASelectionChange: (msas: string[]) => void;
}

export default function LayerControls({
  layerVisibility,
  onLayerToggle,
  showProviders,
  onToggleProviders,
  loadingProviders = false,
  demandBreaks,
  saturationBreaks,
  opportunityBreaks,
  selectedZipsCount = 0,
  onResetSelection,
  msaList,
  selectedMSAs,
  onMSASelectionChange,
}: LayerControlsProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-800 mb-2">Heat Map Layers</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={layerVisibility.demand}
              onChange={(e) => onLayerToggle('demand', e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span className="text-sm">
              <span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: '#8e24aa' }}></span>
              Total Demand ($)
            </span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={layerVisibility.saturation}
              onChange={(e) => onLayerToggle('saturation', e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm">
              <span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: '#2e7d32' }}></span>
              Demand/Provider ($)
            </span>
          </label>
        </div>
        {layerVisibility.demand && layerVisibility.saturation && (
          <p className="text-xs text-gray-500 mt-2 italic">
            Showing opportunity heatmap
          </p>
        )}
      </div>

      <div className="border-t pt-4">
        <MSASelector
          msaList={msaList}
          selectedMSAs={selectedMSAs}
          onSelectionChange={onMSASelectionChange}
        />
      </div>

      <div className="border-t pt-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showProviders}
            onChange={(e) => onToggleProviders(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm">
            Show Providers
            {loadingProviders && (
              <span className="ml-2 text-gray-400">(loading...)</span>
            )}
          </span>
        </label>
      </div>

      {(layerVisibility.demand || layerVisibility.saturation) && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-800 mb-2">Legend</h3>
          {layerVisibility.demand && layerVisibility.saturation ? (
            // Opportunity legend - single gradient from cold to hot
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-gray-600 mb-1">Business Opportunity</div>
              <div className="text-[9px] text-gray-500 mb-1">High Demand × High $/Provider = High Opportunity</div>
              {OPPORTUNITY_COLORS.map((color, idx) => {
                const label = idx === 0
                  ? 'Low opportunity'
                  : idx === OPPORTUNITY_COLORS.length - 1
                    ? 'High opportunity'
                    : '';
                return (
                  <div key={idx} className="flex items-center space-x-2">
                    <div className="w-4 h-3 flex-shrink-0" style={{ backgroundColor: color }}></div>
                    {label && <span className="text-[10px] text-gray-600">{label}</span>}
                  </div>
                );
              })}
            </div>
          ) : layerVisibility.demand ? (
            // Single demand legend with all 6 colors and numeric ranges
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-gray-600 mb-1">Demand ($)</div>
              {DEMAND_COLORS.map((color, idx) => {
                const min = idx === 0 ? 0 : demandBreaks[idx - 1];
                const max = demandBreaks[idx];
                const label = idx === DEMAND_COLORS.length - 1
                  ? `${formatDemand(min)}+`
                  : max !== undefined
                    ? `${formatDemand(min)} – ${formatDemand(max)}`
                    : formatDemand(min);
                return (
                  <div key={idx} className="flex items-center space-x-2">
                    <div className="w-4 h-3 flex-shrink-0" style={{ backgroundColor: color }}></div>
                    <span className="text-[10px] text-gray-600">{label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            // Single demand/provider legend with all 6 colors and numeric ranges
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-gray-600 mb-1">Demand/Provider ($)</div>
              {SATURATION_COLORS.map((color, idx) => {
                const min = idx === 0 ? 0 : saturationBreaks[idx - 1];
                const max = saturationBreaks[idx];
                const label = idx === SATURATION_COLORS.length - 1
                  ? `${formatDemand(min)}+`
                  : max !== undefined
                    ? `${formatDemand(min)} – ${formatDemand(max)}`
                    : formatDemand(min);
                return (
                  <div key={idx} className="flex items-center space-x-2">
                    <div className="w-4 h-3 flex-shrink-0" style={{ backgroundColor: color }}></div>
                    <span className="text-[10px] text-gray-600">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedZipsCount > 0 && onResetSelection && (
        <div className="border-t pt-4">
          <button
            onClick={onResetSelection}
            className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition-colors"
          >
            Reset Map ({selectedZipsCount} selected)
          </button>
          <p className="text-xs text-gray-400 mt-1 text-center">Press R to clear selection</p>
        </div>
      )}

      <div className="border-t border-gray-200 pt-4 text-xs text-gray-500 space-y-1">
        <p><span className="font-medium">Tip:</span> Click a ZIP to select.</p>
        <p><span className="font-bold">Shift + Click:</span> Multi-Select</p>
        <p><span className="font-bold">Esc:</span> Reset View</p>
        <p><span className="font-bold">R:</span> Reset Selection</p>
        <p><span className="font-bold">C:</span> Clear Layers</p>
      </div>
      </div>

    </div>
  );
}
