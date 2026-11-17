# Sentinel site (React + Vite + Tailwind v4)

Marketing and check page for Sentinel, a student project that checks breach databases for an email address.

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
npm run format     # prettier
```

## Connecting the server

Copy `.env.example` to `.env` and set `VITE_API_URL` to the Sentinel server.
The form calls one endpoint, in `src/lib/api.ts`:

```
POST {VITE_API_URL}/api/check
{ "email": "name@example.com" }
-> { "sources": [{ "name": "Have I Been Pwned", "found": true, "detail": "optional" }] }
```

Errors the UI has copy for: network failure, HTTP 429, any other non-2xx, and a malformed body.

## Data sources

Defined once in `src/data/sources.ts` and shown in the hero chips and the "Where the checks come from" section.

| Group | Source | Role | Access |
|---|---|---|---|
| Exposure | Have I Been Pwned | Breaches, pastes, stealer logs | API v3, paid key per email lookup |
| Exposure | XposedOrNot | Breaches, analytics, pastes | Free API (rate limited), Plus API with key |
| Verification | Syntax check | Reject malformed addresses | Own server |
| Verification | DNS MX lookup | Domain can receive mail | Own server |
| Verification | One-time code | Proves the asker owns the inbox | Own server + outgoing mail (planned) |
| Verification | Disposable-domain list | Skip throwaway domains | Open-source list (planned) |

Check each provider's current terms, limits and pricing before launch. The server should hold the API keys; the browser never sees them.

## Structure

```
src/
  App.tsx            page composition; lazy-loads the spider
  sections/          Hero, HowItWorks, SampleResults, VerificationSources, About, Team
  components/        SiteHeader, SiteFooter, EmailCheckForm, SectionHeading,
                     DoodleCrewFooter, SilkSpiderCursor, TeamLanyardRail
  data/              sources, team, page copy
  hooks/             useEmailCheck (state, abort, validation)
  lib/               api (fetch + errors), anchor (silk anchor helpers)
```

Heavy parts (three.js spider, team rail, footer) are separate chunks, so the first paint doesn't wait for them.

## Notes

- Team photos are expected at `public/team/{yatin,ekansh,dhaval,puneet}.jpg`; badges fall back gracefully if missing.
- Fonts load from Google Fonts in `index.html`. Self-host them if you want zero third-party requests.
