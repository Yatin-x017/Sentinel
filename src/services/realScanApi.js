import { ApiError } from './errors.js'

/*
 * Real backend client. Expected contract (see README):
 *   POST /verification          { email }                    -> { verificationId, maskedEmail, resendAfterSeconds }
 *   POST /verification/resend   { verificationId }           -> { resendAfterSeconds }
 *   POST /verification/confirm  { verificationId, code }     -> { scanId }
 *   GET  /scans/:id                                          -> Scan (see README)
 *   POST /scans/:id/cancel
 *   POST /scans/:id/retry                                    -> { scanId }
 * Errors: non-2xx with { error: { code } }, where code is a key of ERROR_COPY.
 */
const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('network')
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(data?.error?.code || (res.status === 404 ? 'not_found' : res.status === 429 ? 'rate_limited' : 'unknown'))
  }
  return res.status === 204 ? null : res.json()
}

export const startVerification = (email) => request('/verification', { method: 'POST', body: { email } })
export const resendVerification = (verificationId) => request('/verification/resend', { method: 'POST', body: { verificationId } })
export const confirmVerification = ({ verificationId, code }) =>
  request('/verification/confirm', { method: 'POST', body: { verificationId, code } })
export const getScan = (scanId) => request(`/scans/${encodeURIComponent(scanId)}`)
export const cancelScan = (scanId) => request(`/scans/${encodeURIComponent(scanId)}/cancel`, { method: 'POST' })
export const retryScan = (scanId) => request(`/scans/${encodeURIComponent(scanId)}/retry`, { method: 'POST' })
export const demoHint = null
