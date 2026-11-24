# CP1 — Database Normalization: Sentinel Personal Data Exposure Platform

**Team T0058 (Sentinel)** — Privacy-First OSINT & Breach Exposure Verification Platform

---

## 1. Domain & Application Overview

Sentinel is a privacy-first breach-exposure verification platform. Rather than letting anyone search arbitrary email addresses (or storing raw email addresses and breach dumps), Sentinel enforces a strict two-phase ownership and scan pipeline:

1. **Ownership Verification (`verification_sessions`):** A user submits an email address. Sentinel normalizes the address and stores only its keyed cryptographic digest (`email_hash`, HMAC-SHA256) and a one-time passcode digest (`otp_hmac`, HMAC-SHA256), tracking verification `attempts` (`0..5`), `resend_count` (`0..3`), `last_sent_at`, `verified`, a short-lived `session_token_hash`, and `expires_at`.
2. **Threat-Intelligence Source Registry (`source_registry`):** Approved breach-metadata providers (`sentinel_verified_feed_01`, `sentinel_archive_feed_02`, `hibp_breach_feed_03`, etc.) are registered with a unique `source_id`, human-readable `name`, `enabled` flag, per-source `timeout_ms` (`>= 100`), and `rate_limit_per_min` (`>= 1`).
3. **Asynchronous Scan Orchestration (`scan_sessions`, `scan_source_statuses`):** Once a verification session is confirmed, a scan session is created (`running`, `completed`, `partial`, `failed`, or `cancelled`) and each enabled provider is queried concurrently under its bounded timeout. Each provider's outcome (`pending`, `success`, `timeout`, `failed`), `latency_ms`, and `error_message` are recorded per scan.
4. **Normalized Findings, Atomic Exposed Fields & Action Plan (`scan_findings`, `finding_exposed_fields`, `scan_actions`):** Provider responses are normalized into canonical incident findings (`incident_id`, `identifier_type`, `match_type`, `breach_date`, `retrieved_at`, `confidence`, `evidence_reference`), decomposed into atomic exposed field categories (`email`, `username`, `password_hash`, `phone_number`, `ip_address`, etc.), and mapped to an ordered remediation action plan (`priority`, `action_code`, `title`, `reason`, `category_trigger`).

---

## 2. Starting Point: Unnormalized Wide Table (`UNF` / `0NF`)

In the initial document-store representation (`ScanSession` in MongoDB combined with `VerificationSession` and `SourceRegistry`), all data for a user's verification and scan report lives in a single wide unnormalized structure with repeating groups and redundant attributes:

```text
SENTINEL_SCAN_SHEET(
  scan_session_id,
  scan_status,
  scan_created_at,
  scan_updated_at,
  scan_expires_at,
  verification_session_id,
  email_hash,
  otp_hmac,
  attempts,
  resend_count,
  last_sent_at,
  verified,
  session_token_hash,
  verification_expires_at,
  verification_created_at,
  sources_status,     -- repeating group: "[{source_id, source_name, timeout_ms, rate_limit_per_min, enabled, status, latency_ms, error_message}, ...]"
  findings,           -- repeating group: "[{finding_id, source_id, source_name, incident_id, identifier_type, match_type, breach_date, retrieved_at, confidence, evidence_reference, exposed_fields: ['email','password_hash',...]}, ...]"
  actions             -- repeating group: "[{action_id, action_code, priority, title, reason, category_trigger}, ...]"
)
```

### Anomalies in `SENTINEL_SCAN_SHEET`

| Anomaly Type | Concrete Example in `SENTINEL_SCAN_SHEET` |
|---|---|
| **Multi-valued / Nested Cells (Violates 1NF)** | `sources_status`, `findings`, `exposed_fields` (`['email', 'username', 'password_hash']`), and `actions` pack arrays of objects and lists into single attributes. SQL cannot enforce foreign keys, check constraints, or index lookups on individual exposed field names or per-source latencies. |
| **Update Anomaly** | A source provider's display name (`source_name`), `timeout_ms`, or `rate_limit_per_min` is repeated inside every scan's `sources_status` and `findings` entry. Renaming `'Secondary Archive Index'` or changing its timeout from `6000` to `4500` requires updating thousands of historical scan rows; missing any row leaves inconsistent metadata. Similarly, `email_hash` and `otp_hmac` repeat across every scan belonging to the same `verification_session_id`. |
| **Insertion Anomaly** | A new threat-intelligence provider (`source_id`, `source_name`, `timeout_ms`, `rate_limit_per_min`) cannot be registered in the system until at least one scan session is executed. Likewise, a newly created OTP verification session (`verification_session_id`) that has not yet started a scan cannot exist without leaving `scan_session_id` and all scan attributes `NULL`. |
| **Deletion Anomaly** | Deleting the last `scan_session` that queried `hibp_breach_feed_03` erases the provider's registration (`source_name`, `timeout_ms`, `rate_limit_per_min`) from the database. Deleting a scan session also wipes out the parent verification session record unless separated. |

