/**
 * Deterministic mock breach-source adapters for demo mode and automated tests.
 * Uses synthetic placeholder records only — never real breach data.
 */

const DEFAULT_ADAPTER_TIMEOUT_STALL_MS = 7000

function sleep(ms, { unref = false } = {}) {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    if (unref && typeof timer.unref === 'function') timer.unref()
  })
}

function resolveScenario(email) {
  const value = String(email || '').trim().toLowerCase()
  if (!value) return 'nomatch'
  if (value.includes('fail')) return 'fail'
  if (value.includes('timeout')) return 'timeout'
  if (value.includes('partial')) return 'partial'
  if (value.includes('nomatch') || value.includes('clean')) return 'nomatch'
  return 'match'
}

function cloneFindings(findings) {
  return findings.map((item) => ({
    ...item,
    exposedFields: [...item.exposedFields],
  }))
}

/** Deterministic source adapter implementing the orchestrator's checkExposure interface. */
export class MockSourceAdapter {
  constructor({ sourceId, sourceName, delayMs = 200, scenarioHandlers = {} }) {
    this.sourceId = sourceId
    this.sourceName = sourceName
    this.delayMs = process.env.NODE_ENV === 'test' ? 0 : delayMs
    this.scenarioHandlers = scenarioHandlers
  }

  /** Queries deterministic fixtures according to the normalized email scenario. */
  async checkExposure(normalizedEmail) {
    const scenario = resolveScenario(normalizedEmail)
    const handler = this.scenarioHandlers[scenario]

    if (!handler) {
      await sleep(this.delayMs)
      return { findings: [] }
    }

    if (handler.stallMs) {
      await sleep(handler.stallMs, { unref: true })
      return { findings: [] }
    }

    await sleep(this.delayMs)

    if (handler.error) {
      throw new Error(handler.error)
    }

    return { findings: cloneFindings(handler.findings || []) }
  }
}

const PRIMARY_FINDING = {
  sourceId: 'sentinel_verified_feed_01',
  incidentId: 'inc_synthetic_retail_2023',
  breachName: 'Synthetic Retail Portal',
  breachDate: '2023-04-15',
  exposedFields: ['email', 'username', 'password_hash'],
  referenceUrl: 'SYNTHETIC-FEED-01/INC-2023-0415',
}

const SECONDARY_OVERLAPPING_FINDING = {
  sourceId: 'sentinel_archive_feed_02',
  incidentId: 'inc_synthetic_retail_2023',
  breachName: 'Synthetic Retail Portal',
  breachDate: '2023-04-15',
  exposedFields: ['email', 'phone_number'],
  referenceUrl: 'SYNTHETIC-FEED-02/INC-2023-0415',
}

const SECONDARY_DISTINCT_FINDING = {
  sourceId: 'sentinel_archive_feed_02',
  incidentId: 'inc_synthetic_newsletter_2024',
  breachName: 'Synthetic Newsletter Export',
  breachDate: '2024-06-07',
  exposedFields: ['email', 'ip_address'],
  referenceUrl: 'SYNTHETIC-FEED-02/INC-2024-0607',
}

export const primaryMockAdapter = new MockSourceAdapter({
  sourceId: 'sentinel_verified_feed_01',
  sourceName: 'Primary Breach Metadata Feed',
  delayMs: 200,
  scenarioHandlers: {
    match: { findings: [PRIMARY_FINDING] },
    partial: { findings: [PRIMARY_FINDING] },
    timeout: { findings: [PRIMARY_FINDING] },
    nomatch: { findings: [] },
    fail: { error: 'Primary breach metadata feed unavailable' },
  },
})

export const secondaryMockAdapter = new MockSourceAdapter({
  sourceId: 'sentinel_archive_feed_02',
  sourceName: 'Secondary Archive Index',
  delayMs: 350,
  scenarioHandlers: {
    match: { findings: [SECONDARY_OVERLAPPING_FINDING, SECONDARY_DISTINCT_FINDING] },
    partial: { error: 'Secondary archive index unavailable' },
    timeout: { stallMs: DEFAULT_ADAPTER_TIMEOUT_STALL_MS },
    nomatch: { findings: [] },
    fail: { error: 'Secondary archive index unavailable' },
  },
})
