'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import * as pmtiles from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ZipDataMap, ProviderGeoJson, LayerVisibility } from '@/types/data';
import { computeEffectiveSelection, getZipsForMSAs } from '@/lib/msaUtils';
import { calculateOpportunityScore } from '@/lib/calculations';

// Color palettes
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

// HTML escape helper — prevents XSS in MapLibre setHTML() popups
const esc = (value: unknown): string => {
  const str = value == null ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// URL safety — only allow http/https URLs in popup links
const safeUrl = (url: unknown): string | null => {
  if (!url) return null;
  const str = String(url);
  const normalized = str.startsWith('http://') || str.startsWith('https://')
    ? str
    : `https://${str}`;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? normalized
      : null;
  } catch {
    return null;
  }
};

// Format demand for map labels (abbreviated)
const formatDemandForMap = (demand: number): string => {
  if (demand === 0) return '';
  if (demand >= 1000000000) return `$${(demand / 1000000000).toFixed(1)}B`;
  if (demand >= 1000000) return `$${(demand / 1000000).toFixed(1)}M`;
  if (demand >= 1000) return `$${(demand / 1000).toFixed(0)}K`;
  return `$${demand.toFixed(0)}`;
};

interface MapContainerProps {
  zipData: ZipDataMap;
  providers: ProviderGeoJson | null;
  layerVisibility: LayerVisibility;
  selectedZips: string[];  // Manual ZIP selections only (for individual highlighting)
  selectedMSAs: string[];  // Selected MSA FIPS codes (for boundary + zoom)
  showProviders: boolean;
  showProvidersInPopup?: boolean;  // Toggle for showing provider list in ZIP popups
  onZipClick: (zip: string, event: { shiftKey: boolean }) => void;
  onZipHover: (zip: string | null, data: any) => void;
  onClearSelection?: () => void;
  onClearLayers?: () => void;
}

