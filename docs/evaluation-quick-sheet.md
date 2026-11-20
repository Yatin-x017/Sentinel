# Sentinel evaluation quick sheet

## 30-second introduction

Sentinel is a student project that combines a React site with an Express API. A visitor enters an email address, proves inbox ownership with a one-time code, and receives a scan summary. The backend separates verification, scan orchestration, source adapters, and persistence. This build uses synthetic source data so the flow can be demonstrated without querying real breach databases.

## 2-minute walkthrough

1. Show the page sections: purpose, example results, planned/implemented checks, and team.
2. Explain that the scan form first requests an email verification code.
3. Enter the 6-digit code printed in the local API terminal when `DEV_LOG_OTP=true`.
4. Point out the scan lifecycle: request accepted, status polling, final source outcomes.
5. Try an address containing `nomatch` for a clean fixture result, then one containing `partial` to show that an unavailable source is reported separately.
6. Explain the code boundary: React handles presentation; the API owns verification, tokens, database writes, and provider orchestration.

## Useful code paths to remember

- `src/App.tsx`: page composition.
- `src/hooks/useEmailCheck.ts`: verification and scan state transitions.
- `src/lib/api.ts`: requests and scan polling.
- `server/src/app.js`: middleware and API routes.
- `server/src/controllers/verification.controller.js`: OTP lifecycle.
- `server/src/controllers/scans.controller.js`: verified-session check and scan endpoints.
- `server/src/services/scan-orchestrator.service.js`: parallel adapter calls and partial/failure status.
- `server/src/adapters/mock-source.adapter.js`: controlled demo fixtures.

## Questions you may get

**Why verify the email first?** The scan endpoint only accepts a short-lived session token issued after inbox ownership is confirmed.

**What happens when one source is down?** The pipeline returns `partial` with per-source status. The UI does not describe an unavailable source as a clean result.

**Are results real?** No. This build uses deterministic synthetic fixtures. HIBP and XposedOrNot are planned integrations and are not queried by these adapters.

**Where would provider keys live?** In server-side environment variables, never in the browser bundle.

**What remains before production?** Connect real provider adapters, configure MongoDB and SMTP, verify privacy/retention behavior, and test the complete hosted flow.

## Before presenting

- Start MongoDB, then start the API and web app in separate terminals.
- Confirm `/api/health` reports `db: connected` before presenting the verification flow.
- Keep `DEV_LOG_OTP=true` only for a local classroom demonstration; use SMTP for hosted verification.
- Use synthetic `.example` addresses so no personal data is sent.
- Open the site and API health check before the evaluation to warm up any sleeping host.
- Have the three walkthrough PDFs ready and keep this sheet open for the demo sequence.
