export interface SourceResult {
  name: string
  found: boolean
  detail?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const isEmail = (v: string) => EMAIL_RE.test(v)

export class CheckError extends Error {}

/** POSTs the address to the Sentinel server and returns one result per source. */
export async function checkEmail(email: string, signal?: AbortSignal): Promise<SourceResult[]> {
  const base = import.meta.env.VITE_API_URL?.replace(/\/+$/, "")
  if (!base) throw new CheckError("The checker isn't connected yet. Set VITE_API_URL to the Sentinel server address.")

  let res: Response
  try {
    res = await fetch(`${base}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err
    throw new CheckError("Couldn't reach the server. Check your connection and try again.")
  }

  if (res.status === 429) throw new CheckError("Too many checks. Wait a minute and try again.")
  if (!res.ok) throw new CheckError("The check didn't finish. Try again in a moment.")

  const data: unknown = await res.json().catch(() => null)
  const sources = (data as { sources?: unknown } | null)?.sources
  if (!Array.isArray(sources)) throw new CheckError("The server sent back something unexpected.")
  return sources as SourceResult[]
}
