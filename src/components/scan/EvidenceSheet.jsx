import { SignalTrace } from '../ui/SignalTrace.jsx'
import { StatusLabel } from '../ui/StatusLabel.jsx'

/** Landing hero visual. Fictional data, labelled "Example". */
export function EvidenceSheet() {
  return (
    <figure className="relative overflow-hidden rounded-[28px] border border-border bg-surface-soft p-6 md:p-8" aria-label="Illustrative exposure record using example data">
      <div className="pointer-events-none absolute -right-28 -top-32 size-80 rounded-full border border-border-strong/60" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full border border-border-strong/40" aria-hidden="true" />
      <div className="relative flex items-center justify-between">
        <p className="font-heading text-sm font-semibold">Exposure record</p>
        <span className="rounded-pill border border-border bg-surface/70 px-2.5 py-1 font-mono text-[0.65rem] font-medium uppercase tracking-[0.12em] text-ink-muted">Example data</span>
      </div>
      <div className="relative mx-auto mt-10 max-w-[400px] rounded-card border border-border bg-surface p-5 shadow-card">
        <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.12em] text-ink-muted">Identifier checked</p>
        <p className="mt-2 font-heading text-xl font-semibold tracking-tight">al<span className="text-ink-subtle">••••</span>@example.test</p>
        <SignalTrace nodes={['active', 'idle', 'idle']} className="my-6" />
        <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.12em] text-ink-muted">Source references</p>
        <ul className="mt-2">
          <li className="flex items-center gap-3 border-t border-border py-3">
            <span className="grid size-9 place-items-center rounded-input bg-brand-soft font-mono text-xs font-semibold text-brand" aria-hidden="true">01</span>
            <div className="flex-1"><p className="font-heading text-sm font-semibold">Example source record</p><p className="text-xs text-ink-subtle">Reported incident, 2024</p></div>
            <StatusLabel state="review" />
          </li>
          <li className="flex items-center gap-3 border-t border-border py-3">
            <span className="grid size-9 place-items-center rounded-input bg-brand-soft font-mono text-xs font-semibold text-brand" aria-hidden="true">02</span>
            <div className="flex-1"><p className="font-heading text-sm font-semibold">Second source</p><p className="text-xs text-ink-subtle">No matching record</p></div>
            <StatusLabel state="nomatch" />
          </li>
        </ul>
      </div>
      <figcaption className="relative mt-6 ml-auto w-fit rounded-input bg-brand px-4 py-3 font-mono text-xs text-surface">
        Evidence before <span className="text-signal">alarm.</span>
      </figcaption>
    </figure>
  )
}
