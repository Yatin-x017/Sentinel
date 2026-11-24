export function normalizeFinding(rawFinding) {
  return {
    sourceId: rawFinding.sourceId || "unknown_source",
    incidentId: rawFinding.incidentId || generateIncidentId(rawFinding),
    identifierType: "email",
    matchType: "exact",
    exposedFields: Array.isArray(rawFinding.exposedFields) ? rawFinding.exposedFields : ["email"],
    breachDate: rawFinding.breachDate || null,
    retrievedAt: new Date().toISOString(),
    confidence: "high",
    evidenceReference: rawFinding.referenceUrl || "Verified source record",
  }
}

function generateIncidentId(finding) {
  const base = `${finding.sourceId}_${finding.breachName || "incident"}`
  return base.toLowerCase().replace(/[^a-z0-9_]/g, "_")
}
