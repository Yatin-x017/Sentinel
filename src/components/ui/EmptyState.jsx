export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-card border border-dashed border-border-strong bg-surface-raised p-8 text-center">
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      {children && <p className="mx-auto mt-2 max-w-[48ch] text-ink-muted">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
