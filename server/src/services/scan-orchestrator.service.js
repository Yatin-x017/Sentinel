import { primaryMockAdapter, secondaryMockAdapter } from '../adapters/mock-source.adapter.js';
import SourceRegistry from '../models/SourceRegistry.js';
import { generateActionPlan } from './recommendation.service.js';

const ADAPTER_MAP = new Map(
  [primaryMockAdapter, secondaryMockAdapter].map((adapter) => [adapter.sourceId, adapter])
);
const DEFAULT_ADAPTER_TIMEOUT_MS = 6000;

function normalizeFinding(raw) {
  return {
    sourceId: raw.sourceId || 'unknown_source',
    incidentId: raw.incidentId || `${raw.sourceId}_${raw.breachName || 'incident'}`.toLowerCase(),
    identifierType: 'email',
    matchType: 'exact',
    exposedFields: Array.isArray(raw.exposedFields) ? raw.exposedFields : ['email'],
    breachDate: raw.breachDate || null,
    retrievedAt: new Date().toISOString(),
    confidence: 'high',
    evidenceReference: raw.referenceUrl || 'Verified source record'
  };
}

function deduplicateFindings(findings) {
  const map = new Map();
  for (const item of findings) {
    const key = `${item.incidentId}_${item.breachDate || 'unknown'}`;
    if (map.has(key)) {
      const existing = map.get(key);
      existing.exposedFields = Array.from(new Set([...existing.exposedFields, ...item.exposedFields]));
      existing.evidenceReference = `${existing.evidenceReference}, ${item.evidenceReference}`;
    } else {
      map.set(key, { ...item });
    }
  }
  return Array.from(map.values());
}

export async function runScanPipeline(normalizedEmail) {
  const enabledSources = await SourceRegistry.find({ enabled: true }).lean();
  const sourcesToRun = enabledSources
    .map((config) => ({ config, adapter: ADAPTER_MAP.get(config.sourceId) }))
    .filter((entry) => Boolean(entry.adapter));

  if (sourcesToRun.length === 0) {
    return { status: 'failed', sourcesStatus: [], findings: [], actions: [] };
  }

  const sourcesStatus = [];
  const rawFindings = [];

  await Promise.allSettled(
    sourcesToRun.map(async ({ config, adapter }) => {
      const start = Date.now();
      const timeoutMs = Number(config.timeoutMs) > 0 ? Number(config.timeoutMs) : DEFAULT_ADAPTER_TIMEOUT_MS;
      const sourceName = config.name || adapter.sourceName;
      let timeoutId;
      try {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Provider timeout')), timeoutMs);
        });
        const result = await Promise.race([
          adapter.checkExposure(normalizedEmail),
          timeoutPromise
        ]);

        sourcesStatus.push({
          sourceId: adapter.sourceId,
          sourceName,
          status: 'success',
          latencyMs: Date.now() - start
        });
        rawFindings.push(...(result.findings || []));
      } catch (err) {
        sourcesStatus.push({
          sourceId: adapter.sourceId,
          sourceName,
          status: err.message === 'Provider timeout' ? 'timeout' : 'failed',
          latencyMs: Date.now() - start,
          error: err.message
        });
      } finally {
        clearTimeout(timeoutId);
      }
    })
  );

  const anyFailed = sourcesStatus.some((s) => s.status !== 'success');
  const allFailed = sourcesStatus.every((s) => s.status !== 'success');

  let status = 'completed';
  if (allFailed) status = 'failed';
  else if (anyFailed) status = 'partial';

  const normalized = rawFindings.map(normalizeFinding);
  const findings = deduplicateFindings(normalized);
  const actions = generateActionPlan(findings);

  return { status, sourcesStatus, findings, actions };
}