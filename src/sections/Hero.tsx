import EmailCheckForm from "../components/EmailCheckForm"
import { EXPOSURE_NAMES } from "../data/sources"
import { SILK_ANCHOR } from "../lib/anchor"

/** The spider is the hero; the page gives it things to tie its web to. */
export default function Hero() {
  return (
    <section className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-6xl content-center gap-10 px-6 py-16 md:px-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
      <div>
        <h1 className="text-balance text-[clamp(2.5rem,6.2vw,5rem)] font-bold leading-[1.04] tracking-tight">
          Find out where your email has been exposed.
        </h1>
        <p className="mt-6 max-w-[34ch] text-xl text-mist">
          Sentinel checks breach databases and tells you what turned up and what to do next.
        </p>
        <EmailCheckForm />
      </div>

      <ul className="flex flex-wrap content-center gap-x-6 gap-y-10 lg:min-h-[26rem] lg:justify-end" aria-label="Sources Sentinel searches">
        {EXPOSURE_NAMES.map((name, i) => (
          <li
            key={name}
            {...SILK_ANCHOR}
            className="node rounded-full px-6 py-3 text-lg"
            style={{ marginTop: `${(i % 3) * 1.5}rem`, marginLeft: `${(i % 2) * 2}rem` }}
          >
            {name}
          </li>
        ))}
        <li {...SILK_ANCHOR} className="node rounded-full px-6 py-3 text-lg" style={{ marginTop: "1.5rem" }}>
          <a href="#sources" className="underline-offset-4 hover:underline">
            See all sources
          </a>
        </li>
      </ul>
    </section>
  )
}
