# Sentinel

Sentinel combines the Yatin branch's React/Vite site with the Ekansh branch's Express API. The site verifies inbox ownership, starts a scan, and displays source findings from the API. The included adapters return synthetic fixtures for demonstrations; they do not query real breach databases.

## Run locally

Requirements: Node.js 20 or newer and MongoDB.

1. Start MongoDB locally.
2. In `server`, copy `.env.example` to `.env`, then replace both HMAC secrets with long random values.
3. Install and start the API:

   ```sh
   cd server
   npm install
   npm run dev
   ```

4. In a second terminal, install and start the site:

   ```sh
   cd ..
   npm install
   npm run dev
   ```

5. Open <http://localhost:5173>. In local demo mode, the verification code appears in the API terminal. Enter it in the page to finish the scan. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in `server/.env` to deliver codes by email.

The Vite development server proxies `/api` to `http://localhost:5001`. Set `VITE_API_PROXY` to change that address. For production, set `VITE_API_URL` to the public API URL and set `CLIENT_ORIGIN` on the API to the public site URL.

## Main pieces

- `src/App.tsx` composes the marketing page and lazy-loads the Three.js silk cursor.
- `src/sections` contains the page sections; `src/components` contains reusable page elements and the email verification form.
- `src/hooks/useEmailCheck.ts` controls verification and scan states.
- `src/lib/api.ts` calls the API, polls scan status, and maps the result to the UI.
- `server/src/app.js` configures Express, security headers, CORS, rate limiting, and routes.
- `server/src/controllers` implements verification and scan endpoints.
- `server/src/services` implements orchestration, normalization, deduplication, recommendations, and mail delivery.
- `server/src/adapters/mock-source.adapter.js` supplies deterministic synthetic scenarios.
- `server/src/models` defines temporary verification, source, and scan records.

## API flow

1. `POST /api/v1/verifications` creates a short-lived verification and sends a one-time code.
2. `POST /api/v1/verifications/:id/confirm` validates the code and returns a short-lived session token.
3. `POST /api/v1/scans` checks that token, creates a scan, and starts the source pipeline.
4. `GET /api/v1/scans/:id` returns scan status; the client polls until it finishes.
5. `GET /api/v1/scans/:id/findings` returns the final sources, findings, and recommendations.

## Demo scenarios

The mock adapters choose a deterministic scenario based on the submitted email: `nomatch` or `clean` produces no findings; `partial` makes one source unavailable; `timeout` simulates a slow provider; `fail` makes all providers unavailable; other addresses produce synthetic findings. Do not enter real personal information in the demo.

## Hosting

The site can be hosted as a static Vite build, while the API needs a Node service and a reachable MongoDB instance. Configure `VITE_API_URL` for the site and `MONGODB_URI`, both HMAC secrets, and `CLIENT_ORIGIN` for the API. Production mail delivery requires SMTP settings. The source adapters are demo-only; replace them with provider adapters and review source access terms, privacy copy, retention, and security before public use.

## Evaluation walkthrough

1. Explain how the site combines modular React sections with the API flow.
2. Demonstrate email validation and inbox verification, then complete a scan using the development code printed in the API terminal.
3. Try `student@nomatch.example` and `student@partial.example` to compare clean and partial outcomes.
4. Explain that a verified session token gates the scan endpoint, while source adapters are synthetic fixtures in this build.
5. Point out the split between presentation (`src`), request coordination (hook and API client), and business logic/data (`server/src`).

## Commands

- `npm run typecheck` checks the frontend types.
- `npm run build` builds the static site.
- `npm run dev` starts Vite.
