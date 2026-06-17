'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';

interface CurrentUser { id: string; email: string; name: string; role: string; }

export default function MethodologyPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

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

  if (!authChecked) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AppHeader currentUser={currentUser} activeNav="methodology" />
      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Methodology</h1>
        <p className="text-gray-600 mb-10">
          Understanding how metrics are calculated in the Market Demand & Saturation Analysis tool.
        </p>

        <div className="space-y-10">
          {/* Total Demand */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Total Demand</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Total Demand represents the estimated total addressable market value in dollars for outdoor
              services within a geographic area. This figure is derived from household-level spending
              patterns and market research data.
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Multi-ZIP Selection:</strong> When multiple ZIP codes are selected, Total Demand
                is the sum of demand values across all selected areas.
              </p>
            </div>
          </section>

          {/* Market Saturation */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Market Saturation (Demand per Provider)</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Market Saturation measures the competitive intensity of a market by calculating how much
              demand exists per service provider. Higher values indicate less competition and greater
              market opportunity for each provider.
            </p>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
              <p className="font-mono text-sm text-gray-800">
                Saturation = Total Demand ÷ Provider Count
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Interpretation:</strong> A saturation value of $500,000 means each provider in
                that area could theoretically capture $500K of market demand if the market were evenly distributed.
              </p>
              <p className="text-sm text-gray-600">
                <strong>Multi-ZIP Selection:</strong> Uses a <em>distinct</em> provider count to avoid
                double-counting providers that may serve multiple selected ZIP codes.
              </p>
            </div>
          </section>

          {/* Provider Count */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Provider Count</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              The number of outdoor service providers physically located within the selected area.
              Providers are identified by their business address and matched to ZIP codes.
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Multi-ZIP Selection:</strong> Shows the <em>distinct</em> count of providers—each
                provider is counted only once, even if their service area spans multiple selected ZIP codes.
              </p>
            </div>
          </section>

          {/* Business Opportunity Indicator */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Business Opportunity Indicator</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Business Opportunity gauge provides a quick visual assessment of how attractive a selected
              market area is for business expansion. It appears when you select specific ZIP codes or MSAs.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">How it's calculated:</p>
              <p className="text-sm text-gray-600 mb-3">
                The score uses a <strong>geometric mean</strong> of demand and saturation percentiles,
                which ensures that <em>both</em> metrics must be strong for a high opportunity score:
              </p>

              <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-800 font-mono text-center">
                  Score = 100 × √(Demand_pctile × Saturation_pctile)
                </p>
              </div>

              <p className="text-sm text-gray-600 mb-3">
                Where both percentiles are normalized to 0-1 (divided by 100). This formula ensures:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5 mb-4">
                <li>One weak dimension collapses the score (can&apos;t &quot;hide&quot; a bad metric)</li>
                <li>Both metrics must be strong for a high opportunity score</li>
                <li>The score is consistent between the dashboard gauge and map heatmap</li>
                <li><strong>No providers?</strong> Score equals demand percentile (high demand = high opportunity)</li>
              </ul>

              {/* Example Scenarios */}
              <p className="text-xs font-medium text-gray-600 mb-2">Example Scenarios:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">~100 pts</span>
                  <span className="text-xs text-gray-600">Both at 100th percentile = Ideal expansion market</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">~50 pts</span>
                  <span className="text-xs text-gray-600">Both at 50th percentile = Average opportunity</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">~22 pts</span>
                  <span className="text-xs text-gray-600">95th demand but 5th saturation = Weak (one bad metric drags down)</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1/2 rounded-full" style={{ backgroundColor: '#1e3a5f' }} />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low Opportunity (0)</span>
              <span>High Opportunity (100)</span>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Multi-ZIP Selection:</strong> For multiple ZIPs, we compute each ZIP&apos;s opportunity
                score first, then aggregate using <em>demand-weighted averaging</em>—bigger demand ZIPs
                contribute more to the combined score.
              </p>
              <p className="text-sm text-gray-700">
                <strong>Interpretation:</strong> A high score (needle pointing right) indicates a market with strong
                demand AND relatively few competitors—ideal conditions for expansion.
              </p>
            </div>
          </section>

          {/* Heatmap Visualization */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Heatmap Visualization</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Both the Demand and Saturation map layers use <strong>quantile breaks</strong> (equal-frequency binning)
              to assign colors. This means each color band contains approximately the same number of ZIP codes,
              making it easier to identify relative rankings.
            </p>
            <div className="flex gap-4 mb-4 flex-wrap">
              <div>
                <p className="text-xs text-gray-500 mb-2">Demand (Purple)</p>
                <div className="flex gap-1">
                  {['#f3e5f5', '#ce93d8', '#ab47bc', '#8e24aa', '#6a1b9a', '#4a148c'].map((color, i) => (
                    <div key={i} className="w-6 h-6 rounded" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Low → High</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Demand/Provider (Green)</p>
                <div className="flex gap-1">
                  {['#e8f5e9', '#a5d6a7', '#66bb6a', '#43a047', '#2e7d32', '#1b5e20'].map((color, i) => (
                    <div key={i} className="w-6 h-6 rounded" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Low → High</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Opportunity (Matches Gauge)</p>
                <div className="flex gap-1">
                  {['#f5f5f5', '#ffcdd2', '#ef5350', '#c62828', '#b71c1c'].map((color, i) => (
                    <div key={i} className="w-6 h-6 rounded" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Low → High</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Opportunity Mode:</strong> When both Demand and Demand/Provider layers are enabled,
                the map displays a combined &quot;Business Opportunity&quot; score using the same geometric mean formula
                as the dashboard gauge: √(Demand_pctile × Saturation_pctile). Hot colors (red/orange) indicate high
                opportunity areas—places with both high demand AND high demand per existing provider.
              </p>
            </div>
          </section>

          {/* Persona Breakdown */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Persona Breakdown</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Customer personas represent different service preference segments based on typical
              purchasing behavior and service requirements:
            </p>
            <div className="space-y-3">
              <div className="flex justify-between items-start border-l-4 border-teal-600 pl-3">
                <div>
                  <p className="font-medium text-gray-900">Full Service</p>
                  <p className="text-sm text-gray-600">Complete outdoor care including design, installation, and ongoing maintenance</p>
                </div>
              </div>
              <div className="flex justify-between items-start border-l-4 border-teal-400 pl-3">
                <div>
                  <p className="font-medium text-gray-900">Maintenance + Lawncare</p>
                  <p className="text-sm text-gray-600">Regular maintenance services plus lawn care (mowing, fertilization, etc.)</p>
                </div>
              </div>
              <div className="flex justify-between items-start border-l-4 border-teal-300 pl-3">
                <div>
                  <p className="font-medium text-gray-900">Maintenance Only</p>
                  <p className="text-sm text-gray-600">Basic maintenance services without specialized lawn care</p>
                </div>
              </div>
              <div className="flex justify-between items-start border-l-4 border-teal-200 pl-3">
                <div>
                  <p className="font-medium text-gray-900">Minimal</p>
                  <p className="text-sm text-gray-600">Occasional or seasonal services only</p>
                </div>
              </div>
              <div className="flex justify-between items-start border-l-4 border-teal-100 pl-3">
                <div>
                  <p className="font-medium text-gray-900">Install Only</p>
                  <p className="text-sm text-gray-600">One-time installation projects without ongoing service contracts</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-600">
                <strong>Multi-ZIP Selection:</strong> Percentages are weighted by demand—areas with higher
                demand contribute proportionally more to the aggregate persona distribution.
              </p>
            </div>

            {/* Persona Color Coding */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Benchmark Color Coding</p>
              <p className="text-sm text-gray-600 mb-4">
                When you select specific areas, each persona row is color-coded based on how it compares
                to the national average. The threshold is <strong>±2 percentage points</strong>.
              </p>

              {/* Premium vs Low-Value explanation */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">Premium Personas</div>
                  <div className="p-3 space-y-1 text-xs text-gray-600">
                    <p>• Full Service</p>
                    <p>• Maint + Lawncare</p>
                    <p>• Maintenance Only</p>
                    <p className="pt-2 italic text-gray-500">Higher % = Better (more high-value customers)</p>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700">Low-Value Personas</div>
                  <div className="p-3 space-y-1 text-xs text-gray-600">
                    <p>• Minimal</p>
                    <p>• Install Only</p>
                    <p className="pt-2 italic text-gray-500">Lower % = Better (fewer low-value customers)</p>
                  </div>
                </div>
              </div>

              {/* Color legend with examples */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="w-6 h-6 rounded bg-green-100 border border-green-300 flex-shrink-0 mt-0.5"></div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Favorable (Green)</p>
                    <p className="text-xs text-green-700 mt-1">
                      Premium personas <strong>&gt;2pp above</strong> national avg, OR<br/>
                      Low-value personas <strong>&gt;2pp below</strong> national avg
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="w-6 h-6 rounded bg-yellow-100 border border-yellow-300 flex-shrink-0 mt-0.5"></div>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Average (Yellow)</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Within ±2 percentage points of national average
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="w-6 h-6 rounded bg-red-100 border border-red-300 flex-shrink-0 mt-0.5"></div>
                  <div>
                    <p className="text-sm font-medium text-red-800">Less Favorable (Red)</p>
                    <p className="text-xs text-red-700 mt-1">
                      Premium personas <strong>&gt;2pp below</strong> national avg, OR<br/>
                      Low-value personas <strong>&gt;2pp above</strong> national avg
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-gray-700">
                  <strong>Why inverted for low-value?</strong> For Minimal and Install Only personas, having <em>fewer</em>
                  of these customers is favorable because they represent lower lifetime value and less recurring revenue potential.
                </p>
              </div>
            </div>
          </section>

          {/* Sociodemographics */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Sociodemographics</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Consumer behavior taxonomies based on purchasing patterns and price sensitivity:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border-l-4 border-green-500 rounded-lg p-3 shadow-sm">
                <p className="font-medium text-gray-900 text-sm">Brand Loyal</p>
                <p className="text-xs text-gray-600">Prefer established brands, less price-sensitive</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Premium segment</p>
              </div>
              <div className="bg-white border-l-4 border-amber-500 rounded-lg p-3 shadow-sm">
                <p className="font-medium text-gray-900 text-sm">Coupon Clippers</p>
                <p className="text-xs text-gray-600">Actively seek deals and promotions</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Deal-seeking</p>
              </div>
              <div className="bg-white border-l-4 border-red-500 rounded-lg p-3 shadow-sm">
                <p className="font-medium text-gray-900 text-sm">Price Buyers</p>
                <p className="text-xs text-gray-600">Primary decision factor is lowest price</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Budget-focused</p>
              </div>
              <div className="bg-white border-l-4 border-green-500 rounded-lg p-3 shadow-sm">
                <p className="font-medium text-gray-900 text-sm">Quality Buyers</p>
                <p className="text-xs text-gray-600">Prioritize quality over cost</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Premium segment</p>
              </div>
              <div className="bg-white border-l-4 border-amber-500 rounded-lg p-3 shadow-sm">
                <p className="font-medium text-gray-900 text-sm">Savers</p>
                <p className="text-xs text-gray-600">Budget-conscious, value-oriented</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Value-seeking</p>
              </div>
              <div className="bg-white border-l-4 border-green-500 rounded-lg p-3 shadow-sm">
                <p className="font-medium text-gray-900 text-sm">Spenders</p>
                <p className="text-xs text-gray-600">Higher disposable income, premium services</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Premium segment</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
              <p className="text-xs text-gray-700">
                <strong>Interpretation:</strong> Markets with higher concentrations of Brand Loyal, Quality Buyers, and Spenders tend to support premium service offerings with higher margins. Markets with more Coupon Clippers and Savers may require promotional strategies, while Price Buyers typically drive commoditized competition.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-600">
                <strong>Multi-ZIP Selection:</strong> Percentages are <em>population-weighted</em> averages
                across all selected areas—ZIP codes with larger populations contribute proportionally more
                to the aggregate distribution.
              </p>
            </div>
          </section>

          {/* Data Sources */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Data Sources</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              This analysis integrates multiple data sources to provide comprehensive market insights:
            </p>
            <div className="space-y-4">
              <div className="border-l-4 border-gray-400 pl-4">
                <p className="font-medium text-gray-900">Market Demand Data</p>
                <p className="text-sm text-gray-600">
                  Proprietary outdoor services demand estimates at the ZIP code level, derived from
                  household spending patterns, property characteristics, and market research.
                </p>
              </div>
              <div className="border-l-4 border-gray-400 pl-4">
                <p className="font-medium text-gray-900">Provider Database</p>
                <p className="text-sm text-gray-600">
                  Comprehensive database of outdoor service providers including landscape architects,
                  irrigation specialists, lawn care companies, and maintenance services. Providers are
                  geocoded by business address.
                </p>
              </div>
              <div className="border-l-4 border-gray-400 pl-4">
                <p className="font-medium text-gray-900">Population Demographics</p>
                <p className="text-sm text-gray-600">
                  U.S. Census Bureau American Community Survey (ACS) 2023 population estimates at the
                  ZIP Code Tabulation Area (ZCTA) level.
                </p>
              </div>
              <div className="border-l-4 border-gray-400 pl-4">
                <p className="font-medium text-gray-900">Consumer Taxonomies</p>
                <p className="text-sm text-gray-600">
                  Consumer behavior classifications (Brand Loyal, Coupon Clippers, Price Buyers,
                  Quality Buyers, Savers, Spenders) derived from purchasing behavior analytics and
                  demographic modeling.
                </p>
              </div>
              <div className="border-l-4 border-gray-400 pl-4">
                <p className="font-medium text-gray-900">Geographic Boundaries</p>
                <p className="text-sm text-gray-600">
                  ZIP Code boundary polygons from the U.S. Census Bureau TIGER/Line Shapefiles,
                  rendered as vector tiles for interactive map visualization.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-600">
                <strong>Data Currency:</strong> Demand estimates and provider data are updated periodically.
                Population data reflects the most recent ACS 5-year estimates (2023).
              </p>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Quick keyboard controls for efficient navigation:
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <kbd className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-md text-sm font-mono font-medium text-gray-700">Shift + Click</kbd>
                <span className="text-gray-600">Multi-select ZIPs on the map</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-md text-sm font-mono font-medium text-gray-700">Esc</kbd>
                <span className="text-gray-600">Reset map view to US overview</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-md text-sm font-mono font-medium text-gray-700">R</kbd>
                <span className="text-gray-600">Clear all ZIP and MSA selections</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-md text-sm font-mono font-medium text-gray-700">C</kbd>
                <span className="text-gray-600">Clear all map layers (turn off heatmaps)</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Map
          </Link>
        </div>
      </div>
    </main>
  );
}
