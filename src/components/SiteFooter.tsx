import { lazy, Suspense } from "react"
import type { CrewMember, FooterAction, FooterColumn } from "./DoodleCrewFooter"

const DoodleCrewFooter = lazy(() => import("./DoodleCrewFooter"))

const COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how" },
      { label: "Sample results", href: "#results" },
      { label: "Data sources", href: "#sources" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "About", href: "#about" },
      { label: "The team", href: "#team" },
      { label: "Source code", href: "https://github.com/Yatin-x017" },
    ],
  },
  {
    title: "Sources",
    links: [
      { label: "Have I Been Pwned", href: "https://haveibeenpwned.com" },
      { label: "XposedOrNot", href: "https://xposedornot.com" },
    ],
  },
]

const ACTIONS: FooterAction[] = [
  { label: "Meet the team", href: "#team", icon: "star", variant: "outline" },
  { label: "Check my email", href: "#main", icon: "bolt", variant: "solid" },
]

const CREW: CrewMember[] = [
  { kind: "yeti", letter: 0, seat: "front", offset: -0.32, name: "Bruno", says: "I sniffed out three leaks today." },
  { kind: "bird", letter: 1, seat: "top", offset: 0.02, name: "Pip", says: "Change that password. Seriously." },
  { kind: "mushroom", letter: 2, seat: "front", offset: 0.12, scale: 0.95, name: "Morel", says: "Spores spread. So do breaches." },
  { kind: "kid", letter: 4, seat: "top", offset: -0.05, name: "Juno", says: "Two-step sign-in. Best seat in the house." },
  { kind: "ghost", letter: 6, seat: "behind", offset: 0, name: "Boo", says: "Your old account is still out there." },
  { kind: "cat", letter: 7, seat: "front", offset: 0.42, flip: true, name: "Patch", says: "Nothing found? Purrfect." },
]

export default function SiteFooter() {
  return (
    <Suspense
      fallback={
        <footer className="mx-auto max-w-6xl px-6 pb-10 pt-6 text-base text-mist md:px-10">
          <p>Sentinel is a student project. It searches breach databases only.</p>
        </footer>
      }
    >
      <DoodleCrewFooter
        wordmark="SENTINEL"
        brand="sentinel"
        blurb="A student project that checks breach databases and tells you what turned up and what to do next."
        tagline="Know where your email has been. Then close the door."
        columns={COLUMNS}
        actions={ACTIONS}
        crew={CREW}
        doodles={["star", "bolt", "sparkle", "heart", "star", "sparkle", "spiral", "plane"]}
        copyright="© 2026 Sentinel. A student capstone by Yatin, Ekansh, Dhaval and Puneet."
        legal={[]}
        socials={[{ label: "GitHub", href: "https://github.com/Yatin-x017" }]}
        preset="auto"
        palette={{ accent: "#ffe45c" }}
        serifFamily="var(--font-sans)"
        height="720px"
      />
    </Suspense>
  )
}
