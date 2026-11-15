import { Disclosure } from '../ui/Disclosure.jsx'
import { StatusLabel } from '../ui/StatusLabel.jsx'
import { SignalTrace } from '../ui/SignalTrace.jsx'
import { FieldChip } from './FieldChip.jsx'
import { formatDateTime, formatReported } from '../../lib/format.js'

/** Hierarchy: title → source/reference → date → fields → meaning → action → evidence. */
export function FindingCard({ finding, example = false }) {
  const reported = formatReported(finding.reportedDate)
  const retrieved = formatDateTime(finding.retrievedAt)
  return (
    <article className="rounded-card border border-border bg-surface p-6" aria-label={finding.title}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-xl font-semibold">{finding.title}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {example && <span className="rounded-pill border border-border bg-surface-raised px-2.5 py-1 font-mono text-[0.7rem] font-semibold uppercase tracking-wider text-ink-muted">Example</span>}
          <StatusLabel state="review" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-sm text-ink-muted">
        <SignalTrace nodes={['done', 'active']} className="w-16 shrink-0" />
        <p>
          <span className="font-semibold text-ink">{finding.sourceName}</span>
          <span className="font-mono text-xs"> · {finding.reference}</span>
          {reported && <span> · Reported {reported}</span>}
        </p>
      </div>

      <div className="mt-5">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink-muted" id={`${finding.id}-fields`}>Reported fields</p>
        <ul aria-labelledby={`${finding.id}-fields`} className="mt-2 flex flex-wrap gap-2">
          {finding.fields.map((f) => <FieldChip key={f}>{f}</FieldChip>)}
        </ul>
      </div>

      <p className="mt-5 max-w-[62ch]">{finding.explanation}</p>
      <div className="mt-4 rounded-input bg-brand-soft p-4">
        <p className="font-heading text-sm font-semibold text-brand">Recommended action</p>
        <p className="mt-1">{finding.action}</p>
      </div>

      <Disclosure title="Why this result?" className="mt-4 border-b-0 border-t">
        <dl className="space-y-3 text-[0.95rem]">
          <div><dt className="font-semibold">How it matched</dt><dd className="text-ink-muted">{finding.why.matchBasis}</dd></div>
          <div><dt className="font-semibold">Source notes</dt><dd className="text-ink-muted">{finding.why.notes}</dd></div>
          <div><dt className="font-semibold">Limitations</dt><dd className="text-ink-muted">{finding.why.limitations}</dd></div>
          {retrieved && <div><dt className="font-semibold">Retrieved</dt><dd className="font-mono text-xs text-ink-muted">{retrieved}</dd></div>}
        </dl>
      </Disclosure>
    </article>
  )
}
