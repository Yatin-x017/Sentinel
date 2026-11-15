const dateTime = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })
const monthYear = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' })

export function formatDateTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : dateTime.format(d)
}

/** Accepts "YYYY-MM" or a full ISO date. Returns null when the source gave no date. */
export function formatReported(value) {
  if (!value) return null
  const d = new Date(value.length === 7 ? `${value}-01T00:00:00` : value)
  return Number.isNaN(d.getTime()) ? null : monthYear.format(d)
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function validateEmail(value) {
  const v = value.trim()
  if (!v) return 'Enter the email address you want to check.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter an email address like you@example.com.'
  return null
}
