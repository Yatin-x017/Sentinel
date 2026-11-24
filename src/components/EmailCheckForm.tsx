import { useId, useState } from "react"
import { SILK_ANCHOR } from "../lib/anchor"
import { useEmailCheck } from "../hooks/useEmailCheck"

export default function EmailCheckForm() {
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const { state, run, verify } = useEmailCheck()
  const emailId = useId()
  const otpId = useId()
  const hintId = useId()

  const loading = state.kind === "loading"
  const activeChallengeEmail =
    state.kind === "code" || (state.kind === "error" && state.verificationId) ? state.email : null
  const awaitingCode = Boolean(activeChallengeEmail && email.trim() === activeChallengeEmail)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (awaitingCode) {
      if (otp.length === 6) void verify(otp)
      return
    }
    if (email.trim()) {
      setOtp("")
      void run(email)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 max-w-xl" noValidate>
      <label htmlFor={emailId} className="mb-2 block text-base font-bold">
        Your email address
      </label>
      <div {...SILK_ANCHOR} className="node flex flex-col gap-3 rounded-2xl p-3 sm:flex-row">
        <input
          id={emailId}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={hintId}
          placeholder="name@example.com"
          className="min-h-14 flex-1 rounded-xl bg-silk px-4 text-lg text-deep placeholder:text-deep/55"
        />
        {awaitingCode && (
          <input
            id={otpId}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            aria-label="6-digit verification code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            className="min-h-14 rounded-xl bg-silk px-4 text-lg text-deep placeholder:text-deep/55 sm:w-44"
          />
        )}
        <button
          type="submit"
          disabled={loading || (awaitingCode && otp.length !== 6)}
          className="min-h-14 rounded-xl bg-flag px-6 text-lg font-bold text-deep transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {loading ? "Checking…" : awaitingCode ? "Verify & check" : "Check my email"}
        </button>
      </div>
      <p id={hintId} className="mt-3 text-base text-mist">
        {loading
          ? state.message
          : awaitingCode
            ? "Enter the 6-digit verification code sent to your inbox."
            : "Only breach and paste databases are searched."}
      </p>

      <div aria-live="polite" className="mt-4">
        {state.kind === "error" && (
          <p role="alert" className="rounded-xl border-2 border-flag px-4 py-3 text-base">
            {state.message}
          </p>
        )}
        {state.kind === "done" && (
          <ul className="space-y-2">
            {state.sources.map((s) => {
              const unavailable = s.detail === "This source could not be reached."
              return (
                <li key={s.name} className="rounded-xl border border-white/30 px-4 py-3 text-base">
                  <div className="flex items-baseline justify-between gap-4">
                    <span>{s.name}</span>
                    <span className={s.found || unavailable ? "font-bold text-flag" : "text-mist"}>
                      {unavailable ? "Unavailable" : s.found ? "Found" : "Not found"}
                    </span>
                  </div>
                  {s.detail && !unavailable && <p className="mt-1 text-sm text-mist">{s.detail}</p>}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </form>
  )
}
