import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer.jsx'
import { StepIndicator } from '../components/scan/StepIndicator.jsx'
import { DemoNotice } from '../components/scan/DemoNotice.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { InlineAlert } from '../components/ui/InlineAlert.jsx'
import { Button } from '../components/ui/Button.jsx'
import { startVerification } from '../services/scanApi.js'
import { messageFor } from '../services/errors.js'
import { validateEmail } from '../lib/format.js'

export default function CheckEmailPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [serviceError, setServiceError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const problem = validateEmail(email)
    setFieldError(problem)
    setServiceError(null)
    if (problem) return
    setBusy(true)
    try {
      const res = await startVerification(email.trim())
      navigate('/verify', { state: res })
    } catch (err) {
      setServiceError(messageFor(err))
      setBusy(false)
    }
  }

  return (
    <PageContainer width="narrow" className="py-12 md:py-16">
      <StepIndicator current={1} />
      <h1 className="mt-8 text-[clamp(2.25rem,5vw,3rem)] font-semibold leading-[1.1]">Start with an email address.</h1>
      <p className="mt-3 text-ink-muted">Use an inbox you can open. We will ask you to confirm that you control it.</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        {serviceError && <InlineAlert tone="error" title="We could not send a code">{serviceError}</InlineAlert>}
        <TextField
          label="Email address" type="email" name="email" autoComplete="email" inputMode="email"
          placeholder="you@example.com" value={email} error={fieldError}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email && setFieldError(validateEmail(email))}
        />
        <Button type="submit" block loading={busy} className="min-h-14">{busy ? 'Sending code' : 'Continue'}</Button>
        <p className="text-sm text-ink-subtle">Only check an address you control.</p>
      </form>
      <DemoNotice className="mt-8" />
    </PageContainer>
  )
}
