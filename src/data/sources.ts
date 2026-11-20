export type SourceStatus = "core" | "planned"

export interface DataSource {
  id: string
  name: string

  covers: string

  access: string
  url: string
  status: SourceStatus
}

export interface SourceGroup {
  id: "exposure" | "verification"
  title: string
  intro: string
  sources: DataSource[]
}

export const SOURCE_GROUPS: SourceGroup[] = [
  {
    id: "exposure",
    title: "Exposure data",
    intro: "Databases of breaches, pastes and stealer logs. These tell us where an address has appeared.",
    sources: [
      {
        id: "hibp",
        name: "Have I Been Pwned",
        covers: "Breaches, pastes and stealer-log exposure for one email address.",
        access: "REST API v3. Per-email lookups need a paid API key sent in the hibp-api-key header.",
        url: "https://haveibeenpwned.com/api/v3",
        status: "planned",
      },
      {
        id: "xon",
        name: "XposedOrNot",
        covers: "Breach names and breach analytics for one email address, plus paste exposure.",
        access: "Free API with no key (about 2 requests a second, with hourly and daily caps). A keyed Plus API returns more detail.",
        url: "https://xposedornot.com",
        status: "planned",
      },
    ],
  },
  {
    id: "verification",
    title: "Email verification",
    intro: "Checks that run before any lookup, so we only search for addresses that are real and belong to the person asking.",
    sources: [
      {
        id: "syntax",
        name: "Address syntax check",
        covers: "Rejects malformed addresses and normalises case and whitespace.",
        access: "Runs on our own server. No third party involved.",
        url: "https://www.rfc-editor.org/rfc/rfc5322",
        status: "core",
      },
      {
        id: "mx",
        name: "DNS mail-server lookup",
        covers: "Confirms the domain publishes MX records, so it can receive mail at all.",
        access: "Standard DNS query from our server (Node's built-in resolver).",
        url: "https://www.rfc-editor.org/rfc/rfc5321",
        status: "planned",
      },
      {
        id: "otp",
        name: "One-time code",
        covers: "Proves the person asking controls the inbox before results are shown.",
        access: "We email a short-lived code and compare it on the server. Needs an outgoing mail service.",
        url: "https://www.rfc-editor.org/rfc/rfc6238",
        status: "core",
      },
      {
        id: "disposable",
        name: "Disposable-domain list",
        covers: "Flags throwaway mail domains so they don't use up lookups.",
        access: "Open-source community list, bundled and refreshed on a schedule.",
        url: "https://github.com/disposable-email-domains/disposable-email-domains",
        status: "planned",
      },
    ],
  },
]

export const EXPOSURE_NAMES = SOURCE_GROUPS.find((g) => g.id === "exposure")!.sources.map((s) => s.name)
