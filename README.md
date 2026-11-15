# Sentinel client (React + Vite + Tailwind v4)

Frontend for Sentinel, built from `DESIGN.md` (Signal & Evidence) and `PRODUCT.md`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Demo mode (default)

`VITE_USE_MOCK` is on unless set to `false`. No email is sent and no real source is queried.
All data comes from synthetic fixtures (`src/services/fixtures.js`) and every screen that shows it carries a "Demo data" notice.

- Verification code: `123456`
- Scenario is chosen by the email address you type:
  - contains `nomatch` → complete, no matching records
  - contains `partial` → one source unavailable (retry succeeds in the demo)
  - contains `fail` → scan failed
  - anything else → two findings

## Connecting the real backend

Copy `.env.example` to `.env`, set `VITE_USE_MOCK=false`. The dev server proxies `/api` to `http://localhost:5000` (override with `VITE_API_PROXY`).
All calls live in `src/services/realScanApi.js`; pages never call `fetch` directly.

| Call | Request | Response |
|---|---|---|
| `POST /verification` | `{ email }` | `{ verificationId, maskedEmail, resendAfterSeconds }` |
| `POST /verification/resend` | `{ verificationId }` | `{ resendAfterSeconds }` |
| `POST /verification/confirm` | `{ verificationId, code }` | `{ scanId }` |
| `GET /scans/:id` | | Scan |
| `POST /scans/:id/cancel` | | 204 |
| `POST /scans/:id/retry` | | `{ scanId }` |

Errors: non-2xx with `{ error: { code } }`. Codes the UI has copy for: `invalid_email`, `delivery_failed`, `incorrect_code`, `expired_code`, `rate_limited`, `not_found`, `network`.

**Scan shape**

```js
{
  id, status,            // running | complete | partial | failed | cancelled
  illustrative,          // true only for demo data
  maskedEmail, completedAt, retrySupported, errorReference,
  sources:  [{ id, name, reference, state, checkedAt, note }], // waiting | checking | complete | unavailable
  findings: [{ id, sourceId, sourceName, title, reference, reportedDate, retrievedAt,
               fields: ['Email', 'Password hash'], explanation, action,
               why: { matchBasis, notes, limitations } }]
}
```

The UI only shows counts and progress derived from this payload. It never invents percentages, and it never treats `partial` or `failed` as "no match".

## Before launch

- `src/pages/PrivacyPage.jsx` is draft copy. Every `[confirm]` must be replaced with real, verified behaviour (sources, what is sent, retention, logs, contact).
- Fonts load from Google Fonts in `index.html`. Self-host them if you want no third-party requests (relevant for a privacy product).
- The action plan (`src/services/actionPlan.js`) is derived on the client from findings. Move it to the backend if you want it authoritative.
- Run the DESIGN.md review workflow (critique, distill, polish, audit) and test with a keyboard and a screen reader.

## Structure

```
src/
  app/         App shell, routes
  components/  ui/ (primitives), layout/ (header, footer, reading settings), scan/ (domain components)
  pages/       one file per route in DESIGN.md section 4
  services/    scanApi (switch), mock + real clients, fixtures, action plan
  hooks/       useScan, useReadingSettings
  styles/      tokens.css (Tailwind @theme + CSS vars), global.css
```

Colours, fonts, radii and shadows are tokens in `tokens.css`; Tailwind's default palette is disabled so one-off colours can't creep in.
Reading settings (text size, font, line spacing, contrast, motion) are in the header and footer.
