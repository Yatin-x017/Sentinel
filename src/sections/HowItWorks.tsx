import SectionHeading from "../components/SectionHeading"
import { STEPS } from "../data/content"
import { SILK_ANCHOR } from "../lib/anchor"

export default function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-24 md:px-10">
      <SectionHeading>How a check works</SectionHeading>
      <ol className="mt-12 grid gap-8 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} {...SILK_ANCHOR} className="node rounded-3xl p-7">
            <p className="text-base font-bold text-flag">Step {i + 1}</p>
            <h3 className="mt-2 text-2xl font-bold leading-snug">{s.title}</h3>
            <p className="mt-3 max-w-[38ch] text-mist">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
