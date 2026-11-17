import { useId, useState } from "react"
import { SILK_ANCHOR } from "../lib/anchor"
import { useEmailCheck } from "../hooks/useEmailCheck"

export default function EmailCheckForm() {
  const [email, setEmail] = useState("")
  const { state, run } = useEmailCheck()
  const emailId = useId()
  const hintId = useId()
  const loading = state.kind === "loading"

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (email.trim()) void run(email)
      }}
      className="mt-10 max-w-xl"
      noValidate
    >
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
        <button
          type="submit"
          disabled={loading}
          className="min-h-14 rounded-xl bg-flag px-6 text-lg font-bold text-deep transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {loading ? "Checking…" : "Check my email"}
        </button>
      </div>
      <p id={hintId} className="mt-3 text-base text-mist">
        Only breach and paste databases are searched.
      </p>

      <div aria-live="polite" className="mt-4">
        {state.kind === "error" && (
          <p role="alert" className="rounded-xl border-2 border-flag px-4 py-3 text-base">
            {state.message}
          </p>
        )}
        {state.kind === "done" && (
          <ul className="space-y-2">
            {state.sources.map((s) => (
              <li key={s.name} className="flex items-baseline justify-between gap-4 rounded-xl border border-white/30 px-4 py-3 text-base">
                <span>{s.name}</span>
                <span className={s.found ? "font-bold text-flag" : "text-mist"}>{s.found ? "Found" : "Not found"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  )
}
