import { useId, useState } from 'react'
import { Icon } from './Icon.jsx'
import { cn } from '../../lib/cn.js'

/** Keyboard-operated disclosure. Expanded state is exposed by aria-expanded and a rotating chevron. */
export function Disclosure({ title, children, defaultOpen = false, headingLevel: H = 'h3', className }) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  return (
    <div className={cn('border-b border-border', className)}>
      <H>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-12 w-full items-center justify-between gap-4 py-3 text-left font-heading text-base font-semibold hover:text-brand"
        >
          {title}
          <Icon name="chevron" size={20} className={cn('shrink-0 transition-transform duration-200', open && 'rotate-180')} />
        </button>
      </H>
      <div id={panelId} hidden={!open} className="pb-4">{children}</div>
    </div>
  )
}
