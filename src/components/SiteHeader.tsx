const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#results", label: "Results" },
  { href: "#sources", label: "Sources" },
  { href: "#about", label: "About" },
] as const

export default function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 pt-6 md:px-10">
      <a href="/" className="text-xl font-bold tracking-wide">
        Sentinel
      </a>
      <nav aria-label="Main" className="flex flex-wrap gap-x-6 gap-y-2 text-base">
        {NAV.map((n) => (
          <a key={n.href} className="underline-offset-4 hover:underline" href={n.href}>
            {n.label}
          </a>
        ))}
      </nav>
    </header>
  )
}
