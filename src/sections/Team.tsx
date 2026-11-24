import { lazy, Suspense } from "react"
import SectionHeading from "../components/SectionHeading"
import { TEAM } from "../data/team"

const TeamLanyardRail = lazy(() => import("../components/TeamLanyardRail"))

export default function Team() {
  return (
    <section id="team" className="scroll-mt-8 pt-8">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <SectionHeading>The team behind Sentinel</SectionHeading>
      </div>
      <Suspense fallback={<div className="min-h-[28rem]" aria-hidden="true" />}>
        <TeamLanyardRail items={TEAM} autoplay caption="Hover or tap a badge. Click it to flip it over." />
      </Suspense>
    </section>
  )
}
