import { Icon } from './Icon.jsx'
import { cn } from '../../lib/cn.js'

const states = {
  waiting: { text: 'Waiting', icon: 'clock', cls: 'bg-surface-soft text-ink-muted' },
  checking: { text: 'Checking', icon: 'spinner', cls: 'bg-brand-soft text-brand', spin: true },
  complete: { text: 'Complete', icon: 'check', cls: 'bg-success-soft text-success' },
  unavailable: { text: 'Unavailable', icon: 'alert', cls: 'bg-warning-soft text-warning' },
  partial: { text: 'Partial', icon: 'alert', cls: 'bg-warning-soft text-warning' },
  failed: { text: 'Failed', icon: 'x', cls: 'bg-danger-soft text-danger' },
  review: { text: 'Review', icon: 'alert', cls: 'bg-warning-soft text-warning' },
  nomatch: { text: 'No match', icon: 'check', cls: 'bg-success-soft text-success' },
}

export function StatusLabel({ state, className }) {
  const s = states[state] ?? states.waiting
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 font-mono text-[0.7rem] font-semibold uppercase tracking-wider', s.cls, className)}>
      <Icon name={s.icon} size={14} className={s.spin ? 'animate-spin' : undefined} />
      {s.text}
    </span>
  )
}
