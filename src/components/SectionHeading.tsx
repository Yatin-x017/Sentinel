import { SILK_ANCHOR } from "../lib/anchor"

export default function SectionHeading({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} {...SILK_ANCHOR} className="node inline-block rounded-2xl px-5 py-2 text-3xl font-bold md:text-4xl">
      {children}
    </h2>
  )
}
