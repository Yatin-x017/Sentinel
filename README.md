# Sentinel

**Sentinel is a privacy-first email exposure checker.** You enter an email address, prove you own it with a one-time code, and Sentinel checks approved breach-metadata sources and tells you what turned up and what to do next.

It is a student capstone project (Team T0058: Yatin, Ekansh, Dhaval and Puneet) with a React frontend and a Node.js/Express/MongoDB backend.

> **Demo build:** the bundled source adapters return deterministic **synthetic** data. They do not query real breach databases. Do not enter real personal information while demoing.

## Key features

- **Ownership verification:** a 6-digit OTP is emailed to the address before any scan can run. Attempts are capped at 5, resends at 3, with a 30-second cooldown.
- **Privacy by design:** only HMAC hashes of the email, OTP and session token are stored. Plaintext emails and OTPs are never persisted or logged.
- **Temporary data:** verification sessions (about 10 minutes) and scan sessions (about 20 minutes) expire automatically through MongoDB TTL indexes. `DELETE /api/v1/scans/:id` removes a scan and its verification session immediately.
- **Concurrent source pipeline:** enabled sources run in parallel, each with its own timeout taken from the `SourceRegistry`.
- **Honest results:** if one source fails the scan is reported as `partial`, and if all fail it is `failed`. A failure is never reported as "no match".
- **Normalize, deduplicate, recommend:** findings are mapped to one schema, merged by `incidentId` and breach date, and turned into ordered action steps based only on the exposed field categories. There are no invented risk scores.
- **Security middleware:** Helmet, a CORS allow-list, a 16 kb JSON body limit, and a global rate limit of 100 requests per 15 minutes.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS 4, Three.js (silk spider cursor) |
| Backend | Node.js 20+, Express 5, Mongoose 9 |
| Database | MongoDB (with TTL indexes) |
| Email | Nodemailer (SMTP) |
| Hosting | Render (`render.yaml`): static site plus Node web service |

## Project structure

```
.
├── src/                      React site
│   ├── App.tsx               Page composition, lazy-loaded spider cursor
│   ├── sections/             Hero, HowItWorks, SampleResults, VerificationSources, About, Team
│   ├── components/           EmailCheckForm, SiteHeader/Footer, DoodleCrewFooter, TeamLanyardRail, SilkSpiderCursor
│   ├── hooks/useEmailCheck.ts  Verification and scan state machine
│   ├── lib/api.ts            API client: verify, confirm, start scan, poll, map results
│   └── data/                 Static content, source list, team
├── server/
│   └── src/
│       ├── app.js            Express setup, Helmet, CORS, rate limit, routes
│       ├── server.js         MongoDB connection, source registry seeding, listener
│       ├── routes/           health, verification, scans
│       ├── controllers/      HTTP request/response handling
│       ├── services/         scan orchestrator, normalization, deduplication, recommendations, mailer
│       ├── adapters/         base adapter and deterministic mock source adapters
│       ├── models/           VerificationSession, ScanSession, SourceRegistry
│       ├── middleware/       HMAC and OTP crypto helpers
│       └── validators/       input and ObjectId validation
├── docs/                     Evaluation sheet and walkthrough PDFs
└── render.yaml               Render deployment blueprint
```

## Run locally

Requirements: Node.js 20 or newer and a running MongoDB.

1. **Configure the API.** In `server/`, copy `.env.example` to `.env` and replace both HMAC secrets with long random values:

   ```sh
   cd server
   cp .env.example .env
   ```

2. **Install and start the API:**

   ```sh
   npm install
   npm run dev          # http://localhost:5001
   ```

3. **Install and start the site** in a second terminal:

   ```sh
   cd ..
   npm install
   npm run dev          # http://localhost:5173
   ```

4. Open <http://localhost:5173>, enter an email address, then enter the 6-digit code.

With `DEV_LOG_OTP=true` (the default in `server/.env.example`) the code is printed in the API terminal. To receive it by email instead, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASS` in `server/.env` and set `DEV_LOG_OTP=false`. For Gmail, use an App Password.

The Vite dev server proxies `/api` to `http://localhost:5001`. Set `VITE_API_PROXY` to change that.

## Environment variables

**API (`server/.env`)**

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `5001`) |
| `MONGODB_URI` | MongoDB connection string |
| `EMAIL_HMAC_SECRET` | Secret for hashing emails |
| `OTP_HMAC_SECRET` | Secret for hashing OTPs and session tokens |
| `CLIENT_ORIGIN` | Allowed site origin for CORS |
| `DEV_LOG_OTP` | `true` prints OTPs in the terminal (development only) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email delivery |

**Site (`.env`)**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Public API URL (leave empty in development to use the proxy) |
| `VITE_API_PROXY` | Dev proxy target (default `http://localhost:5001`) |

## API reference (v1)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service and database health |
| `POST` | `/api/v1/verifications` | Start verification, send OTP |
| `POST` | `/api/v1/verifications/:id/confirm` | Validate OTP, return a short-lived `sessionToken` |
| `POST` | `/api/v1/verifications/:id/resend` | Resend OTP (cooldown and limit enforced) |
| `POST` | `/api/v1/scans` | Start a scan (needs `verificationId`, `sessionToken`, `email`); returns `202` with `scanId` |
| `GET` | `/api/v1/scans/:id` | Scan status and per-source statuses (poll this) |
| `GET` | `/api/v1/scans/:id/findings` | Findings, summary counts and recommended actions |
| `DELETE` | `/api/v1/scans/:id` | Delete the scan and its verification session |

Scan status is one of `running`, `completed`, `partial`, `failed` or `cancelled`.

## The scan pipeline

1. **Validate** the input and normalize the email.
2. **Verify** ownership with a one-time code.
3. **Orchestrate** the enabled sources from `SourceRegistry` concurrently, each with its own `timeoutMs`.
4. **Adapt** each provider through an adapter (`mock-source.adapter.js` in this build).
5. **Normalize** responses into one finding schema.
6. **Deduplicate** by `incidentId` and breach date.
7. **Recommend** ordered actions from the exposed field categories.
8. **Return** only sanitized JSON.

## Demo scenarios

The mock adapters choose a scenario from the submitted email:

| Email contains | Result |
|---|---|
| `nomatch` or `clean` | No findings |
| `partial` | One source unavailable (`partial`) |
| `timeout` | One slow source times out (`partial`) |
| `fail` | All sources unavailable (`failed`) |
| anything else | Synthetic findings |

## Commands

| Command | Where | What it does |
|---|---|---|
| `npm run dev` | root | Start the Vite site |
| `npm run build` | root | Typecheck and build the static site |
| `npm run typecheck` | root | Check frontend types |
| `npm run format` | root | Format `src`, `server/src` and `vite.config.ts` |
| `npm run dev` | `server/` | Start the API with file watching |
| `npm start` | `server/` | Start the API |

## Deployment

`render.yaml` defines two Render services: `sentinel-api` (Node web service from `server/`) and `sentinel-site` (static build from `dist/`).

- Set `MONGODB_URI`, both HMAC secrets, `CLIENT_ORIGIN` and the SMTP variables on the API.
- Set `VITE_API_URL` to the public API URL on the site.
- Before real use, replace the mock adapters with real provider adapters, and review provider terms, privacy copy, data retention and security.

## Documentation

- `docs/evaluation-quick-sheet.md` is a short evaluation guide.
- `docs/pdfs/` has backend, frontend and combined walkthroughs.