---

## 3. First Normal Form (`1NF`)

**Rule for 1NF:** Every attribute must hold a single atomic value (no repeating groups, arrays, or nested objects), and every tuple must be uniquely identified by an explicit primary key.

### Transformations Applied
1. Flatten out repeating groups (`sources_status`, `findings`, `actions`) and the nested multi-valued list `exposed_fields` into separate atomic rows.
2. Separate verification-only rows that have no scan yet, or represent the flattened relation with atomic columns and explicit composite keys.
3. Explicitly decompose the four repeating groups into flat 1NF relations while keeping all functional dependencies visible for 2NF/3NF analysis:

```text
SCAN_VERIFICATION_1NF(
  scan_session_id,              -- PK
  scan_status,
  scan_created_at,
  scan_updated_at,
  scan_expires_at,
  verification_session_id,
  email_hash,
  otp_hmac,
  attempts,
  resend_count,
  last_sent_at,
  verified,
  session_token_hash,
  verification_expires_at,
  verification_created_at
)

SCAN_SOURCE_STATUS_1NF(
  scan_session_id,              -- PK (part 1)
  source_id,                    -- PK (part 2)
  source_name,
  source_enabled,
  source_timeout_ms,
  source_rate_limit_per_min,
  source_created_at,
  source_updated_at,
  status,
  latency_ms,
  error_message
)

SCAN_FINDING_1NF(
  finding_id,                   -- PK
  scan_session_id,
  source_id,
  source_name,
  incident_id,
  identifier_type,
  match_type,
  breach_date,
  retrieved_at,
  confidence,
  evidence_reference
)

FINDING_EXPOSED_FIELD_1NF(
  finding_id,                   -- PK (part 1)
  field_name                    -- PK (part 2) — atomic string ('email', 'password_hash', etc.)
)

SCAN_ACTION_1NF(
  action_id,                    -- PK
  scan_session_id,
  action_code,
  priority,
  title,
  reason,
  category_trigger
)
```

### Functional Dependencies in `1NF`
- **In `SCAN_VERIFICATION_1NF`:**
  - `FD1:` `scan_session_id -> scan_status, scan_created_at, scan_updated_at, scan_expires_at, verification_session_id`
  - `FD2:` `verification_session_id -> email_hash, otp_hmac, attempts, resend_count, last_sent_at, verified, session_token_hash, verification_expires_at, verification_created_at`
- **In `SCAN_SOURCE_STATUS_1NF` (Composite PK: `(scan_session_id, source_id)`):**
  - `FD3:` `(scan_session_id, source_id) -> status, latency_ms, error_message`
  - `FD4 (Partial Dependency!):` `source_id -> source_name, source_enabled, source_timeout_ms, source_rate_limit_per_min, source_created_at, source_updated_at`
- **In `SCAN_FINDING_1NF`:**
  - `FD5:` `finding_id -> scan_session_id, source_id, incident_id, identifier_type, match_type, breach_date, retrieved_at, confidence, evidence_reference`
  - `FD6:` `(scan_session_id, source_id, incident_id) -> finding_id`
  - `FD7 (Transitive Dependency!):` `source_id -> source_name`
- **In `FINDING_EXPOSED_FIELD_1NF`:**
  - `FD8:` `(finding_id, field_name) -> (trivial, all-key relation)`
- **In `SCAN_ACTION_1NF`:**
  - `FD9:` `action_id -> scan_session_id, action_code, priority, title, reason, category_trigger`
  - `FD10:` `(scan_session_id, priority) -> action_id`
  - `FD11:` `(scan_session_id, action_code) -> action_id`

---

## 4. Second Normal Form (`2NF`)

