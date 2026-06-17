import { ZipDataMap, MSAInfo } from '@/types/data';

/**
 * Extract unique MSA list from ZIP data, sorted by demand (largest first)
 */
export function extractMSAList(zipData: ZipDataMap): MSAInfo[] {
  const msaMap = new Map<string, MSAInfo>();

  Object.values(zipData).forEach((zip) => {
    if (!zip.cbsaFips || !zip.cbsaName) return;

    const existing = msaMap.get(zip.cbsaFips);
    if (existing) {
      existing.zipCount += 1;
      existing.totalDemand += zip.demand || 0;
    } else {
      msaMap.set(zip.cbsaFips, {
        cbsaFips: zip.cbsaFips,
        cbsaName: zip.cbsaName,
        zipCount: 1,
        totalDemand: zip.demand || 0,
      });
    }
  });

  // Sort by total demand (largest markets first)
  return Array.from(msaMap.values()).sort(
    (a, b) => b.totalDemand - a.totalDemand
  );
}

/**
 * Get all ZIP codes belonging to selected MSAs
 */
export function getZipsForMSAs(
  selectedMSAs: string[],
  zipData: ZipDataMap
): string[] {
  if (selectedMSAs.length === 0) return [];

  const msaSet = new Set(selectedMSAs);
  return Object.values(zipData)
    .filter((zip) => zip.cbsaFips && msaSet.has(zip.cbsaFips))
    .map((zip) => zip.zip);
}

/**
 * Compute effective selection (union of MSA ZIPs and manual ZIPs)
 */
export function computeEffectiveSelection(
  selectedMSAs: string[],
  selectedZips: string[],
  zipData: ZipDataMap
): string[] {
  const msaZips = getZipsForMSAs(selectedMSAs, zipData);
  const combined = new Set([...msaZips, ...selectedZips]);
  return Array.from(combined);
}
