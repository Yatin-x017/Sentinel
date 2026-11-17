/*
 * SYNTHETIC DEMO DATA — not real breach data.
 * Used only when VITE_USE_MOCK is not "false". Every screen that shows it labels it as an example.
 */
export const SOURCES = [
  { id: 'src-a', name: 'Sample Breach Index', reference: 'SRC-A' },
  { id: 'src-b', name: 'Sample Paste Archive', reference: 'SRC-B' },
]

export const FINDINGS = {
  'src-a': {
    id: 'fnd-1',
    sourceId: 'src-a',
    sourceName: 'Sample Breach Index',
    title: 'Sample Retail Forum',
    reference: 'INC-2022-0113',
    reportedDate: '2022-03',
    retrievedAt: null,
    fields: ['Email', 'Username', 'Password hash'],
    explanation:
      'A matching email address was reported in this record. A password hash — not the password itself — was also reported.',
    action: 'Change the password you used for this service, and anywhere else you reused it.',
    why: {
      matchBasis: 'Exact match on the email address you verified.',
      notes: 'Reported by the source. Sentinel has not confirmed the incident independently.',
      limitations:
        'The date is when the incident was reported, not when your account was last exposed. This does not show that anyone can currently access your account.',
    },
  },
  'src-b': {
    id: 'fnd-2',
    sourceId: 'src-b',
    sourceName: 'Sample Paste Archive',
    title: 'Sample Newsletter Export',
    reference: 'INC-2024-0607',
    reportedDate: '2024-06',
    retrievedAt: null,
    fields: ['Email', 'IP address'],
    explanation: 'A matching email address appeared in a list shared publicly. No password was reported.',
    action: 'Be careful with unexpected messages that mention this service.',
    why: {
      matchBasis: 'Exact match on the email address you verified.',
      notes: 'The list was reported by the source. Sentinel has not confirmed it independently.',
      limitations: 'Appearing in a list does not mean your account was accessed.',
    },
  },
}

/** What each demo scenario does. "ok" = source answered, "fail" = source unavailable. */
export const SCENARIOS = {
  match: { 'src-a': { outcome: 'ok', finding: true }, 'src-b': { outcome: 'ok', finding: true } },
  nomatch: { 'src-a': { outcome: 'ok' }, 'src-b': { outcome: 'ok' } },
  partial: { 'src-a': { outcome: 'ok', finding: true }, 'src-b': { outcome: 'fail' } },
  failed: { 'src-a': { outcome: 'fail' }, 'src-b': { outcome: 'fail' } },
}

export function scenarioFor(email) {
  const e = email.toLowerCase()
  if (e.includes('nomatch')) return 'nomatch'
  if (e.includes('partial')) return 'partial'
  if (e.includes('fail')) return 'failed'
  return 'match'
}