**Rule for 2NF:** The schema must be in 1NF, and **no non-prime attribute may depend on a proper subset of any candidate key** (eliminate partial functional dependencies on composite keys).

### Partial Dependency Found in `1NF`
In `SCAN_SOURCE_STATUS_1NF`, the primary key is composite: `(scan_session_id, source_id)`.
- However, `FD4` shows that `source_id` alone determines the provider configuration attributes:
  `source_id -> source_name, source_enabled, source_timeout_ms, source_rate_limit_per_min, source_created_at, source_updated_at`
- Those attributes do **not** depend on `scan_session_id`. Keeping them in `SCAN_SOURCE_STATUS_1NF` violates 2NF.

### Decomposition into `2NF`
We project the source-only attributes out of `SCAN_SOURCE_STATUS_1NF` into a dedicated `source_registry` table keyed by `source_id`, leaving only full-key-dependent attributes (`status`, `latency_ms`, `error_message`) in `scan_source_statuses`:

```text
source_registry(
  source_id PK,
  name UNIQUE,
  enabled,
  timeout_ms,
  rate_limit_per_min,
  created_at,
  updated_at
)
-- FDs:
--   source_id -> name, enabled, timeout_ms, rate_limit_per_min, created_at, updated_at
--   name -> source_id

scan_source_statuses(
  scan_session_id FK -> scan_sessions,
  source_id       FK -> source_registry,
  status,
  latency_ms,
  error_message,
  PRIMARY KEY (scan_session_id, source_id)
)
-- FDs:
--   (scan_session_id, source_id) -> status, latency_ms, error_message
```

All other 1NF relations either have single-attribute primary keys (`SCAN_VERIFICATION_1NF`, `SCAN_FINDING_1NF`, `SCAN_ACTION_1NF`) or no non-prime attributes (`FINDING_EXPOSED_FIELD_1NF`), so they have no partial dependencies and are now in **2NF**.

---

## 5. Third Normal Form (`3NF`)

**Rule for 3NF:** The schema must be in 2NF, and **no non-prime attribute may be transitively dependent on a candidate key** (for every non-trivial FD `X -> A`, either `X` is a superkey or `A` is a prime attribute).

### Transitive Dependencies Found in `2NF`
1. **In `SCAN_VERIFICATION_1NF`:**
   - `scan_session_id -> verification_session_id` (`FD1`) and `verification_session_id -> email_hash, otp_hmac, attempts, resend_count, last_sent_at, verified, session_token_hash, verification_expires_at, verification_created_at` (`FD2`).
   - Since `verification_session_id` is **not** a candidate key of `SCAN_VERIFICATION_1NF` (one verified session can trigger a retry scan), all verification attributes transitively depend on `scan_session_id` through `verification_session_id`.
2. **In `SCAN_FINDING_1NF`:**
   - `finding_id -> source_id` (`FD5`) and `source_id -> source_name` (`FD7`).
   - `source_name` is transitively determined by `finding_id` via `source_id`.

### Decomposition into `3NF`
1. Split `SCAN_VERIFICATION_1NF` into `verification_sessions` (keyed by `verification_session_id`) and `scan_sessions` (keyed by `scan_session_id`, holding `verification_session_id` as a foreign key).
2. Remove `source_name` from `SCAN_FINDING_1NF` to form `scan_findings`, referencing `source_registry(source_id)` via foreign key and retrieving `source_registry.name` via `JOIN`.

### Resulting `3NF` Relations & Functional Dependencies

1. **`verification_sessions`**
   - **Columns:** `(verification_session_id PK, email_hash, otp_hmac, attempts, resend_count, last_sent_at, verified, session_token_hash, expires_at, created_at)`
   - **Candidate Key:** `{verification_session_id}`
   - **FDs:** `verification_session_id -> email_hash, otp_hmac, attempts, resend_count, last_sent_at, verified, session_token_hash, expires_at, created_at`
2. **`source_registry`**
   - **Columns:** `(source_id PK, name UNIQUE, enabled, timeout_ms, rate_limit_per_min, created_at, updated_at)`
   - **Candidate Keys:** `{source_id}`, `{name}`
   - **FDs:**
     - `source_id -> name, enabled, timeout_ms, rate_limit_per_min, created_at, updated_at`
     - `name -> source_id, enabled, timeout_ms, rate_limit_per_min, created_at, updated_at`
