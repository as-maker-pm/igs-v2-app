'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DataTablesPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  // Auth check on mount
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('igs-demo-authenticated') === 'true';
    if (!isAuthenticated) {
      router.replace('/login');
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  if (!authChecked) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Map</span>
          </Link>
        </div>
        <img src="/IGS-logo.svg" alt="IGS Logo" className="h-8" />
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Tables</h1>
        <p className="text-gray-600 mb-10">
          Download the underlying datasets used in the Market Demand & Saturation Analysis tool. Files are in CSV format for easy use in Excel, Google Sheets, or other spreadsheet applications.
        </p>

        <div className="space-y-8">
          {/* ZIP Market Data */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">ZIP Market Data</h2>
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">CSV</span>
                </div>
                <p className="text-gray-600">
                  Market demand, saturation, provider counts, consumer personas, and demographics for 34,439 ZIP codes across the United States.
                </p>
              </div>
            </div>

            {/* Column descriptions */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Columns Included:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <p className="text-gray-700"><span className="font-medium">zip</span> - 5-digit ZIP code</p>
                  <p className="text-gray-700"><span className="font-medium">placeName</span> - City/place name</p>
                  <p className="text-gray-700"><span className="font-medium">county, state</span> - Location</p>
                  <p className="text-gray-700"><span className="font-medium">cbsaFips, cbsaName</span> - Metro area</p>
                  <p className="text-gray-700"><span className="font-medium">demand</span> - Total market demand ($)</p>
                  <p className="text-gray-700"><span className="font-medium">demandPerProviderZip</span> - Demand per provider (saturation)</p>
                  <p className="text-gray-700"><span className="font-medium">providerCount</span> - Number of providers</p>
                  <p className="text-gray-700"><span className="font-medium">population</span> - Population estimate</p>
                  <p className="text-gray-700"><span className="font-medium">medianIncome</span> - Median household income</p>
                </div>
                <div>
                  <p className="text-gray-700"><span className="font-medium">demandPerCapita</span> - Demand per person</p>
                  <p className="text-gray-700"><span className="font-medium">providersPer10k</span> - Providers per 10k residents</p>
                  <p className="text-gray-700"><span className="font-medium">personas_*</span> - Service preference segments (5 types)</p>
                  <p className="text-gray-700"><span className="font-medium">taxonomies_*</span> - Consumer behavior segments (6 types)</p>
                  <p className="text-gray-700"><span className="font-medium">*Pctile</span> - Percentile rankings</p>
                  <p className="text-gray-700"><span className="font-medium">hasDemand</span> - Has demand data (true/false)</p>
                  <p className="text-gray-700"><span className="font-medium">hasProviders</span> - Has providers (true/false)</p>
                  <p className="text-gray-700"><span className="font-medium">hasPopulation</span> - Has population data</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <span className="font-medium">34,439 rows</span> &middot; 10 MB
              </div>
              <a
                href="/data/zip_data.csv"
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV
              </a>
            </div>
          </div>

          {/* Provider Locations */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">Provider Locations</h2>
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">CSV</span>
                </div>
                <p className="text-gray-600">
                  102,398 outdoor service provider locations with geographic coordinates and business details.
                </p>
              </div>
            </div>

            {/* Column descriptions */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Columns Included:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <p className="text-gray-700"><span className="font-medium">name</span> - Business name</p>
                  <p className="text-gray-700"><span className="font-medium">url</span> - Website URL</p>
                  <p className="text-gray-700"><span className="font-medium">address</span> - Full street address</p>
                  <p className="text-gray-700"><span className="font-medium">city</span> - City name</p>
                </div>
                <div>
                  <p className="text-gray-700"><span className="font-medium">state</span> - State abbreviation</p>
                  <p className="text-gray-700"><span className="font-medium">zip</span> - 5-digit ZIP code</p>
                  <p className="text-gray-700"><span className="font-medium">latitude, longitude</span> - GPS coordinates</p>
                  <p className="text-gray-700"><span className="font-medium">isTopCompetitor</span> - Top competitor flag</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <span className="font-medium">102,398 rows</span> &middot; 15 MB
              </div>
              <a
                href="/data/providers.csv"
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV
              </a>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-10 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> These files contain the complete datasets used for analysis.
            For methodology and calculation details, see the{' '}
            <Link href="/methodology" className="text-purple-600 hover:text-purple-800 underline">
              Methodology
            </Link>{' '}
            page.
          </p>
        </div>
      </div>
    </main>
  );
}
