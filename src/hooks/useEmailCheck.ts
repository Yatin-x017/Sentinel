import { useCallback, useEffect, useRef, useState } from "react"
import { checkEmail, CheckError, isEmail, type SourceResult } from "../lib/api"

export type CheckState =
  { kind: "idle" } | { kind: "loading" } | { kind: "done"; sources: SourceResult[] } | { kind: "error"; message: string }

export function useEmailCheck() {
  const [state, setState] = useState<CheckState>({ kind: "idle" })
  const abort = useRef<AbortController | null>(null)

  // Cancel an in-flight request when the page goes away.
  useEffect(() => () => abort.current?.abort(), [])

  const run = useCallback(async (raw: string) => {
    const email = raw.trim()
    if (!isEmail(email)) {
      setState({ kind: "error", message: "That doesn't look like an email address. Check it and try again." })
      return
    }
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setState({ kind: "loading" })
    try {
      setState({ kind: "done", sources: await checkEmail(email, ctrl.signal) })
    } catch (err) {
      if (ctrl.signal.aborted) return
      setState({ kind: "error", message: err instanceof CheckError ? err.message : "Something went wrong. Try again." })
    }
  }, [])

  return { state, run }
}