3. **`scan_sessions`**
   - **Columns:** `(scan_session_id PK, verification_session_id FK, status, expires_at, created_at, updated_at)`
   - **Candidate Key:** `{scan_session_id}`
   - **FDs:** `scan_session_id -> verification_session_id, status, expires_at, created_at, updated_at`
4. **`scan_source_statuses`**
   - **Columns:** `(scan_session_id FK, source_id FK, status, latency_ms, error_message, PK(scan_session_id, source_id))`
   - **Candidate Key:** `{scan_session_id, source_id}`
   - **FDs:** `(scan_session_id, source_id) -> status, latency_ms, error_message`
5. **`scan_findings`**
   - **Columns:** `(finding_id PK, scan_session_id FK, source_id FK, incident_id, identifier_type, match_type, breach_date, retrieved_at, confidence, evidence_reference, UNIQUE(scan_session_id, source_id, incident_id))`
   - **Candidate Keys:** `{finding_id}`, `{scan_session_id, source_id, incident_id}`
   - **FDs:**
     - `finding_id -> scan_session_id, source_id, incident_id, identifier_type, match_type, breach_date, retrieved_at, confidence, evidence_reference`
     - `(scan_session_id, source_id, incident_id) -> finding_id, identifier_type, match_type, breach_date, retrieved_at, confidence, evidence_reference`
6. **`finding_exposed_fields`**
   - **Columns:** `(finding_id FK, field_name, PK(finding_id, field_name))`
   - **Candidate Key:** `{finding_id, field_name}`
   - **FDs:** Trivial dependencies only (all-key relation).
7. **`scan_actions`**
   - **Columns:** `(action_id PK, scan_session_id FK, action_code, priority, title, reason, category_trigger, UNIQUE(scan_session_id, priority), UNIQUE(scan_session_id, action_code))`
   - **Candidate Keys:** `{action_id}`, `{scan_session_id, priority}`, `{scan_session_id, action_code}`
   - **FDs:**
     - `action_id -> scan_session_id, action_code, priority, title, reason, category_trigger`
     - `(scan_session_id, priority) -> action_id, action_code, title, reason, category_trigger`
     - `(scan_session_id, action_code) -> action_id, priority, title, reason, category_trigger`

---

## 6. Boyce-Codd Normal Form (`BCNF`) Verification

**Rule for BCNF:** For **every** non-trivial functional dependency `X -> Y` in every relation, `X` must be a **superkey** of that relation.

| Table | Candidate Keys | Non-Trivial Functional Dependencies (`X -> Y`) | Is Every Determinant `X` a Superkey? | Normal Form |
|---|---|---|---|---|
| `verification_sessions` | `{verification_session_id}` | `verification_session_id -> all other columns` | Yes | **BCNF** |
| `source_registry` | `{source_id}`, `{name}` | `source_id -> all`, `name -> all` | Yes (both `source_id` and `name` are UNIQUE candidate keys) | **BCNF** |
| `scan_sessions` | `{scan_session_id}` | `scan_session_id -> all other columns` | Yes | **BCNF** |
| `scan_source_statuses` | `{scan_session_id, source_id}` | `(scan_session_id, source_id) -> status, latency_ms, error_message` | Yes | **BCNF** |
| `scan_findings` | `{finding_id}`, `{scan_session_id, source_id, incident_id}` | `finding_id -> all`, `(scan_session_id, source_id, incident_id) -> all` | Yes (enforced via `PRIMARY KEY` and `UNIQUE (scan_session_id, source_id, incident_id)`) | **BCNF** |
| `finding_exposed_fields` | `{finding_id, field_name}` | None (all attributes are part of the primary key) | Yes | **BCNF** |
| `scan_actions` | `{action_id}`, `{scan_session_id, priority}`, `{scan_session_id, action_code}` | `action_id -> all`, `(scan_session_id, priority) -> all`, `(scan_session_id, action_code) -> all` | Yes (enforced via `PRIMARY KEY` and two `UNIQUE` constraints) | **BCNF** |

Because every determinant in all seven relations is a candidate key (superkey) enforced by `PRIMARY KEY` or `UNIQUE` constraints in [03_schema.sql](file:///Users/ekanshshrotriya/Documents/Sentinel/dbms/03_schema.sql), the entire Sentinel PostgreSQL schema is in **Boyce-Codd Normal Form (BCNF)** and preserves both **lossless-join** and **dependency-preservation** properties.
