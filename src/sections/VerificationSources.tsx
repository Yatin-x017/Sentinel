import SectionHeading from "../components/SectionHeading"
import { SOURCE_GROUPS, type DataSource } from "../data/sources"
import { SILK_ANCHOR } from "../lib/anchor"

function SourceCard({ s }: { s: DataSource }) {
  return (
    <li {...SILK_ANCHOR} className="node rounded-3xl p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-xl font-bold">
          <a href={s.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
            {s.name}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </h4>
        <span className={s.status === "core" ? "text-base font-bold text-flag" : "text-base text-mist"}>
          {s.status === "core" ? "First version" : "Planned"}
        </span>
      </div>
      <p className="mt-3">{s.covers}</p>
      <p className="mt-2 text-mist">{s.access}</p>
    </li>
  )
}

export default function VerificationSources() {
  return (
    <section id="sources" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-24 md:px-10">
      <SectionHeading>Where the checks come from</SectionHeading>
      <p className="mt-5 max-w-[56ch] text-mist">
        Every result names the source it came from. These are the sources Sentinel uses to verify an address and to look for it.
      </p>
      <div className="mt-12 space-y-14">
        {SOURCE_GROUPS.map((g) => (
          <div key={g.id} aria-labelledby={`src-${g.id}`}>
            <h3 id={`src-${g.id}`} className="text-2xl font-bold">
              {g.title}
            </h3>
            <p className="mt-2 max-w-[60ch] text-mist">{g.intro}</p>
            <ul className="mt-6 grid gap-6 md:grid-cols-2">
              {g.sources.map((s) => (
                <SourceCard key={s.id} s={s} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
