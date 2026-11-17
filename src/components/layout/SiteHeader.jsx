import { Link, useLocation } from 'react-router-dom'
import { PageContainer } from './PageContainer.jsx'
import { BrandMark } from '../ui/BrandMark.jsx'
import { Button } from '../ui/Button.jsx'
import { Icon } from '../ui/Icon.jsx'
import { useReadingSettings } from '../../hooks/useReadingSettings.jsx'

const navLink = 'rounded-input px-2 py-3 text-sm text-ink-muted hover:text-brand'

export function SiteHeader() {
  const { pathname } = useLocation()
  const { setOpen } = useReadingSettings()
  return (
    <header className="border-b border-border print:hidden">
      <PageContainer className="flex min-h-20 items-center justify-between gap-4">
        <Link to="/" aria-label="Sentinel home" className="flex items-center gap-3 font-heading text-[0.9rem] font-bold tracking-[0.13em]">
          <BrandMark /> SENTINEL
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-5 md:flex">
          <Link to="/#how" className={navLink}>How it works</Link>
          <Link to="/privacy" className={navLink}>Privacy &amp; methodology</Link>
          <Link to="/#faq" className={navLink}>FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-12 items-center gap-2 rounded-input px-3 font-heading text-sm font-semibold text-ink-muted hover:bg-surface-soft hover:text-ink"
          >
            <Icon name="sliders" />
            <span className="max-sm:sr-only">Reading settings</span>
          </button>
          {pathname !== '/check' && <Button to="/check" className="max-sm:px-4">Check my email</Button>}
        </div>
      </PageContainer>
    </header>
  )
}
