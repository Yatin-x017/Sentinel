import { useId, useState } from "react"
import SilkSpiderCursor from "./components/SilkSpiderCursor"
import { TeamLanyardRail, type LanyardMember } from "./components/TeamLanyardRail"

// Silk sticks only to elements carrying this attribute.
const A = { "data-silk-anchor": "" } as const

type Source = { name: string; found: boolean; detail?: string }
type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; sources: Source[] }
  | { kind: "error"; message: string }

async function checkEmail(email: string): Promise<Source[]> {
  const base = import.meta.env.VITE_API_URL
  if (!base) throw new Error("The checker isn't connected yet. Set VITE_API_URL to the Sentinel server address.")
  const res = await fetch(`${base}/api/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error("The check didn't finish. Try again in a moment.")
  const data = (await res.json()) as { sources: Source[] }
  return data.sources
}

const SOURCES = ["Breach lists", "Paste sites", "Public records", "Data brokers", "Forums"]

const STEPS = [
  { title: "Enter your email", body: "Type the address you want checked. Nothing else is needed." },
  { title: "Sentinel searches public sources", body: "It looks through places where leaked or published data tends to appear." },
  { title: "You get a plain list", body: "Each result says where your email appeared and what to do about it." },
]

const SAMPLE = [
  { source: "Breach list", what: "Email and password", todo: "Change the password. Turn on two-step sign-in." },
  { source: "Paste site", what: "Email only", todo: "Watch for scam messages. No action needed." },
  { source: "Data broker", what: "Email and name", todo: "Ask the broker to remove you." },
]

const TEAM: LanyardMember[] = [
  {
    id: "yatin", name: "Yatin", role: "Team lead", team: "Sentinel", image: "/team/yatin.jpg", tone: 1,
    bio: "Leads the project and shapes what the first version checks.",
    tags: ["Planning", "Sources"],
    links: [{ label: "Portfolio", href: "https://yatinsharma.is-a.dev" }, { label: "GitHub", href: "https://github.com/Yatin-x017" }],
  },
  {
    id: "ekansh", name: "Ekansh", role: "Frontend and design system", team: "Sentinel", image: "/team/ekansh.jpg", tone: 5,
    bio: "Builds the interface and the design system behind it.",
    tags: ["React", "Tailwind"],
  },
  {
    id: "dhaval", name: "Dhaval", role: "Backend", team: "Sentinel", image: "/team/dhaval.jpg", tone: 2,
    bio: "Builds the server that runs each check.",
    tags: ["Node", "Express"],
  },
  {
    id: "puneet", name: "Puneet", role: "Data quality", team: "Sentinel", image: "/team/puneet.jpg", tone: 4,
    bio: "Keeps the stored data clean and the results accurate.",
    tags: ["MongoDB", "Data quality"],
  },
]

export default function App() {
  const [email, setEmail] = useState("")
  const [state, setState] = useState<State>({ kind: "idle" })
  const emailId = useId()
  const hintId = useId()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState({ kind: "loading" })
    try {
      setState({ kind: "done", sources: await checkEmail(email.trim()) })
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong." })
    }
  }

  return (
    <>
      <SilkSpiderCursor
        anchorSelector="[data-silk-anchor]"
        silkColor="#ffffff"
        bounceColor="#1530e6"
        shadowColor="#000a3a"
        seedWebs={6}
        maxThreads={90}
      />

      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-silk focus:px-4 focus:py-2 focus:text-deep">
        Skip to content
      </a>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-6 md:px-10">
        <a href="/" className="text-xl font-bold tracking-wide">Sentinel</a>
        <nav aria-label="Main" className="flex gap-6 text-base">
          <a className="underline-offset-4 hover:underline" href="#how">How it works</a>
          <a className="underline-offset-4 hover:underline" href="#results">Results</a>
          <a className="underline-offset-4 hover:underline" href="#about">About</a>
        </nav>
      </header>

      <main id="main">
        {/* Hero: the spider is the hero; the page gives it things to tie its web to. */}
        <section className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-6xl content-center gap-10 px-6 py-16 md:px-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <h1 className="text-balance text-[clamp(2.5rem,6.2vw,5rem)] font-bold leading-[1.04] tracking-tight">
              Find out where your email has been exposed.
            </h1>
            <p className="mt-6 max-w-[34ch] text-xl text-mist">
              Sentinel checks public sources and tells you what turned up and what to do next.
            </p>

            <form onSubmit={onSubmit} className="mt-10 max-w-xl" noValidate>
              <label htmlFor={emailId} className="mb-2 block text-base font-bold">
                Your email address
              </label>
              <div {...A} className="node flex flex-col gap-3 rounded-2xl p-3 sm:flex-row">
                <input
                  id={emailId}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-describedby={hintId}
                  placeholder="name@example.com"
                  className="min-h-14 flex-1 rounded-xl bg-silk px-4 text-lg text-deep placeholder:text-deep/55"
                />
                <button
                  type="submit"
                  disabled={state.kind === "loading"}
                  className="min-h-14 rounded-xl bg-flag px-6 text-lg font-bold text-deep transition-transform active:scale-[0.98] disabled:opacity-70"
                >
                  {state.kind === "loading" ? "Checking…" : "Check my email"}
                </button>
              </div>
              <p id={hintId} className="mt-3 text-base text-mist">
                Only public sources are searched.
              </p>

              <div aria-live="polite" className="mt-4">
                {state.kind === "error" && (
                  <p role="alert" className="rounded-xl border-2 border-flag px-4 py-3 text-base">
                    {state.message}
                  </p>
                )}
                {state.kind === "done" && (
                  <ul className="space-y-2">
                    {state.sources.map((s) => (
                      <li key={s.name} className="flex items-baseline justify-between gap-4 rounded-xl border border-white/30 px-4 py-3 text-base">
                        <span>{s.name}</span>
                        <span className={s.found ? "font-bold text-flag" : "text-mist"}>
                          {s.found ? "Found" : "Not found"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </form>
          </div>

          {/* The places data shows up. These are the anchors the silk reaches for. */}
          <div className="flex flex-wrap content-center gap-x-6 gap-y-10 lg:min-h-[26rem] lg:justify-end" aria-label="Sources Sentinel searches">
            {SOURCES.map((s, i) => (
              <span
                key={s}
                {...A}
                className="node rounded-full px-6 py-3 text-lg"
                style={{ marginTop: `${(i % 3) * 1.5}rem`, marginLeft: `${(i % 2) * 2}rem` }}
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-24 md:px-10">
          <h2 {...A} className="node inline-block rounded-2xl px-5 py-2 text-3xl font-bold md:text-4xl">
            How a check works
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} {...A} className="node rounded-3xl p-7">
                <p className="text-base font-bold text-flag">Step {i + 1}</p>
                <h3 className="mt-2 text-2xl font-bold leading-snug">{s.title}</h3>
                <p className="mt-3 max-w-[38ch] text-mist">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="results" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-24 md:px-10">
          <h2 {...A} className="node inline-block rounded-2xl px-5 py-2 text-3xl font-bold md:text-4xl">
            What a result looks like
          </h2>
          <p className="mt-5 max-w-[52ch] text-mist">
            An example only. Your own results list the sources where your address appeared.
          </p>
          <ul className="mt-10 grid gap-6">
            {SAMPLE.map((r) => (
              <li key={r.source} {...A} className="node grid gap-2 rounded-3xl p-6 md:grid-cols-[12rem_14rem_1fr] md:gap-8">
                <p className="font-bold">{r.source}</p>
                <p className="text-mist">{r.what}</p>
                <p>{r.todo}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="about" className="mx-auto max-w-6xl scroll-mt-8 px-6 pb-32 pt-24 md:px-10">
          <div {...A} className="node max-w-3xl rounded-3xl p-8 md:p-10">
            <h2 className="text-3xl font-bold md:text-4xl">Built as a college capstone</h2>
            <p className="mt-4 max-w-[56ch] text-mist">
              Sentinel is a student project for Advanced Programming and Data Engineering. It is made by Yatin, Ekansh, Dhaval and Puneet.
            </p>
            <p className="mt-4 text-mist">
              Move your cursor to walk the spider. Press Delete to cut the web loose.
            </p>
          </div>
        </section>

        <section id="team" className="scroll-mt-8 pt-8">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <h2 {...A} className="node inline-block rounded-2xl px-5 py-2 text-3xl font-bold md:text-4xl">
              The team behind Sentinel
            </h2>
          </div>
          <TeamLanyardRail
            items={TEAM}
            autoplay
            caption="Hover or tap a badge. Click it to flip it over."
          />
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-10 pt-6 text-base text-mist md:px-10">
        <p>Sentinel is a student project. It searches public sources only.</p>
      </footer>
    </>
  )
}