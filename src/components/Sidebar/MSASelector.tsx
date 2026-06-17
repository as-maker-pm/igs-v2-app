'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { MSAInfo } from '@/types/data';
import { formatCurrency } from '@/lib/formatters';

interface MSASelectorProps {
  msaList: MSAInfo[];
  selectedMSAs: string[];
  onSelectionChange: (msas: string[]) => void;
}

export default function MSASelector({
  msaList,
  selectedMSAs,
  onSelectionChange,
}: MSASelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter MSAs based on search
  const filteredMSAs = useMemo(() => {
    if (!searchQuery.trim()) return msaList;
    const query = searchQuery.toLowerCase();
    return msaList.filter((msa) =>
      msa.cbsaName.toLowerCase().includes(query)
    );
  }, [msaList, searchQuery]);

  // Get selected MSA names for display
  const selectedMSANames = useMemo(() => {
    const msaMap = new Map(msaList.map((m) => [m.cbsaFips, m.cbsaName]));
    return selectedMSAs.map((fips) => ({
      fips,
      name: msaMap.get(fips) || fips,
    }));
  }, [msaList, selectedMSAs]);

  const handleToggleMSA = useCallback(
    (cbsaFips: string) => {
      if (selectedMSAs.includes(cbsaFips)) {
        onSelectionChange(selectedMSAs.filter((f) => f !== cbsaFips));
      } else {
        onSelectionChange([...selectedMSAs, cbsaFips]);
      }
    },
    [selectedMSAs, onSelectionChange]
  );

  const handleRemoveMSA = useCallback(
    (cbsaFips: string) => {
      onSelectionChange(selectedMSAs.filter((f) => f !== cbsaFips));
    },
    [selectedMSAs, onSelectionChange]
  );

  const handleClearAll = useCallback(() => {
    onSelectionChange([]);
    setSearchQuery('');
  }, [onSelectionChange]);

  return (
    <div className="relative" ref={containerRef}>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Market Area Filter</h3>

      {/* Dropdown trigger / search */}
      <div className="relative">
        <input
          type="text"
          placeholder={
            selectedMSAs.length === 0 ? 'National (All Markets)' : 'Search MSAs...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          type="button"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isOpen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
            />
          </svg>
        </button>
      </div>

      {/* Selected MSA tags */}
      {selectedMSAs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedMSANames.slice(0, 3).map(({ fips, name }) => (
            <span
              key={fips}
              className="inline-flex items-center bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded"
            >
              {name.split(',')[0]}
              <button
                onClick={() => handleRemoveMSA(fips)}
                className="ml-1 text-purple-400 hover:text-purple-600"
                type="button"
              >
                &times;
              </button>
            </span>
          ))}
          {selectedMSAs.length > 3 && (
            <span className="text-xs text-gray-500 px-1 py-1">
              +{selectedMSAs.length - 3} more
            </span>
          )}
          <button
            onClick={handleClearAll}
            className="text-xs text-red-600 hover:text-red-800 px-1 py-1"
            type="button"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Dropdown list */}
      {isOpen && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {filteredMSAs.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No MSAs found</div>
          ) : (
            filteredMSAs.map((msa) => (
              <label
                key={msa.cbsaFips}
                className="flex items-start px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedMSAs.includes(msa.cbsaFips)}
                  onChange={() => handleToggleMSA(msa.cbsaFips)}
                  className="w-4 h-4 mt-0.5 text-purple-600 rounded flex-shrink-0"
                />
                <div className="ml-2 min-w-0">
                  <div className="text-xs text-gray-800 truncate">{msa.cbsaName}</div>
                  <div className="text-[10px] text-gray-500">
                    {msa.zipCount} ZIPs | {formatCurrency(msa.totalDemand)}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
