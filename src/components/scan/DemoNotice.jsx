import { InlineAlert } from '../ui/InlineAlert.jsx'
import { isDemo, demoHint } from '../../services/scanApi.js'

/** Shown only in demo mode so synthetic data is never mistaken for a real scan. */
export function DemoNotice({ children, className }) {
  if (!isDemo) return null
  return (
    <InlineAlert tone="info" title="Demo data" className={className}>
      {children ?? demoHint?.text ?? 'Everything on this screen is synthetic example data.'}
    </InlineAlert>
  )
}
