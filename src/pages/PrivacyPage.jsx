import { PageContainer } from '../components/layout/PageContainer.jsx'
import { InlineAlert } from '../components/ui/InlineAlert.jsx'

/*
 * DRAFT COPY. DESIGN.md: only state privacy promises that are implemented and verified.
 * Replace every "[confirm]" with the real behaviour before launch.
 */
const SECTIONS = [
  ['sources', 'Which sources are checked', 'Sentinel checks one or two approved, documented sources. Each is listed on the scan screen and in your results, with the time it was checked. [confirm: source names, how each is accessed]'],
  ['identifier', 'What is sent to each source', 'Only the email address you verified. Nothing else about you is sent. [confirm: whether the address is sent as-is, hashed, or as a prefix]'],
  ['processing', 'What Sentinel processes', 'Sentinel receives your email address, the one-time code, and the records each source returns. It does not ask for a password, a name, a phone number or any other profile detail. [confirm]'],
  ['retention', 'What is stored, and for how long', '[confirm: whether results are persisted, where, and the retention period. State it exactly.]'],
  ['logs', 'What may appear in logs', '[confirm: operational logs, what is redacted, and for how long they are kept]'],
  ['failures', 'When a source is unavailable', 'Sentinel shows the scan as partial or failed. It never turns an unreachable source into a “no match”.'],
  ['limits', 'What a result can and cannot tell you', 'A match shows your email address appeared in a record a source reported. It does not prove an account was accessed. No match means nothing was found in the sources checked, not that you are safe.'],
  ['contact', 'Removal or correction requests', '[confirm: contact address and process]'],
]

export default function PrivacyPage() {
  return (
    <PageContainer width="reading" className="py-12 md:py-16">
      <h1 className="text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-[1.1]">Privacy &amp; methodology.</h1>
      <p className="mt-3 text-ink-muted">How Sentinel checks an address, what it handles, and what it cannot tell you.</p>
      <InlineAlert tone="warning" title="Draft: not yet verified against the backend" className="mt-6">
        Items marked [confirm] must be completed from the real implementation before launch. Do not publish privacy promises that the backend does not keep.
      </InlineAlert>
      <div className="mt-8 divide-y divide-border border-y border-border">
        {SECTIONS.map(([id, title, body]) => (
          <section key={id} id={id} className="scroll-mt-4 py-6">
            <h2 className="font-heading text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-ink-muted">{body}</p>
          </section>
        ))}
      </div>
    </PageContainer>
  )
}
