import { PageContainer } from '../components/layout/PageContainer.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { Disclosure } from '../components/ui/Disclosure.jsx'
import { SignalTrace } from '../components/ui/SignalTrace.jsx'
import { EvidenceSheet } from '../components/scan/EvidenceSheet.jsx'
import { FindingCard } from '../components/scan/FindingCard.jsx'
import { FINDINGS } from '../services/fixtures.js'

const eyebrow = 'font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink-muted'

const STEPS = [
  ['Verify', 'Confirm your email', 'Enter an address you control and confirm you can open its inbox.'],
  ['Check', 'Review approved sources', 'Sentinel compares it with documented sources and tracks what finished.'],
  ['Act', 'Know what to do next', 'See what was reported and follow a short, ordered action plan.'],
]

const FAQ = [
  ['Does a match mean I was hacked?', 'Not necessarily. A match means your email address appeared in a record a source reported. It does not show that your account was accessed, or that anything is happening now. The result tells you which fields were reported and what to do about them.'],
  ['Does no match mean I am safe?', 'No. It means this scan did not find a matching record in the sources it checked. Your email could still appear in a source Sentinel does not check, so keep your accounts protected either way.'],
  ['Can I check someone else’s email?', 'No. You verify that you can open the inbox before any result is shown. Sentinel does not search for other people.'],
  ['Will Sentinel show or ask for my password?', 'Never. Sentinel does not ask for a password and does not display passwords or raw leaked records. It shows which kinds of field were reported, such as “Password hash”.'],
]

export default function LandingPage() {
  return (
    <>
      <PageContainer className="grid items-center gap-12 py-14 md:py-20 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <p className={`${eyebrow} flex items-center gap-2.5`}>
            <span className="size-2 rounded-full bg-signal ring-4 ring-signal/30" aria-hidden="true" />
            Personal data exposure check
          </p>
          <h1 className="mt-6 max-w-[14ch] text-[clamp(2.6rem,6vw,4.75rem)] font-semibold leading-[1.04] tracking-[-0.05em]">
            Know where your email has{' '}
            <em className="font-display text-[1.07em] font-normal tracking-[-0.03em] text-brand">surfaced.</em>
          </h1>
          <p className="mt-5 max-w-[34rem] text-[1.05rem] text-ink-muted">
            Check an email address you control against approved exposure sources. Understand what was reported and get clear steps to secure your accounts.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Button to="/check" icon="arrow">Check my email</Button>
            <Button to="/#how" variant="quiet">How Sentinel works</Button>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-ink-subtle">
            <Icon name="shield" className="text-brand" /> Only check an address you control.
          </p>
        </div>
        <div className="lg:col-span-5"><EvidenceSheet /></div>
      </PageContainer>

      <section id="how" className="scroll-mt-4 border-t border-border py-16">
        <PageContainer>
          <div className="max-w-2xl">
            <p className={eyebrow}>A clear three-step flow</p>
            <h2 className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-tight">From a question to a next step.</h2>
            <p className="mt-3 text-ink-muted">No jargon, no raw leaked records, no frightening dashboard.</p>
          </div>
          <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-0">
            {STEPS.map(([tag, title, body], i) => (
              <li key={tag} className="md:border-l md:border-border md:px-8 md:first:border-l-0 md:first:pl-0">
                <p className="font-mono text-xs font-medium text-brand">0{i + 1} / {tag.toUpperCase()}</p>
                <SignalTrace nodes={i === 0 ? ['active', 'idle'] : ['idle', 'idle']} className="my-4 w-20" />
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-2 max-w-[34ch] text-ink-muted">{body}</p>
              </li>
            ))}
          </ol>
        </PageContainer>
      </section>

      <section className="border-t border-border bg-surface-soft py-16">
        <PageContainer className="grid items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className={eyebrow}>What a result looks like</p>
            <h2 className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-tight">Evidence first, then the action.</h2>
            <p className="mt-3 max-w-[40ch] text-ink-muted">Each finding names its source, shows when it was reported, lists the fields involved and gives one recommended step. This card uses example data.</p>
          </div>
          <div className="lg:col-span-7"><FindingCard finding={FINDINGS['src-a']} example /></div>
        </PageContainer>
      </section>

      <section className="border-t border-border py-16">
        <PageContainer className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-tight">What Sentinel checks.</h2>
            <ul className="mt-5 space-y-3 text-ink-muted">
              <li>One email address you have verified you control.</li>
              <li>One or two approved, documented exposure sources.</li>
              <li>Which fields were reported, with source and date where available.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-tight">What it does not do.</h2>
            <ul className="mt-5 space-y-3 text-ink-muted">
              <li>Search for other people, or by name, phone number or address.</li>
              <li>Ask for or display a password.</li>
              <li>Promise you are safe because nothing matched.</li>
            </ul>
            <Button to="/privacy" variant="secondary" className="mt-6">Privacy &amp; methodology</Button>
          </div>
        </PageContainer>
      </section>

      <section id="faq" className="scroll-mt-4 border-t border-border py-16">
        <PageContainer width="reading">
          <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-tight">Questions, answered plainly.</h2>
          <div className="mt-6 border-t border-border">
            {FAQ.map(([q, a]) => (
              <Disclosure key={q} title={q} headingLevel="h3"><p className="text-ink-muted">{a}</p></Disclosure>
            ))}
          </div>
        </PageContainer>
      </section>
    </>
  )
}
