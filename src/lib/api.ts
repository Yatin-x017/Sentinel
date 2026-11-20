export interface SourceResult {
  name: string
  found: boolean
  detail?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const isEmail = (value: string) => EMAIL_RE.test(value)

export class CheckError extends Error {}

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "")

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new CheckError("Couldn't reach Sentinel. Check that the local API is running.")
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = (payload as { message?: string }).message
    throw new CheckError(message || "The request could not be completed. Try again.")
  }
  return payload as T
}

export async function beginVerification(email: string) {
  return request<{ verificationId: string }>("/api/v1/verifications", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function confirmVerification(verificationId: string, email: string, otp: string) {
  return request<{ sessionToken: string }>(`/api/v1/verifications/${verificationId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  })
}

interface ScanPayload {
  scanId: string
  status: string
  sourcesStatus: Array<{ sourceId: string; sourceName: string; status: string }>
  findings?: Array<{ sourceId: string; exposedFields: string[] }>
}

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export async function runVerifiedScan(email: string, verificationId: string, sessionToken: string) {
  const started = await request<{ scanId: string }>("/api/v1/scans", {
    method: "POST",
    body: JSON.stringify({ email, verificationId, sessionToken }),
  })

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const status = await request<ScanPayload>(`/api/v1/scans/${started.scanId}`)
    if (["completed", "partial", "failed", "cancelled"].includes(status.status)) {
      if (status.status === "failed") throw new CheckError("The source checks are unavailable right now.")
      const result = await request<ScanPayload>(`/api/v1/scans/${started.scanId}/findings`)
      const findings = result.findings || []
      return status.sourcesStatus.map((source) => {
        const matches = findings.filter((finding) => finding.sourceId === source.sourceId)
        const fields = [...new Set(matches.flatMap((finding) => finding.exposedFields || []))]
        return {
          name: source.sourceName,
          found: matches.length > 0,
          ...(source.status !== "success"
            ? { detail: "This source could not be reached." }
            : fields.length > 0
              ? { detail: `Reported fields: ${fields.join(", ")}` }
              : {}),
        }
      })
    }
    await delay(350)
  }
  throw new CheckError("The scan is taking longer than expected. Please try again.")
}
