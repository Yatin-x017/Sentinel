import { cn } from '../../lib/cn.js'

const LABELS = ['Email', 'Verify', 'Scan']

export function StepIndicator({ current }) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    <div>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
        <span className="sr-only">Step {current} of 3: </span>
        <span aria-hidden="true">{pad(current)} / 03 — </span>
        {LABELS[current - 1]}
      </p>
      <ol aria-hidden="true" className="mt-3 flex gap-1.5">
        {LABELS.map((l, i) => (
          <li key={l} className={cn('h-1 flex-1 rounded-pill', i + 1 < current ? 'bg-brand' : i + 1 === current ? 'bg-signal-ink' : 'bg-border')} />
        ))}
      </ol>
    </div>
  )
}
