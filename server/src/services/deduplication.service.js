// server/src/services/deduplication.service.js
export function deduplicateFindings(findings) {
  const incidentMap = new Map();

  for (const finding of findings) {
    // Deterministic composite key: incidentId + breachDate
    const dedupeKey = `${finding.incidentId}_${finding.breachDate || 'unknown'}`;

    if (incidentMap.has(dedupeKey)) {
      const existing = incidentMap.get(dedupeKey);
      
      // Merge exposed fields uniquely
      const mergedFields = Array.from(new Set([...existing.exposedFields, ...finding.exposedFields]));
      existing.exposedFields = mergedFields;
      
      // Keep track of secondary source evidence
      existing.evidenceReference = `${existing.evidenceReference}, ${finding.sourceId}`;
    } else {
      // Clone finding into map
      incidentMap.set(dedupeKey, { ...finding });
    }
  }

  return Array.from(incidentMap.values());
}