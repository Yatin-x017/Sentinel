import { useCallback, useState } from "react"
import { beginVerification, CheckError, confirmVerification, isEmail, runVerifiedScan, type SourceResult } from "../lib/api"

export type CheckState =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "code"; verificationId: string; email: string }
  | { kind: "done"; sources: SourceResult[] }
  | { kind: "error"; message: string; verificationId?: string; email?: string }

export function useEmailCheck() {
  const [state, setState] = useState<CheckState>({ kind: "idle" })

  const run = useCallback(async (raw: string) => {
    const email = raw.trim()
    if (!isEmail(email)) {
      setState({ kind: "error", message: "That doesn't look like an email address. Check it and try again." })
      return
    }
    setState({ kind: "loading", message: "Sending a verification code…" })
    try {
      const { verificationId } = await beginVerification(email)
      setState({ kind: "code", verificationId, email })
    } catch (error) {
      setState({ kind: "error", message: error instanceof CheckError ? error.message : "Something went wrong. Try again." })
    }
  }, [])

  const verify = useCallback(
    async (otp: string) => {
      if (state.kind !== "code" && !(state.kind === "error" && state.verificationId && state.email)) return
      const challenge = state.kind === "code" ? state : { verificationId: state.verificationId as string, email: state.email as string }
      setState({ kind: "loading", message: "Verifying your address and checking sources…" })
      try {
        const { sessionToken } = await confirmVerification(challenge.verificationId, challenge.email, otp.trim())
        const sources = await runVerifiedScan(challenge.email, challenge.verificationId, sessionToken)
        setState({ kind: "done", sources })
      } catch (error) {
        setState({
          kind: "error",
          message: error instanceof CheckError ? error.message : "Something went wrong. Try again.",
          verificationId: challenge.verificationId,
          email: challenge.email,
        })
      }
    },
    [state],
  )

  return { state, run, verify }
}
