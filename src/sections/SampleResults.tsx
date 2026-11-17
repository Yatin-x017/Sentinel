import SectionHeading from "../components/SectionHeading"
import { SAMPLE } from "../data/content"
import { SILK_ANCHOR } from "../lib/anchor"

export default function SampleResults() {
  return (
    <section id="results" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-24 md:px-10">
      <SectionHeading>What a result looks like</SectionHeading>
      <p className="mt-5 max-w-[52ch] text-mist">An example only. Your own results list the sources where your address appeared.</p>
      <ul className="mt-10 grid gap-6">
        {SAMPLE.map((r) => (
          <li key={r.source} {...SILK_ANCHOR} className="node grid gap-2 rounded-3xl p-6 md:grid-cols-[12rem_14rem_1fr] md:gap-8">
            <p className="font-bold">{r.source}</p>
            <p className="text-mist">{r.what}</p>
            <p>{r.todo}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
