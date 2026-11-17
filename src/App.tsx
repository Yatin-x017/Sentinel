import { lazy, Suspense } from "react"
import SiteFooter from "./components/SiteFooter"
import SiteHeader from "./components/SiteHeader"
import About from "./sections/About"
import Hero from "./sections/Hero"
import HowItWorks from "./sections/HowItWorks"
import SampleResults from "./sections/SampleResults"
import Team from "./sections/Team"
import VerificationSources from "./sections/VerificationSources"
import { SILK_SELECTOR } from "./lib/anchor"

// three.js lives in this chunk; the page is usable before it arrives.
const SilkSpiderCursor = lazy(() => import("./components/SilkSpiderCursor"))

export default function App() {
  return (
    <>
      <Suspense fallback={null}>
        <SilkSpiderCursor
          anchorSelector={SILK_SELECTOR}
          silkColor="#ffffff"
          bounceColor="#1530e6"
          shadowColor="#000a3a"
          seedWebs={6}
          maxThreads={90}
        />
      </Suspense>

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-silk focus:px-4 focus:py-2 focus:text-deep"
      >
        Skip to content
      </a>

      <SiteHeader />
      <main id="main">
        <Hero />
        <HowItWorks />
        <SampleResults />
        <VerificationSources />
        <About />
        <Team />
      </main>
      <SiteFooter />
    </>
  )
}
