import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer.jsx'
import { ActionItem } from '../components/scan/ActionItem.jsx'
import { DemoNotice } from '../components/scan/DemoNotice.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useScan } from '../hooks/useScan.js'
import { buildActionPlan, GROUPS } from '../services/actionPlan.js'
import { messageFor } from '../services/errors.js'

export default function ActionPlanPage() {
  const { scanId } = useParams()
  const { scan, error, loading } = useScan(scanId)
  const [done, setDone] = useState({})

  if (loading) return <PageContainer width="reading" className="py-16"><p className="text-ink-muted">Loading your next steps…</p></PageContainer>
  if (error) return (
    <PageContainer width="narrow" className="py-12">
      <EmptyState title="We could not load this plan" action={<Button to="/check">Start a new check</Button>}>{messageFor(error)}</EmptyState>
    </PageContainer>
  )

  const actions = buildActionPlan(scan)
  const count = actions.filter((a) => done[a.id]).length

  if (!actions.length) return (
    <PageContainer width="narrow" className="py-12">
      <EmptyState title="No action items for this scan" action={<Button to={`/results/${scanId}`}>Back to results</Button>}>
        A plan is only built from matching records, and this scan has none.
      </EmptyState>
    </PageContainer>
  )

  return (
    <PageContainer width="reading" className="py-12 md:py-16">
      <h1 className="text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-[1.1]">Your next steps.</h1>
      <p className="mt-3 text-ink-muted">You do these yourself. Sentinel does not change passwords, turn on two-step verification or contact anyone for you.</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p role="status" className="font-mono text-sm font-medium">{count} of {actions.length} done</p>
        <Button variant="secondary" icon="print" onClick={() => window.print()}>Print this plan</Button>
      </div>

      {GROUPS.map((g) => {
        const items = actions.filter((a) => a.group === g.id)
        if (!items.length) return null
        return (
          <section key={g.id} className="mt-8" aria-labelledby={`g-${g.id}`}>
            <h2 id={`g-${g.id}`} className="font-heading text-xl font-semibold">{g.title}</h2>
            <ul className="mt-3 space-y-3">
              {items.map((a) => <ActionItem key={a.id} action={a} checked={!!done[a.id]} onChange={(v) => setDone((d) => ({ ...d, [a.id]: v }))} />)}
            </ul>
          </section>
        )
      })}
      <Button to={`/results/${scanId}`} variant="quiet" className="mt-8 -ml-5 print:hidden">Back to results</Button>
      <DemoNotice className="mt-8">This plan is built from synthetic example findings. Ticks are kept on this page only.</DemoNotice>
    </PageContainer>
  )
}
