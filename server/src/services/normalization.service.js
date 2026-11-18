// server/src/services/normalization.service.js
export function normalizeFinding(rawFinding) {
  return {
    sourceId: rawFinding.sourceId || 'unknown_source',
    incidentId: rawFinding.incidentId || generateIncidentId(rawFinding),
    identifierType: 'email',
    matchType: 'exact', // V1 enforces exact verified email matching
    exposedFields: Array.isArray(rawFinding.exposedFields) ? rawFinding.exposedFields : ['email'],
    breachDate: rawFinding.breachDate || null,
    retrievedAt: new Date().toISOString(),
    confidence: 'high', // Exact match confidence rationale
    evidenceReference: rawFinding.referenceUrl || 'Verified source record'
  };
}

function generateIncidentId(finding) {
  const base = `${finding.sourceId}_${finding.breachName || 'incident'}`;
  return base.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}