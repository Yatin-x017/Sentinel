import { Icon } from './Icon.jsx'
import { cn } from '../../lib/cn.js'

const tones = {
  info: { box: 'bg-brand-soft border-border-strong text-ink', icon: 'info', iconCls: 'text-brand', label: 'Information' },
  success: { box: 'bg-success-soft border-success/30 text-ink', icon: 'check', iconCls: 'text-success', label: 'Success' },
  warning: { box: 'bg-warning-soft border-warning/30 text-ink', icon: 'alert', iconCls: 'text-warning', label: 'Needs attention' },
  error: { box: 'bg-danger-soft border-danger/30 text-ink', icon: 'x', iconCls: 'text-danger', label: 'Error' },
}

/** Title + corrective action. Icon, text and colour all carry the tone. */
export function InlineAlert({ tone = 'info', title, children, action, className, headingLevel: H = 'p' }) {
  const t = tones[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-card border p-4', t.box, className)}>
      <Icon name={t.icon} size={22} className={cn('mt-0.5 shrink-0', t.iconCls)} />
      <div className="min-w-0 flex-1">
        <span className="sr-only">{t.label}: </span>
        {title && <H className="font-heading text-base font-semibold">{title}</H>}
        {children && <div className={cn('text-[0.95rem] text-ink-muted', title && 'mt-1')}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}
