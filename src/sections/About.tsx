import { SILK_ANCHOR } from "../lib/anchor"

export default function About() {
  return (
    <section id="about" className="mx-auto max-w-6xl scroll-mt-8 px-6 pb-32 pt-24 md:px-10">
      <div {...SILK_ANCHOR} className="node max-w-3xl rounded-3xl p-8 md:p-10">
        <h2 className="text-3xl font-bold md:text-4xl">Built as a college capstone</h2>
        <p className="mt-4 max-w-[56ch] text-mist">
          Sentinel is a student project for Advanced Programming and Data Engineering. It is made by Yatin, Ekansh, Dhaval and Puneet.
        </p>
        <p className="mt-4 text-mist">Move your cursor to walk the spider. Press Delete to cut the web loose.</p>
      </div>
    </section>
  )
}
