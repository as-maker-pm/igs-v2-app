'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import LayerControls from '@/components/Sidebar/LayerControls';
import DashboardPanel from '@/components/Dashboard/DashboardPanel';
import { ZipDataMap, ProviderGeoJson, LayerVisibility, AggregatedData, MSAInfo, NationalBenchmarks } from '@/types/data';
import { aggregateSelection, calculateNationalBenchmarks } from '@/lib/calculations';
import { extractMSAList, computeEffectiveSelection } from '@/lib/msaUtils';

// Dynamic import for MapContainer to avoid SSR issues with MapLibre
const MapContainer = dynamic(() => import('@/components/Map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

interface CurrentUser { id: string; email: string; name: string; role: string; }

export default function ProjectMapPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id as string;

  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [zipData, setZipData] = useState<ZipDataMap>({});
  const [providers, setProviders] = useState<ProviderGeoJson | null>(null);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({ demand: false, saturation: false });
  const [showProviders, setShowProviders] = useState(false);
  const [selectedZips, setSelectedZips] = useState<string[]>([]);
  const [selectedMSAs, setSelectedMSAs] = useState<string[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProvidersInPopup, setShowProvidersInPopup] = useState(false);

  // Auth check on mount
  useEffect(() => {
    async function checkAuth() {
      const res = await fetch('/api/auth/verify');
      const data = await res.json();
      if (!data.user) {
        router.replace('/login');
        return;
      }
      setCurrentUser(data.user);
      setAuthChecked(true);
    }
    checkAuth();
  }, [router]);

  // Fetch tenant name
  useEffect(() => {
    if (!authChecked) return;
    async function fetchTenantName() {
      try {
        const res = await fetch('/api/admin/tenants');
        const data = await res.json();
        const tenant = (data.tenants || []).find((t: { id: string; name: string }) => t.id === tenantId);
        if (tenant) setProjectName(tenant.name);
      } catch {
        // ignore
      }
    }
    fetchTenantName();
  }, [authChecked, tenantId]);

  // Load ZIP data on mount (providers loaded lazily)
  useEffect(() => {
    async function loadZipData() {
      try {
        setLoading(true);
        const zipResponse = await fetch('/data/zip_data.json', { cache: 'no-store' });
        if (!zipResponse.ok) throw new Error('Failed to load ZIP data');
        const zipJson = await zipResponse.json();
        setZipData(zipJson);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }
    loadZipData();
  }, []);

  // Load providers in background after ZIP data loads (for popup details)
  useEffect(() => {
    if (!providers && !loadingProviders && Object.keys(zipData).length > 0) {
      async function loadProviders() {
        try {
          setLoadingProviders(true);
          const providersResponse = await fetch('/data/providers.geojson', { cache: 'no-store' });
          if (!providersResponse.ok) throw new Error('Failed to load providers');
          const providersJson = await providersResponse.json();
          setProviders(providersJson);
          setLoadingProviders(false);
        } catch (err) {
          console.error('Failed to load providers:', err);
          setLoadingProviders(false);
        }
      }
      loadProviders();
    }
  }, [providers, loadingProviders, zipData]);

  const calculateBreaks = useCallback((data: ZipDataMap, field: 'demand' | 'saturation', numBins: number = 6) => {
    const values = Object.values(data)
      .map((z) => field === 'saturation' ? (z.demandPerProviderZip || 0) : z.demand)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    if (values.length === 0) return [];

    const breaks: number[] = [];
    for (let i = 1; i < numBins; i++) {
      const idx = Math.floor((i / numBins) * values.length);
      breaks.push(values[idx]);
    }
    return breaks;
  }, []);

  const demandBreaks = useMemo(() => calculateBreaks(zipData, 'demand', 6), [zipData, calculateBreaks]);
  const saturationBreaks = useMemo(() => calculateBreaks(zipData, 'saturation', 6), [zipData, calculateBreaks]);

  const opportunityBreaks = useMemo(() => {
    const scores = Object.values(zipData)
      .map((z) => z.demand * (z.demandPerProviderZip || 0))
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    if (scores.length === 0) return [];

    const breaks: number[] = [];
    for (let i = 1; i < 6; i++) {
      const idx = Math.floor((i / 6) * scores.length);
      breaks.push(scores[idx]);
    }
    return breaks;
  }, [zipData]);

  const nationalBenchmarks = useMemo(() => {
    if (Object.keys(zipData).length === 0) return null;
    return calculateNationalBenchmarks(zipData);
  }, [zipData]);

  const msaList = useMemo(() => {
    if (Object.keys(zipData).length === 0) return [];
    return extractMSAList(zipData);
  }, [zipData]);

  const effectiveSelectedZips = useMemo(() => {
    return computeEffectiveSelection(selectedMSAs, selectedZips, zipData);
  }, [selectedMSAs, selectedZips, zipData]);

  useEffect(() => {
    if (Object.keys(zipData).length > 0) {
      const zipsForAggregation = selectedZips.length > 0 ? selectedZips : effectiveSelectedZips;
      const aggregated = aggregateSelection(zipsForAggregation, zipData);
      setAggregatedData(aggregated);
    }
  }, [selectedZips, effectiveSelectedZips, zipData]);

  // Prevent browser zoom with Ctrl+wheel (trackpad pinch zoom)
  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', preventZoom, { passive: false });
    return () => document.removeEventListener('wheel', preventZoom);
  }, []);

  const handleZipClick = useCallback((zip: string, event: { shiftKey: boolean }) => {
    setSelectedZips((prev) => {
      if (event.shiftKey) {
        if (prev.includes(zip)) return prev.filter((z) => z !== zip);
        return [...prev, zip];
      } else {
        if (prev.length === 1 && prev[0] === zip) return [];
        return [zip];
      }
    });
  }, []);

  const handleZipHover = useCallback((zip: string | null, data: any) => {}, []);

  const handleRemoveZip = useCallback((zip: string) => {
    setSelectedZips((prev) => prev.filter((z) => z !== zip));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedZips([]);
    setSelectedMSAs([]);
  }, []);

  const handleMSASelectionChange = useCallback((msas: string[]) => {
    setSelectedMSAs(msas);
  }, []);

  const handleLayerToggle = useCallback((layer: 'demand' | 'saturation', visible: boolean) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: visible }));
  }, []);

  const handleClearLayers = useCallback(() => {
    setLayerVisibility({ demand: false, saturation: false });
  }, []);

  if (!authChecked) return null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center text-red-600">
          <p className="text-xl font-bold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="h-screen flex flex-col">
      <AppHeader currentUser={currentUser} activeNav="map" />

      {/* Back link */}
      <div className="bg-white border-b border-gray-100 px-6 py-1.5 flex items-center gap-2">
        <Link href="/admin/tenants" className="text-xs text-blue-600 hover:underline">
          ← Back to Projects
        </Link>
        {projectName && (
          <>
            <span className="text-gray-300 text-xs">/</span>
            <span className="text-xs font-semibold text-gray-700">{projectName}</span>
          </>
        )}
      </div>

      {/* Main Content - Three column layout */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex min-h-0">
          {/* Left Sidebar */}
          <div className="w-56 bg-white border-r border-gray-200 overflow-y-auto p-4 flex-shrink-0 flex flex-col">
            <LayerControls
              layerVisibility={layerVisibility}
              onLayerToggle={handleLayerToggle}
              showProviders={showProviders}
              onToggleProviders={setShowProviders}
              loadingProviders={loadingProviders}
              demandBreaks={demandBreaks}
              saturationBreaks={saturationBreaks}
              opportunityBreaks={opportunityBreaks}
              selectedZipsCount={effectiveSelectedZips.length}
              onResetSelection={handleClearSelection}
              msaList={msaList}
              selectedMSAs={selectedMSAs}
              onMSASelectionChange={handleMSASelectionChange}
            />
          </div>

          {/* Map */}
          <div className="flex-1 min-w-0">
            <MapContainer
              zipData={zipData}
              providers={providers}
              layerVisibility={layerVisibility}
              selectedZips={selectedZips}
              selectedMSAs={selectedMSAs}
              showProviders={showProviders}
              showProvidersInPopup={showProvidersInPopup}
              onZipClick={handleZipClick}
              onZipHover={handleZipHover}
              onClearSelection={handleClearSelection}
              onClearLayers={handleClearLayers}
            />
          </div>

          {/* Right Sidebar */}
          <div className="w-[367px] bg-white border-l border-gray-200 overflow-y-auto p-4 flex-shrink-0">
            {aggregatedData && (
              <DashboardPanel
                data={aggregatedData}
                selectedZips={effectiveSelectedZips}
                selectedMSAs={selectedMSAs}
                benchmarks={nationalBenchmarks}
                zipData={zipData}
                onRemoveZip={handleRemoveZip}
              />
            )}
          </div>
        </div>

        {/* White space below map */}
        <div className="h-6 bg-white flex-shrink-0"></div>
      </div>
    </main>
  );
}