export default function MapContainer({
  zipData,
  providers,
  layerVisibility,
  selectedZips,
  selectedMSAs,
  showProviders,
  showProvidersInPopup = false,
  onZipClick,
  onZipHover,
  onClearSelection,
  onClearLayers,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const hoverPopup = useRef<maplibregl.Popup | null>(null);
  const clickPopup = useRef<maplibregl.Popup | null>(null);
  const shiftKeyPressed = useRef(false);
  const prevSelectedZips = useRef<string[]>([]);
  const prevSelectedMSAs = useRef<string[]>([]);
  // Refs to store callbacks and data - prevents stale closures when effect re-runs
  const onZipClickRef = useRef(onZipClick);
  const onZipHoverRef = useRef(onZipHover);
  const providersRef = useRef(providers);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [centroidsData, setCentroidsData] = useState<any>(null);

  // Compute effective selection (union of MSA ZIPs + manual ZIPs) for fill opacity
  const effectiveSelectedZips = useMemo(() => {
    return computeEffectiveSelection(selectedMSAs, selectedZips, zipData);
  }, [selectedMSAs, selectedZips, zipData]);

  // Build provider lookup map for O(1) access in popups
  const providerLookup = useMemo(() => {
    if (!providers?.features) return new Map<string, any>();
    return new Map(providers.features.map(f => [f.properties.name, f]));
  }, [providers]);
  const providerLookupRef = useRef(providerLookup);
  const showProvidersInPopupRef = useRef(showProvidersInPopup);

  // Keep callback and data refs updated
  useEffect(() => {
    onZipClickRef.current = onZipClick;
    onZipHoverRef.current = onZipHover;
    providersRef.current = providers;
    providerLookupRef.current = providerLookup;
    showProvidersInPopupRef.current = showProvidersInPopup;
  }, [onZipClick, onZipHover, providers, providerLookup, showProvidersInPopup]);

  // Track shift key state globally for reliable multi-select
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftKeyPressed.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftKeyPressed.current = false;
      }
    };
    // Use capture: true to ensure we catch the event before map handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, []);

  // Escape key: reset map view to US
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        map.current?.flyTo({
          center: [-98.5795, 39.8283],
          zoom: 4,
          duration: 1000
        });
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // R key: clear all selections (reset)
  useEffect(() => {
    const handleReset = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        // Don't trigger if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        onClearSelection?.();
      }
    };
    window.addEventListener('keydown', handleReset);
    return () => window.removeEventListener('keydown', handleReset);
  }, [onClearSelection]);

  // C key: clear all map layers
  useEffect(() => {
    const handleClearLayers = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        // Don't trigger if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        onClearLayers?.();
      }
    };
    window.addEventListener('keydown', handleClearLayers);
    return () => window.removeEventListener('keydown', handleClearLayers);
  }, [onClearLayers]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Register PMTiles protocol
    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
      minZoom: 2,
      maxZoom: 16,
      boxZoom: false, // Disable to allow shift+click for multi-select
    });

    // Hover popup - lightweight, no close button
    hoverPopup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      focusAfterOpen: false,
    });

    // Click popup - persistent with close button for clicking links
    clickPopup.current = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      focusAfterOpen: false,
      maxWidth: '300px',
    });

    map.current.on('load', () => {
      const m = map.current!;

      // Add PMTiles source for ZIP polygons with promoteId for feature-state
      const tilesUrl = process.env.NEXT_PUBLIC_TILES_URL || 'pmtiles:///data/zcta.pmtiles';
      m.addSource('zip-source', {
        type: 'vector',
        url: tilesUrl,
        promoteId: 'ZCTA5CE20', // Use ZIP code as feature ID for feature-state
      });

      // Add GeoJSON source for ZIP demand labels (centroids)
      // Data will be populated after fetching and transforming centroids
      m.addSource('zip-labels', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Add fill layer for ZIP polygons using feature-state for colors
      m.addLayer({
        id: 'zip-fill',
        type: 'fill',
        source: 'zip-source',
        'source-layer': 'zcta',
        paint: {
          'fill-color': [
            'case',
            ['!=', ['feature-state', 'demandColorIndex'], null],
            [
              'match',
              ['feature-state', 'demandColorIndex'],
              0, '#f3e5f5',
              1, '#ce93d8',
              2, '#ab47bc',
              3, '#8e24aa',
              4, '#6a1b9a',
              5, '#4a148c',
              '#cccccc'
            ],
            '#cccccc'
          ],
          'fill-opacity': 0.7,
        },
      });

      // Add outline layer
      m.addLayer({
        id: 'zip-outline',
        type: 'line',
        source: 'zip-source',
        'source-layer': 'zcta',
        paint: {
          'line-color': '#666666',
          'line-width': 0.5,
        },
      });

      // Add selection highlight layer
      m.addLayer({
        id: 'zip-selected',
        type: 'line',
        source: 'zip-source',
        'source-layer': 'zcta',
        paint: {
          'line-color': '#ff6b00',
          'line-width': 3,
        },
        filter: ['in', 'ZCTA5CE20', ''],
      });

      // Add MSA ZIP selection layer (gray outlines for MSA-derived ZIPs)
      m.addLayer({
        id: 'msa-zip-selected',
        type: 'line',
        source: 'zip-source',
        'source-layer': 'zcta',
        paint: {
          'line-color': '#f97316',
          'line-width': 2,
        },
        filter: ['in', 'ZCTA5CE20', ''], // Initially empty
      });

      // Add demand labels layer with zoom-based visibility
      // Labels appear at zoom 6+ with graduated size for readability
      // Added after MSA layer so labels appear on top
      m.addLayer({
        id: 'zip-demand-labels',
        type: 'symbol',
        source: 'zip-labels',
        minzoom: 6,  // Show labels earlier for better visibility
        layout: {
          'text-field': ['get', 'demandLabel'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          // Graduated text size: scales up as you zoom in
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            6, 8,    // At zoom 6: 8px text
            8, 9,    // At zoom 8: 9px text
            10, 10,  // At zoom 10: 10px text
            12, 12   // At zoom 12+: 12px text
          ],
          'text-allow-overlap': false,
          // Prioritize high-demand labels at low zoom (negative for descending sort)
          'symbol-sort-key': ['*', -1, ['get', 'demand']],
          'visibility': 'none', // Initially hidden, controlled by layer toggle
        },
        paint: {
          'text-color': '#333333',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
          // Graduated opacity: more transparent at low zoom
          'text-opacity': [
            'interpolate', ['linear'], ['zoom'],
            6, 0.7,   // At zoom 6: 70% opacity
            8, 0.8,   // At zoom 8: 80% opacity
            10, 1.0   // At zoom 10+: full opacity
          ],
        },
      });

      // Load centroids for zoom-to-fit and map labels
      fetch('/data/zip_centroids.geojson')
        .then((res) => res.json())
        .then((data) => {
          // Transform centroids to add formatted demand labels
          const transformedData = {
            ...data,
            features: data.features.map((f: any) => ({
              ...f,
              properties: {
                ...f.properties,
                demandLabel: formatDemandForMap(f.properties.demand || 0),
              },
            })),
          };
          // Update the zip-labels source with transformed data
          const source = m.getSource('zip-labels') as maplibregl.GeoJSONSource;
          if (source) {
            source.setData(transformedData);
          }
          setCentroidsData(data);
        })
        .catch((err) => console.error('Failed to load centroids:', err));

      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add providers layer when data is available
  useEffect(() => {
    if (!map.current || !mapLoaded || !providers) return;

    const m = map.current;

    // Remove existing provider layers if they exist
    if (m.getLayer('provider-clusters')) m.removeLayer('provider-clusters');
    if (m.getLayer('cluster-count')) m.removeLayer('cluster-count');
    if (m.getLayer('provider-points')) m.removeLayer('provider-points');
    if (m.getSource('providers')) m.removeSource('providers');

    // Add providers source with clustering enabled
    m.addSource('providers', {
      type: 'geojson',
      data: providers,
      cluster: true,
      clusterMaxZoom: 5,     // Cluster up to zoom 5 (show individuals at zoom 6+)
      clusterRadius: 35,      // Cluster points within 35px (tighter clusters)
    });

    const visibility = showProviders ? 'visible' : 'none';

    // Cluster circles - scaled by point count
    m.addLayer({
      id: 'provider-clusters',
      type: 'circle',
      source: 'providers',
      filter: ['has', 'point_count'],
      layout: { visibility },
      paint: {
        'circle-color': '#2563eb',
        'circle-radius': [
          'step', ['get', 'point_count'],
          12,      // 12px for < 5 points
          5, 16,   // 16px for 5-9
          10, 20,  // 20px for 10-49
          50, 25,  // 25px for 50-99
          100, 30  // 30px for 100+
        ],
        'circle-stroke-width': 0,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Cluster count labels
    m.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'providers',
      filter: ['has', 'point_count'],
      layout: {
        visibility,
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 11,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Individual provider points (unclustered only)
    m.addLayer({
      id: 'provider-points',
      type: 'circle',
      source: 'providers',
      filter: ['!', ['has', 'point_count']],  // Only unclustered points
      layout: { visibility },
      paint: {
        'circle-color': [
          'case',
          ['get', 'isTopCompetitor'],
          '#f87171',
          '#2563eb',
        ],
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          6, 1,    // At zoom 6: 1px (tiny to reduce overlap)
          7, 2,    // At zoom 7: 2px
          8, 2,    // At zoom 8: 2px
          10, 3,   // At zoom 10: 3px
          12, 4    // At zoom 12+: 4px
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#93c5fd',
      },
    });
  }, [mapLoaded, providers, showProviders]);

  // Calculate quantile breaks for choropleth
  // Note: 'saturation' uses demandPerProviderZip (demand per provider in ZIP)
  const getBreaks = useCallback((valueField: 'demand' | 'saturation', numBins: number = 6) => {
    const values = Object.values(zipData)
      .map((z) => valueField === 'saturation' ? (z.demandPerProviderZip || 0) : (z[valueField] as number))
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    if (values.length === 0) return [];

    const breaks: number[] = [];
    for (let i = 1; i < numBins; i++) {
      const idx = Math.floor((i / numBins) * values.length);
      breaks.push(values[idx]);
    }
    return breaks;
  }, [zipData]);

  // Calculate opportunity score breaks using unified geometric mean formula
  const getOpportunityBreaks = useCallback((numBins: number = 5) => {
    const scores = Object.values(zipData)
      .map((z) => calculateOpportunityScore(z.totalDemandPctile, z.demandPerProviderPctile))
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    if (scores.length === 0) return [];

    const breaks: number[] = [];
    for (let i = 1; i < numBins; i++) {
      const idx = Math.floor((i / numBins) * scores.length);
      breaks.push(scores[idx]);
    }
    return breaks;
  }, [zipData]);

  // Update feature states for choropleth colors
  useEffect(() => {
    if (!map.current || !mapLoaded || !Object.keys(zipData).length) return;

    const m = map.current;

    // Determine display mode
    const showOpportunity = layerVisibility.demand && layerVisibility.saturation;
    const showDemandOnly = layerVisibility.demand && !layerVisibility.saturation;
    const showSaturationOnly = !layerVisibility.demand && layerVisibility.saturation;

    // Get appropriate breaks based on mode
    const demandBreaks = getBreaks('demand', 6);
    const saturationBreaks = getBreaks('saturation', 6);
    const opportunityBreaks = showOpportunity ? getOpportunityBreaks(5) : [];

    // Update fill-color based on layer visibility
    if (showOpportunity) {
      // Opportunity mode: hot colors = high demand × high $/provider
      m.setPaintProperty('zip-fill', 'fill-color', [
        'case',
        ['!=', ['feature-state', 'opportunityColorIndex'], null],
        [
          'match',
          ['feature-state', 'opportunityColorIndex'],
          0, OPPORTUNITY_COLORS[0],
          1, OPPORTUNITY_COLORS[1],
          2, OPPORTUNITY_COLORS[2],
          3, OPPORTUNITY_COLORS[3],
          4, OPPORTUNITY_COLORS[4],
          '#cccccc'
        ],
        '#cccccc'
      ]);
    } else if (showDemandOnly) {
      m.setPaintProperty('zip-fill', 'fill-color', [
        'case',
        ['!=', ['feature-state', 'demandColorIndex'], null],
        [
          'match',
          ['feature-state', 'demandColorIndex'],
          0, DEMAND_COLORS[0],
          1, DEMAND_COLORS[1],
          2, DEMAND_COLORS[2],
          3, DEMAND_COLORS[3],
          4, DEMAND_COLORS[4],
          5, DEMAND_COLORS[5],
          '#cccccc'
        ],
        '#cccccc'
      ]);
    } else if (showSaturationOnly) {
      m.setPaintProperty('zip-fill', 'fill-color', [
        'case',
        ['!=', ['feature-state', 'saturationColorIndex'], null],
        [
          'match',
          ['feature-state', 'saturationColorIndex'],
          0, SATURATION_COLORS[0],
          1, SATURATION_COLORS[1],
          2, SATURATION_COLORS[2],
          3, SATURATION_COLORS[3],
          4, SATURATION_COLORS[4],
          5, SATURATION_COLORS[5],
          '#cccccc'
        ],
        '#cccccc'
      ]);
    }
    // Note: fill-opacity is managed by the selection highlight effect

    // Toggle demand label visibility based on demand layer
    if (m.getLayer('zip-demand-labels')) {
      m.setLayoutProperty(
        'zip-demand-labels',
        'visibility',
        layerVisibility.demand ? 'visible' : 'none'
      );
    }

    // Reset border to default (no longer using saturation border)
    m.setPaintProperty('zip-outline', 'line-color', '#666666');
    m.setPaintProperty('zip-outline', 'line-width', 0.5);

    // Function to update feature states for visible features
    const updateFeatureStates = () => {
      const features = m.querySourceFeatures('zip-source', { sourceLayer: 'zcta' });
      const seen = new Set<string>();

      features.forEach((f) => {
        const zip = f.properties?.ZCTA5CE20;
        if (!zip || seen.has(zip)) return;
        seen.add(zip);

        const data = zipData[zip];
        if (data) {
          // Calculate color index for demand (6 bins)
          let demandColorIndex = 0;
          for (let i = 0; i < demandBreaks.length; i++) {
            if (data.demand > demandBreaks[i]) demandColorIndex = i + 1;
          }

          // Calculate color index for saturation using demandPerProviderZip (6 bins)
          let saturationColorIndex = 0;
          const saturationValue = data.demandPerProviderZip || 0;
          for (let i = 0; i < saturationBreaks.length; i++) {
            if (saturationValue > saturationBreaks[i]) saturationColorIndex = i + 1;
          }

          // Calculate opportunity score using unified geometric mean formula
          let opportunityColorIndex = 0;
          const opportunityScore = calculateOpportunityScore(data.totalDemandPctile, data.demandPerProviderPctile);
          for (let i = 0; i < opportunityBreaks.length; i++) {
            if (opportunityScore > opportunityBreaks[i]) opportunityColorIndex = i + 1;
          }

          m.setFeatureState(
            { source: 'zip-source', sourceLayer: 'zcta', id: zip },
            {
              demandColorIndex: Math.min(demandColorIndex, 5),
              saturationColorIndex: Math.min(saturationColorIndex, 5),
              opportunityColorIndex: Math.min(opportunityColorIndex, 4),
            }
          );
        }
      });
    };

    // Update on map move/zoom and source data load
    updateFeatureStates();
    m.on('moveend', updateFeatureStates);
    m.on('sourcedata', (e) => {
      if (e.sourceId === 'zip-source' && e.isSourceLoaded) {
        updateFeatureStates();
      }
    });

    return () => {
      m.off('moveend', updateFeatureStates);
    };
  }, [mapLoaded, zipData, layerVisibility, getBreaks, getOpportunityBreaks]);

  // Close click popup when all selections are cleared (reset button)
  useEffect(() => {
    if (selectedZips.length === 0 && selectedMSAs.length === 0 && clickPopup.current) {
      clickPopup.current.remove();
    }
  }, [selectedZips, selectedMSAs]);

  // Update selection highlight and manage selection-based opacity
  // Note: selectedZips = manual clicks only (for zip-selected outline)
  //       effectiveSelectedZips = MSA ZIPs + manual clicks (for fill opacity)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;

    // Update the selection outline filter (only manual ZIP clicks get individual outlines)
    const filter = ['in', 'ZCTA5CE20', ...selectedZips] as maplibregl.FilterSpecification;
    m.setFilter('zip-selected', filter);

    // Clear isSelected state on previously selected zips
    prevSelectedZips.current.forEach((zip) => {
      m.setFeatureState(
        { source: 'zip-source', sourceLayer: 'zcta', id: zip },
        { isSelected: false }
      );
    });

    // Determine which ZIPs to highlight:
    // - If manual clicks exist, prioritize those (only show clicked ZIPs)
    // - Otherwise fall back to effective selection (MSA ZIPs)
    const zipsToHighlight = selectedZips.length > 0 ? selectedZips : effectiveSelectedZips;

    // Set isSelected state on ZIPs to highlight
    zipsToHighlight.forEach((zip) => {
      m.setFeatureState(
        { source: 'zip-source', sourceLayer: 'zcta', id: zip },
        { isSelected: true }
      );
    });

    // Update fill-opacity based on selection state
    const anyLayerEnabled = layerVisibility.demand || layerVisibility.saturation;

    if (!anyLayerEnabled) {
      // No layers enabled - keep transparent
      m.setPaintProperty('zip-fill', 'fill-opacity', 0);
    } else if (zipsToHighlight.length > 0) {
      // Has selection - show selected at full opacity, hide unselected
      m.setPaintProperty('zip-fill', 'fill-opacity', [
        'case',
        ['==', ['feature-state', 'isSelected'], true],
        0.7,
        0
      ]);
    } else {
      // No selection - show all at normal opacity
      m.setPaintProperty('zip-fill', 'fill-opacity', 0.7);
    }

    // Update ref for next render (track highlighted ZIPs for clearing)
    prevSelectedZips.current = zipsToHighlight;
  }, [mapLoaded, selectedZips, effectiveSelectedZips, layerVisibility]);

  // Update MSA ZIP highlight (black outlines) and zoom-to-fit
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;

    // Get all ZIPs for selected MSAs
    const msaZips = getZipsForMSAs(selectedMSAs, zipData);

    // Update the msa-zip-selected layer filter
    if (m.getLayer('msa-zip-selected')) {
      const filter = msaZips.length > 0
        ? ['in', 'ZCTA5CE20', ...msaZips] as maplibregl.FilterSpecification
        : ['in', 'ZCTA5CE20', ''] as maplibregl.FilterSpecification;
      m.setFilter('msa-zip-selected', filter);
    }

    // Zoom to fit selected MSAs (only when selection changes)
    const msasChanged = JSON.stringify(selectedMSAs) !== JSON.stringify(prevSelectedMSAs.current);
    if (msasChanged && selectedMSAs.length > 0 && centroidsData) {
      // Find centroids for ZIPs in selected MSAs
      const msaZipSet = new Set(msaZips);
      const matchingCentroids = centroidsData.features.filter((f: any) =>
        msaZipSet.has(f.properties.zip)
      );

      if (matchingCentroids.length > 0) {
        // Calculate bounds from centroids
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

        matchingCentroids.forEach((feature: any) => {
          const [lng, lat] = feature.geometry.coordinates;
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });

        // Fit bounds with padding
        m.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 50, maxZoom: 10, duration: 1000 }
        );
      }
    }

    prevSelectedMSAs.current = selectedMSAs;
  }, [mapLoaded, selectedMSAs, zipData, centroidsData]);

  // Toggle provider visibility
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const visibility = showProviders ? 'visible' : 'none';
    ['provider-clusters', 'cluster-count', 'provider-points'].forEach((layerId) => {
      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });
  }, [mapLoaded, showProviders]);

  // Setup click and hover handlers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;

    // Format demand helper (abbreviated)
    const formatDemand = (demand: number) => {
      if (demand === 0) return '$0';
      if (demand >= 1000000000) return `$${(demand / 1000000000).toFixed(1)}B`;
      if (demand >= 1000000) return `$${(demand / 1000000).toFixed(1)}M`;
      if (demand >= 1000) return `$${(demand / 1000).toFixed(0)}K`;
      return `$${demand.toFixed(0)}`;
    };

    // Format demand helper (full number with commas)
    const formatDemandFull = (demand: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(demand);
    };

    // ZIP click handler - shows persistent popup
    const handleZipClick = (e: maplibregl.MapMouseEvent) => {
      // Check if click hit a provider - if so, don't process ZIP click
      const providerFeatures = m.queryRenderedFeatures(e.point, {
        layers: ['provider-points', 'provider-clusters']
      });
      if (providerFeatures.length > 0) return;

      const features = m.queryRenderedFeatures(e.point, { layers: ['zip-fill'] });
      if (features.length > 0) {
        const zip = features[0].properties?.ZCTA5CE20;
        if (zip) {
          const shiftFromEvent = e.originalEvent?.shiftKey;
          const shiftFromRef = shiftKeyPressed.current;
          const finalShift = shiftFromEvent || shiftFromRef;
          onZipClickRef.current(zip, { shiftKey: finalShift });

          // Show persistent click popup with full details
          const data = zipData[zip];
          if (data && clickPopup.current) {
            // Hide hover popup when showing click popup
            hoverPopup.current?.remove();

            clickPopup.current
              .setLngLat(e.lngLat)
              .setHTML(
                `<div style="padding: 8px; min-width: 200px; max-height: 350px; overflow-y: auto;">
                  <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">ZIP ${esc(zip)}</div>
                  ${data.placeName ? `<div style="color: #666; font-size: 12px;">${esc(data.placeName)}${data.state ? `, ${esc(data.state)}` : ''}</div>` : ''}
                  ${data.cbsaName ? `<div style="color: #888; font-size: 11px; margin-bottom: 8px;">${esc(data.cbsaName)}</div>` : '<div style="margin-bottom: 8px;"></div>'}
                  <div style="display: grid; grid-template-columns: auto auto; gap: 4px 12px; font-size: 12px;">
                    <span style="color: #666;">Demand:</span>
                    <span style="font-weight: 500; color: #6a1b9a;">${formatDemandFull(data.demand)}</span>
                    <span style="color: #666;">Demand/Provider:</span>
                    <span style="font-weight: 500; color: #2e7d32;">${data.demandPerProviderZip ? formatDemandFull(data.demandPerProviderZip) : 'N/A'}</span>
                    <span style="color: #666;">Providers:</span>
                    <span style="font-weight: 500;">${data.providerCount || 0}</span>
                  </div>
                  ${showProvidersInPopupRef.current && data.providerIds && data.providerIds.length > 0 ? `
                    <div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
                      <div style="font-weight: 500; font-size: 12px; margin-bottom: 4px;">Providers in ZIP:</div>
                      ${data.providerIds.map((id: string) => {
                        const name = id.split('|')[0];
                        const providerFeature = providerLookupRef.current.get(name);
                        if (providerFeature) {
                          const p = providerFeature.properties;
                          const url = safeUrl(p.url);
                          return `<div style="border-bottom: 1px solid #eee; padding: 6px 0;">
                            <strong>${esc(p.name)}</strong><br/>
                            <span style="font-size: 11px; color: #666;">${esc(p.address)}</span><br/>
                            <span style="font-size: 11px;">${esc(p.city)}, ${esc(p.state)} ${esc(p.zip)}</span><br/>
                            <span style="font-size: 11px;">Top Provider: ${p.isTopCompetitor ? 'Yes' : 'No'}</span>
                            ${url ? `<br/><a href="${esc(url)}" target="_blank" style="color: #2563eb; font-size: 11px;">${esc(p.url)}</a>` : ''}
                          </div>`;
                        }
                        return `<div style="font-size: 11px; color: #666; padding: 2px 0;">${esc(name)}</div>`;
                      }).join('')}
                    </div>
                  ` : ''}
                </div>`
              )
              .addTo(m);
          }
        }
      }
    };

    // ZIP hover handler - shows lightweight tooltip
    const handleZipHover = (e: maplibregl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, { layers: ['zip-fill'] });
      if (features.length > 0) {
        const zip = features[0].properties?.ZCTA5CE20;
        const data = zip ? zipData[zip] : null;
        m.getCanvas().style.cursor = 'pointer';
        onZipHoverRef.current(zip, data);

        // Only show hover popup if click popup is not visible
        if (data && hoverPopup.current && !clickPopup.current?.isOpen()) {
          hoverPopup.current
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="padding: 6px; font-size: 12px;">
                <strong>ZIP ${esc(zip)}</strong>
                ${data.placeName ? ` - ${esc(data.placeName)}` : ''}
              </div>`
            )
            .addTo(m);
        }
      } else {
        m.getCanvas().style.cursor = '';
        onZipHoverRef.current(null, null);
        hoverPopup.current?.remove();
      }
    };

    // Provider click handler - shows persistent popup
    const handleProviderClick = (e: maplibregl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, {
        layers: ['provider-points'],
      });
      if (features.length > 0) {
        const props = features[0].properties;
        if (props && clickPopup.current) {
          const coords = (features[0].geometry as any).coordinates.slice();
          const providerUrl = safeUrl(props.url);
          clickPopup.current
            .setLngLat(coords)
            .setHTML(
              `<div style="padding: 8px;">
                <strong>${esc(props.name)}</strong><br/>
                ${esc(props.address)}<br/>
                ${esc(props.city)}, ${esc(props.state)} ${esc(props.zip)}<br/>
                Top Provider: ${props.isTopCompetitor ? 'Yes' : 'No'}<br/>
                ${providerUrl ? `<a href="${esc(providerUrl)}" target="_blank" style="color: #2563eb;">${esc(props.url)}</a>` : ''}
              </div>`
            )
            .addTo(m);
        }
      }
    };

    // Cluster click handler - shows all providers in cluster
    const handleClusterClick = async (e: maplibregl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, { layers: ['provider-clusters'] });
      if (features.length === 0) return;

      const clusterId = features[0].properties?.cluster_id;
      if (!clusterId) return;

      const source = m.getSource('providers') as maplibregl.GeoJSONSource;
      if (!source) return;

      try {
        // Get all points in the cluster
        const leaves = await source.getClusterLeaves(clusterId, 100, 0);

        // Build popup HTML with all providers
        const providersHtml = leaves.map((leaf: any) => {
          const p = leaf.properties;
          const clusterUrl = safeUrl(p.url);
          return `<div style="border-bottom: 1px solid #eee; padding: 6px 0;">
            <strong>${esc(p.name)}</strong><br/>
            <span style="font-size: 11px; color: #666;">${esc(p.address)}</span><br/>
            <span style="font-size: 11px;">Top Provider: ${p.isTopCompetitor ? 'Yes' : 'No'}</span>
            ${clusterUrl ? `<br/><a href="${esc(clusterUrl)}" target="_blank" style="color: #2563eb; font-size: 11px;">${esc(p.url)}</a>` : ''}
          </div>`;
        }).join('');

        if (clickPopup.current) {
          clickPopup.current
            .setLngLat(e.lngLat)
            .setHTML(`<div style="padding: 8px; max-height: 300px; overflow-y: auto; min-width: 250px;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${leaves.length} Providers at this location</div>
              ${providersHtml}
            </div>`)
            .addTo(m);
        }
      } catch (err) {
        console.error('Error getting cluster leaves:', err);
      }
    };

    m.on('click', 'zip-fill', handleZipClick);
    m.on('mousemove', 'zip-fill', handleZipHover);
    m.on('mouseleave', 'zip-fill', () => {
      m.getCanvas().style.cursor = '';
      onZipHoverRef.current(null, null);
      hoverPopup.current?.remove();
    });
    m.on('click', 'provider-points', handleProviderClick);
    m.on('click', 'provider-clusters', handleClusterClick);

    // Change cursor on cluster hover
    m.on('mouseenter', 'provider-clusters', () => {
      m.getCanvas().style.cursor = 'pointer';
    });
    m.on('mouseleave', 'provider-clusters', () => {
      m.getCanvas().style.cursor = '';
    });

    return () => {
      m.off('click', 'zip-fill', handleZipClick);
      m.off('mousemove', 'zip-fill', handleZipHover);
      m.off('click', 'provider-points', handleProviderClick);
      m.off('click', 'provider-clusters', handleClusterClick);
    };
  }, [mapLoaded, zipData]); // Using refs for callbacks to prevent stale closures

  // Search state
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle address search
  const handleSearch = async (query: string) => {
    if (!query.trim() || !map.current) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=us&limit=1`
      );
      const results = await response.json();

      if (results.length > 0) {
        const { lon, lat } = results[0];
        map.current.flyTo({
          center: [parseFloat(lon), parseFloat(lat)],
          zoom: 12,
        });
        setSearchExpanded(false);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  // Focus input when expanded
  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  return (
    <div className="w-full h-full relative">
      {/* Map */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Custom map controls - bottom left */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        {/* Zoom controls - joined horizontal */}
        <div className="flex bg-white rounded-lg shadow">
          <button
            onClick={() => map.current?.zoomOut()}
            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg border-r border-gray-200"
            title="Zoom out"
          >
            −
          </button>
          <button
            onClick={() => map.current?.zoomIn()}
            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg"
            title="Zoom in"
          >
            +
          </button>
        </div>

        {/* Search */}
        {searchExpanded ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(searchQuery);
            }}
            className="flex items-center bg-white rounded-lg shadow"
          >
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Address or ZIP..."
              className="px-3 py-2 w-48 text-sm border-none rounded-l-lg focus:outline-none"
              onBlur={() => {
                if (!searchQuery) setSearchExpanded(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchExpanded(false);
                  setSearchQuery('');
                }
              }}
            />
            <button
              type="submit"
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-r-lg border-l"
              title="Search"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchExpanded(false);
                setSearchQuery('');
              }}
              className="px-2 py-2 text-gray-400 hover:text-gray-600"
              title="Close"
            >
              ×
            </button>
          </form>
        ) : (
          <button
            onClick={() => setSearchExpanded(true)}
            className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
            title="Search location"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
