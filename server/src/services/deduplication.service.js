export function deduplicateFindings(findings) {
  const incidentMap = new Map()

  for (const finding of findings) {
    const dedupeKey = `${finding.incidentId}_${finding.breachDate || "unknown"}`

    if (incidentMap.has(dedupeKey)) {
      const existing = incidentMap.get(dedupeKey)

      const mergedFields = Array.from(new Set([...existing.exposedFields, ...finding.exposedFields]))
      existing.exposedFields = mergedFields

      existing.evidenceReference = `${existing.evidenceReference}, ${finding.evidenceReference}`
    } else {
      incidentMap.set(dedupeKey, { ...finding })
    }
  }

  return Array.from(incidentMap.values())
}
