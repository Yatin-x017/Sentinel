import { Link } from 'react-router-dom'
import { Icon } from './Icon.jsx'
import { cn } from '../../lib/cn.js'

const variants = {
  primary: 'bg-brand text-surface hover:bg-brand-hover shadow-[0_4px_10px_rgb(20_91_75/10%)]',
  secondary: 'border border-border-strong bg-surface text-ink hover:bg-surface-soft',
  quiet: 'text-brand hover:bg-brand-soft',
  destructive: 'bg-danger text-surface hover:brightness-90',
}

/** Renders a <Link> with `to`, an <a> with `href`, otherwise a <button>. */
export function Button({ variant = 'primary', loading = false, disabled = false, block = false, icon, to, href, className, children, ...rest }) {
  const cls = cn(
    'inline-flex min-h-12 items-center justify-center gap-2.5 rounded-input px-5 py-2.5 text-center font-heading text-sm font-semibold transition-colors duration-200 ease-out',
    variants[variant],
    block && 'w-full',
    (disabled || loading) && 'cursor-not-allowed opacity-60',
    className,
  )
  const inner = (
    <>
      {loading && <Icon name="spinner" className="animate-spin" />}
      {children}
      {icon && !loading && <Icon name={icon} />}
    </>
  )
  if (to) return <Link to={to} className={cls} {...rest}>{inner}</Link>
  if (href) return <a href={href} className={cls} {...rest}>{inner}</a>
  return (
    <button type="button" className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {inner}
    </button>
  )
}
