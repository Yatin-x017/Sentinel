import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer.jsx'
import { StepIndicator } from '../components/scan/StepIndicator.jsx'
import { DemoNotice } from '../components/scan/DemoNotice.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { InlineAlert } from '../components/ui/InlineAlert.jsx'
import { Button } from '../components/ui/Button.jsx'
import { confirmVerification, resendVerification } from '../services/scanApi.js'
import { messageFor } from '../services/errors.js'

export default function VerifyEmailPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(state?.resendAfterSeconds ?? 30)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  if (!state?.verificationId) return <Navigate to="/check" replace />

  async function submit(e) {
    e.preventDefault()
    if (code.length !== 6) return setError('Enter all six digits from the email.')
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      const { scanId } = await confirmVerification({ verificationId: state.verificationId, code })
      navigate(`/scan/${scanId}`, { replace: true })
    } catch (err) {
      setError(messageFor(err))
      setBusy(false)
    }
  }

  async function resend() {
    setResending(true)
    setError(null)
    try {
      const res = await resendVerification(state.verificationId)
      setCooldown(res.resendAfterSeconds ?? 30)
      setNotice('A new code is on its way. Use the newest email.')
    } catch (err) {
      setError(messageFor(err))
    }
    setResending(false)
  }

  return (
    <PageContainer width="narrow" className="py-12 md:py-16">
      <StepIndicator current={2} />
      <h1 className="mt-8 text-[clamp(2.25rem,5vw,3rem)] font-semibold leading-[1.1]">Check your inbox.</h1>
      <p className="mt-3 text-ink-muted">
        We sent a six-digit code to <span className="font-mono text-[0.9em] font-medium text-ink">{state.maskedEmail}</span>. It confirms you control this address.
      </p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        {notice && <InlineAlert tone="success">{notice}</InlineAlert>}
        <TextField
          label="6-digit code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*"
          value={code} error={error} inputClassName="font-mono text-2xl tracking-[0.4em]"
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <Button type="submit" block loading={busy} className="min-h-14">{busy ? 'Verifying' : 'Verify email'}</Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Button variant="secondary" onClick={resend} loading={resending} disabled={cooldown > 0}>Send a new code</Button>
        <p className="text-sm text-ink-subtle" aria-live="off">{cooldown > 0 ? `You can ask for another code in ${cooldown}s.` : 'Can’t find it? Check spam, then send a new code.'}</p>
      </div>
      <Button to="/check" variant="quiet" className="mt-2 -ml-5">Use a different address</Button>
      <DemoNotice className="mt-8" />
    </PageContainer>
  )
}
