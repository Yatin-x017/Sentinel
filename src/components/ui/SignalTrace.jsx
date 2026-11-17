import { cn } from '../../lib/cn.js'

/**
 * The signature motif: a fine line connecting evidence nodes, one signal-lime point.
 * Decorative. It explains sequence/connection; it is not a live network map.
 * nodes: array of 'done' | 'active' | 'idle'
 */
export function SignalTrace({ nodes = ['active', 'idle', 'idle'], className }) {
  return (
    <div aria-hidden="true" className={cn('flex items-center', className)}>
      {nodes.map((n, i) => (
        <div key={i} className={cn('flex items-center', i < nodes.length - 1 && 'flex-1')}>
          <span
            className={cn(
              'z-10 block size-3 rounded-full border-2',
              n === 'active' && 'border-signal-ink bg-signal',
              n === 'done' && 'border-brand bg-brand',
              n === 'idle' && 'border-brand bg-surface',
            )}
          />
          {i < nodes.length - 1 && <span className={cn('h-px flex-1', n === 'done' ? 'bg-brand' : 'bg-border-strong')} />}
        </div>
      ))}
    </div>
  )
}
