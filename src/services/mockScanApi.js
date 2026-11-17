import { ApiError } from './errors.js'
import { FINDINGS, SCENARIOS, SOURCES, scenarioFor } from './fixtures.js'

/* In-memory demo backend. Lives only for this page session. */
const verifications = new Map()
const scans = new Map()
const DEMO_CODE = '123456'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const id = (p) => `${p}_${Math.random().toString(36).slice(2, 10)}`

export function maskEmail(email) {
  const [local, domain] = email.trim().split('@')
  return `${local.slice(0, 2)}••••@${domain}`
}

export const demoHint = {
  code: DEMO_CODE,
  text: `Demo mode — no email is sent. Use the code ${DEMO_CODE}. Put “nomatch”, “partial” or “fail” in the address to preview other results.`,
}

export async function startVerification(email) {
  await sleep(500)
  const verificationId = id('ver')
  verifications.set(verificationId, { email, attempts: 0 })
  return { verificationId, maskedEmail: maskEmail(email), resendAfterSeconds: 30 }
}

export async function resendVerification(verificationId) {
  await sleep(400)
  if (!verifications.has(verificationId)) throw new ApiError('expired_code')
  return { resendAfterSeconds: 30 }
}

export async function confirmVerification({ verificationId, code }) {
  await sleep(500)
  const v = verifications.get(verificationId)
  if (!v) throw new ApiError('expired_code')
  if (v.attempts >= 5) throw new ApiError('rate_limited')
  if (code !== DEMO_CODE) {
    v.attempts += 1
    throw new ApiError('incorrect_code')
  }
  verifications.delete(verificationId)
  return { scanId: createScan(v.email) }
}

function createScan(email, scenario = scenarioFor(email)) {
  const scanId = id('scn')
  const plan = SOURCES.map((s, i) => ({
    ...s,
    ...SCENARIOS[scenario][s.id],
    checkingAt: 700 + i * 1100,
    doneAt: 2600 + i * 1800,
  }))
  scans.set(scanId, { scanId, email, scenario, plan, startedAt: Date.now(), cancelledAt: null })
  return scanId
}

export async function getScan(scanId) {
  await sleep(120)
  const rec = scans.get(scanId)
  if (!rec) throw new ApiError('not_found')
  const t = Date.now() - rec.startedAt

  const sources = rec.plan.map((p) => {
    let state = 'waiting'
    if (t >= p.checkingAt) state = 'checking'
    if (t >= p.doneAt) state = p.outcome === 'ok' ? 'complete' : 'unavailable'
    const finished = state === 'complete' || state === 'unavailable'
    return {
      id: p.id,
      name: p.name,
      reference: p.reference,
      state,
      checkedAt: finished ? new Date(rec.startedAt + p.doneAt).toISOString() : null,
      note: state === 'unavailable' ? 'This source could not be reached.' : null,
    }
  })

  const running = sources.some((s) => s.state === 'waiting' || s.state === 'checking')
  const ok = sources.filter((s) => s.state === 'complete').length
  let status = 'running'
  if (rec.cancelledAt) status = 'cancelled'
  else if (!running) status = ok === sources.length ? 'complete' : ok === 0 ? 'failed' : 'partial'

  const finished = !running && !rec.cancelledAt
  const findings = finished
    ? rec.plan
        .filter((p) => p.outcome === 'ok' && p.finding)
        .map((p) => ({ ...FINDINGS[p.id], retrievedAt: new Date(rec.startedAt + p.doneAt).toISOString() }))
    : []

  return {
    id: rec.scanId,
    status,
    illustrative: true,
    maskedEmail: maskEmail(rec.email),
    completedAt: finished ? new Date(rec.startedAt + Math.max(...rec.plan.map((p) => p.doneAt))).toISOString() : null,
    retrySupported: status === 'partial' || status === 'failed',
    errorReference: status === 'failed' ? `SCN-${rec.scanId.slice(-6).toUpperCase()}` : null,
    sources,
    findings,
  }
}

export async function cancelScan(scanId) {
  const rec = scans.get(scanId)
  if (rec) rec.cancelledAt = Date.now()
}

/** Demo retry: the unavailable source answers the second time. */
export async function retryScan(scanId) {
  await sleep(300)
  const rec = scans.get(scanId)
  if (!rec) throw new ApiError('not_found')
  return { scanId: createScan(rec.email, 'match') }
}
