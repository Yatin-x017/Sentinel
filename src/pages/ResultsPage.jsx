import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { PageContainer } from '../components/layout/PageContainer.jsx'
import { FindingCard } from '../components/scan/FindingCard.jsx'
import { SourceRow } from '../components/scan/SourceRow.jsx'
import { DemoNotice } from '../components/scan/DemoNotice.jsx'
import { InlineAlert } from '../components/ui/InlineAlert.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useScan } from '../hooks/useScan.js'
import { retryScan } from '../services/scanApi.js'
import { messageFor } from '../services/errors.js'
import { formatDateTime, plural } from '../lib/format.js'

const h1 = 'text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-[1.1]'

function Sources({ title, sources }) {
  if (!sources.length) return null
  return (
    <section className="mt-8" aria-label={title}>
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <ul className="mt-2 rounded-card border border-border bg-surface px-5">{sources.map((s) => <SourceRow key={s.id} source={s} />)}</ul>
    </section>
  )
}

export default function ResultsPage() {
  const { scanId } = useParams()
  const navigate = useNavigate()
  const { scan, error, loading } = useScan(scanId)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState(null)

  if (loading) return <PageContainer width="reading" className="py-16"><p className="text-ink-muted">Loading results…</p></PageContainer>
  if (error) return (
    <PageContainer width="narrow" className="py-12">
      <EmptyState title="We could not load these results" action={<Button to="/check">Start a new check</Button>}>{messageFor(error)}</EmptyState>
    </PageContainer>
  )
  if (scan.status === 'running') return <Navigate to={`/scan/${scanId}`} replace />

  const { status, sources, findings } = scan
  const done = sources.filter((s) => s.state === 'complete')
  const missed = sources.filter((s) => s.state === 'unavailable')
  const completedAt = formatDateTime(scan.completedAt)

  async function retry() {
    setRetrying(true)
    setRetryError(null)
    try {
      const { scanId: next } = await retryScan(scanId)
      navigate(`/scan/${next}`)
    } catch (e) {
      setRetryError(messageFor(e))
      setRetrying(false)
    }
  }

  const retryBlock = scan.retrySupported && (
    <div className="mt-6">
      {retryError && <InlineAlert tone="error" className="mb-3">{retryError}</InlineAlert>}
      <Button onClick={retry} loading={retrying}>Try the unavailable sources again</Button>
    </div>
  )

  let head
  if (status === 'cancelled') {
    head = (<><h1 className={h1}>This check was cancelled.</h1><p className="mt-3 text-ink-muted">No results were produced. Start a new check whenever you are ready.</p><Button to="/check" className="mt-6">Start a new check</Button></>)
  } else if (status === 'failed') {
    head = (
      <>
        <h1 className={h1}>This scan did not complete.</h1>
        <p className="mt-3 max-w-[60ch] text-ink-muted">None of the sources could be checked, so this is not a “no match” result. Nothing was found and nothing was ruled out.</p>
        {scan.errorReference && <p className="mt-3 text-sm text-ink-subtle">Error reference: <span className="font-mono">{scan.errorReference}</span></p>}
        {retryBlock}
        <Button to="/check" variant="secondary" className="mt-3">Start a new check</Button>
      </>
    )
  } else if (status === 'partial') {
    head = (
      <>
        <InlineAlert tone="warning" headingLevel="h1" title="Some sources could not be checked." className="[&_h1]:text-2xl">
          This result is incomplete. {plural(done.length, 'source')} answered and {plural(missed.length, 'source')} could not be reached.
        </InlineAlert>
        {retryBlock}
      </>
    )
  } else if (findings.length === 0) {
    head = (
      <>
        <h1 className={h1}>No matching records found in the sources checked.</h1>
        <p className="mt-3 max-w-[60ch] text-ink-muted">This scan did not find a matching record in the connected sources. It cannot confirm that your email has never appeared in another breach or source.</p>
      </>
    )
  } else {
    head = (<h1 className={h1}>Exposure found</h1>)
  }

  const showSummary = (status === 'complete' && findings.length > 0) || (status === 'partial' && findings.length > 0)

  return (
    <PageContainer width="reading" className="py-12 md:py-16">
      {status !== 'cancelled' && <p className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">Results for <span className="normal-case">{scan.maskedEmail}</span></p>}
      {head}

      {showSummary && (
        <p className="mt-4 text-ink-muted">
          {plural(findings.length, 'matching record')} in {plural(done.length, 'source')} checked.{completedAt && ` Scan finished ${completedAt}.`} Reported records can be old: this does not show your account is currently accessible to anyone.
        </p>
      )}
      {status === 'complete' && findings.length === 0 && completedAt && <p className="mt-3 text-sm text-ink-subtle">Scan finished {completedAt}.</p>}

      {findings.length > 0 && (
        <section className="mt-8 space-y-5" aria-label="Findings">
          {findings.map((f) => <FindingCard key={f.id} finding={f} example={scan.illustrative} />)}
        </section>
      )}

      {status === 'partial' ? (
        <>
          <Sources title="Checked" sources={done} />
          <Sources title="Could not be checked" sources={missed} />
        </>
      ) : status !== 'cancelled' && status !== 'failed' ? (
        <Sources title="Sources checked" sources={sources} />
      ) : status === 'failed' ? <Sources title="Sources" sources={sources} /> : null}

      {findings.length > 0 && <Button to={`/actions/${scanId}`} icon="arrow" className="mt-8">See your next steps</Button>}
      {status === 'complete' && findings.length === 0 && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Button to="/privacy" variant="secondary">How Sentinel checks</Button>
          <Button to="/check" variant="quiet">Check another address you control</Button>
        </div>
      )}
      <DemoNotice className="mt-10">These results are synthetic examples, not real breach data.</DemoNotice>
    </PageContainer>
  )
}
