import { Icon } from '../ui/Icon.jsx'

export function ActionItem({ action, checked, onChange }) {
  return (
    <li>
      <label className="flex cursor-pointer gap-4 rounded-card border border-border bg-surface p-4 has-[:checked]:bg-surface-raised has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span aria-hidden="true" className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[10px] border-2 border-border-strong bg-surface text-surface peer-checked:border-brand peer-checked:bg-brand">
          <Icon name="check" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block font-heading text-base font-semibold ${checked ? 'text-ink-muted line-through decoration-1' : ''}`}>{action.title}</span>
          <span className="mt-1 block text-ink-muted">{action.body}</span>
          {action.link && <a href={action.link.href} target="_blank" rel="noreferrer" className="mt-2 inline-block text-brand underline">{action.link.label}</a>}
        </span>
      </label>
    </li>
  )
}
