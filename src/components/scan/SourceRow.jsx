import { StatusLabel } from '../ui/StatusLabel.jsx'
import { formatDateTime } from '../../lib/format.js'

export function SourceRow({ source }) {
  const when = formatDateTime(source.checkedAt)
  return (
    <li className="flex items-center gap-4 border-t border-border py-4 first:border-t-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-input bg-brand-soft font-mono text-xs font-semibold text-brand" aria-hidden="true">
        {source.reference?.replace('SRC-', '') ?? '·'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm font-semibold">{source.name}</p>
        <p className="text-sm text-ink-subtle">
          {source.note ?? (when ? `Checked ${when}` : source.state === 'checking' ? 'Comparing your verified email…' : 'Not started yet')}
        </p>
      </div>
      <StatusLabel state={source.state} />
    </li>
  )
}
