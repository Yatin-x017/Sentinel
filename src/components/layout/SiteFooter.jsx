import { Link } from 'react-router-dom'
import { PageContainer } from './PageContainer.jsx'
import { useReadingSettings } from '../../hooks/useReadingSettings.jsx'

const link = 'inline-flex min-h-12 items-center hover:text-brand hover:underline'

export function SiteFooter() {
  const { setOpen } = useReadingSettings()
  return (
    <footer className="mt-auto border-t border-border print:hidden">
      <PageContainer className="flex flex-col gap-6 py-8 text-sm text-ink-muted md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-heading font-bold tracking-[0.12em] text-ink">SENTINEL.</p>
          <p>Know what surfaced. Know what to do next.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6">
          <Link to="/privacy" className={link}>Privacy</Link>
          <Link to="/privacy#sources" className={link}>Methodology</Link>
          <Link to="/privacy#contact" className={link}>Contact</Link>
          <button type="button" onClick={() => setOpen(true)} className={link}>Accessibility &amp; reading settings</button>
        </nav>
      </PageContainer>
    </footer>
  )
}
