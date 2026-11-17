import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer.jsx'
import { StepIndicator } from '../components/scan/StepIndicator.jsx'
import { SourceRow } from '../components/scan/SourceRow.jsx'
import { DemoNotice } from '../components/scan/DemoNotice.jsx'
import { SignalTrace } from '../components/ui/SignalTrace.jsx'
import { InlineAlert } from '../components/ui/InlineAlert.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useScan } from '../hooks/useScan.js'
import { cancelScan } from '../services/scanApi.js'
import { messageFor } from '../services/errors.js'

export default function ScanProgressPage() {
  const { scanId } = useParams()
  const navigate = useNavigate()
  const { scan, error, loading } = useScan(scanId, { poll: true })
  const doneRef = useRef(null)

  const running = scan?.status === 'running'
  useEffect(() => { if (scan && !running) doneRef.current?.focus() }, [scan, running])

  if (error) {
    return (
      <PageContainer width="narrow" className="py-12">
        <EmptyState title="We could not load this check" action={<Button to="/check">Start a new check</Button>}>{messageFor(error)}</EmptyState>
      </PageContainer>
    )
  }

  const total = scan?.sources.length ?? 0
  const finished = scan?.sources.filter((s) => s.state === 'complete' || s.state === 'unavailable').length ?? 0
  const traceNodes = scan?.sources.map((s) => (s.state === 'complete' || s.state === 'unavailable' ? 'done' : s.state === 'checking' ? 'active' : 'idle')) ?? ['idle', 'idle']

  async function cancel() {
    await cancelScan(scanId).catch(() => {})
    navigate('/check')
  }

  return (
    <PageContainer width="narrow" className="py-12 md:py-16">
      <StepIndicator current={3} />
      <h1 className="mt-8 text-[clamp(2.25rem,5vw,3rem)] font-semibold leading-[1.1]">Checking approved sources.</h1>
      <p className="mt-3 text-ink-muted">We are comparing your verified email with the sources listed below.</p>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        {loading ? (
          <p className="py-6 text-ink-muted">Loading sources…</p>
        ) : (
          <>
            <SignalTrace nodes={traceNodes} className="mb-3 px-1" />
            <ul>{scan.sources.map((s) => <SourceRow key={s.id} source={s} />)}</ul>
          </>
        )}
      </div>

      {/* Polite live region: announces only when the real finished count changes. */}
      <p role="status" aria-live="polite" className="mt-4 text-sm text-ink-muted">
        {scan && (running ? `${finished} of ${total} sources finished.` : `All ${total} sources have finished.`)}
      </p>

      {scan && !running && (
        <div className="mt-6">
          <InlineAlert tone={scan.status === 'complete' ? 'success' : scan.status === 'cancelled' ? 'info' : 'warning'}
            title={scan.status === 'complete' ? 'The check is finished.' : scan.status === 'cancelled' ? 'This check was cancelled.' : 'The check finished, but not every source answered.'} />
          <Button ref={doneRef} to={`/results/${scanId}`} block className="mt-4 min-h-14" icon="arrow">View results</Button>
        </div>
      )}
      {running && <Button variant="secondary" onClick={cancel} className="mt-6">Cancel check</Button>}
      <DemoNotice className="mt-8">These sources and results are synthetic. Each step updates from simulated events, not a real scan.</DemoNotice>
    </PageContainer>
  )
}
