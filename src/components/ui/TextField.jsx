import { useId } from 'react'
import { Icon } from './Icon.jsx'
import { cn } from '../../lib/cn.js'

export function TextField({ label, hint, error, className, inputClassName, ...rest }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errId = `${id}-err`
  const describedBy = [hint && hintId, error && errId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-heading text-sm font-semibold">{label}</label>
      {hint && <p id={hintId} className="mt-1 text-sm text-ink-muted">{hint}</p>}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'mt-2 min-h-13 w-full rounded-input border bg-surface px-4 text-base text-ink placeholder:text-ink-subtle',
          'transition-[border-color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] focus-visible:border-focus',
          'disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-ink-subtle',
          error ? 'border-danger' : 'border-border-strong',
          inputClassName,
        )}
        {...rest}
      />
      {error && (
        <p id={errId} className="mt-2 flex items-start gap-2 text-sm font-semibold text-danger">
          <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
