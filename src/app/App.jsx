import { Suspense, useEffect, useRef } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { routes } from './routes.jsx'
import { SiteHeader } from '../components/layout/SiteHeader.jsx'
import { SiteFooter } from '../components/layout/SiteFooter.jsx'
import { ReadingSettings } from '../components/layout/ReadingSettings.jsx'
import { PageContainer } from '../components/layout/PageContainer.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Button } from '../components/ui/Button.jsx'

/** On navigation: jump to the hash target or the top, and move focus to <main> for keyboard/screen-reader users. */
function useRouteFocus(mainRef) {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
      return
    }
    window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname, hash, mainRef])
}

export default function App() {
  const mainRef = useRef(null)
  useRouteFocus(mainRef)
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded-input bg-brand px-4 py-3 font-heading text-sm font-semibold text-surface focus:not-sr-only focus:absolute focus:left-4 focus:top-4">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<PageContainer className="py-16"><p className="text-ink-muted">Loading…</p></PageContainer>}>
          <Routes>
            {routes.map((r) => <Route key={r.path} {...r} />)}
            <Route path="*" element={
              <PageContainer width="narrow" className="py-16">
                <EmptyState title="Page not found" action={<Button to="/">Go to the start</Button>}>That address does not match a Sentinel page.</EmptyState>
              </PageContainer>} />
          </Routes>
        </Suspense>
      </main>
      <SiteFooter />
      <ReadingSettings />
    </div>
  )
}
