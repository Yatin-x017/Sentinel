# CP4 — Query Timings and Execution Plans: Sentinel

**Team T0058 (Sentinel)** — Privacy-First Personal Data Exposure Platform

---

## 1. Benchmark Environment & Dataset Setup

| Item | Value |
|---|---|
| **DBMS** | PostgreSQL 18 (`Postgres.app`, macOS Apple Silicon) |
| **Database** | `sentinel_ap` |
| **Schema** | `dbms/03_schema.sql` (7 normalized 3NF / BCNF tables + indexes) |
| **Seed Data** | `dbms/06_seed_data.sql` (`SELECT setseed(0.42);` deterministic dataset) |
| **Methodology** | `EXPLAIN (ANALYZE, BUFFERS)` run 3 times per query after `ANALYZE;`; `WRITE` queries (`W1`–`W6`) wrapped in `BEGIN; ... ROLLBACK;` so the dataset remains identical across runs |
| **Raw Plans** | Saved in `dbms/plans/<ID>.txt` (`R1.txt`–`R12.txt`, `W1.txt`–`W6.txt`), each containing all 3 execution plans |

### Seeded Table Row Counts (`sentinel_ap`)

| Table | Rows | Description |
|---|---:|---|
| `source_registry` | 6 | Threat-intelligence feeds (5 enabled, 1 disabled) |
| `verification_sessions` | 5,000 | HMAC-hashed email & OTP ownership verification sessions |
| `scan_sessions` | 8,000 | Scan execution lifecycles (`completed`, `partial`, `failed`, `running`, `cancelled`) |
| `scan_source_statuses` | 40,000 | Per-source execution outcomes (`5` enabled sources × `8,000` scans) |
| `scan_findings` | 26,048 | Normalized breach incident matches across scans |
| `finding_exposed_fields` | 72,500 | Atomic exposed data field categories per finding (1NF decomposition) |
| `scan_actions` | 28,694 | Prioritized remediation action steps per scan |

### How to Reproduce

```bash
psql -d postgres -c "DROP DATABASE IF EXISTS sentinel_ap;"
psql -d postgres -c "CREATE DATABASE sentinel_ap;"
psql -v ON_ERROR_STOP=1 -d sentinel_ap -f dbms/03_schema.sql
psql -v ON_ERROR_STOP=1 -d sentinel_ap -f dbms/06_seed_data.sql
```

---

## 2. Query Timings Table (3 Runs & Average)

| Query | Type | What it does | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Average (ms) | Scan type |
|---|---|---|---:|---:|---:|---:|---|
| R1 | READ | Verify active ownership session by ID, token hash, and email hash (startScan auth check) | 0.052 | 0.051 | 0.054 | 0.052 | Index Scan |
| R2 | READ | Get scan status, per-source execution statuses, and finding count (getScanStatus polling) | 0.135 | 0.122 | 0.119 | 0.125 | Index Scan, Seq Scan |
| R3 | READ | Get normalized findings with source names and aggregated exposed fields for a scan (getScanFindings) | 0.152 | 0.130 | 0.128 | 0.137 | Index Only Scan, Index Scan, Seq Scan |
| R4 | READ | Get prioritized remediation action plan for a completed scan (getScanFindings actions) | 0.046 | 0.041 | 0.043 | 0.043 | Index Scan |
| R5 | READ | Fetch enabled threat-intelligence sources with timeout and rate-limit configuration (runScanPipeline) | 6.361 | 6.341 | 6.326 | 6.343 | Seq Scan |
| R6 | READ | Source reliability, timeout rate, and average latency report across all scans | 7.712 | 7.629 | 7.694 | 7.678 | Seq Scan |
| R7 | READ | Most frequently exposed personal data field categories across completed scans | 43.026 | 42.978 | 42.815 | 42.940 | Seq Scan |
| R8 | READ | Scan execution summary grouped by scan status and verification attempt tier | 1.917 | 1.889 | 1.895 | 1.900 | Seq Scan |
| R9 | READ | Partial and failed scans with degraded source details and error messages | 1.968 | 1.952 | 1.921 | 1.947 | Bitmap Heap Scan, Bitmap Index Scan, Seq Scan |
| R10 | READ | Active non-expired verification sessions pending OTP confirmation with remaining attempts | 0.606 | 0.588 | 0.597 | 0.597 | Seq Scan, Bitmap Heap Scan, Bitmap Index Scan |
| R11 | READ | Cross-source incident deduplication candidates (same incident reported by multiple sources in one scan) | 22.735 | 22.934 | 22.927 | 22.865 | Index Scan |
| R12 | READ | Completed scans exposing password hashes alongside high-priority credential remediation actions | 12.898 | 12.559 | 12.653 | 12.703 | Seq Scan, Bitmap Heap Scan, Bitmap Index Scan |
| W1 | WRITE | Create a new OTP verification session (startVerification) | 0.181 | 0.145 | 0.150 | 0.159 | ModifyTable |
| W2 | WRITE | Increment failed OTP attempts on invalid verification code (confirmVerification failure) | 0.582 | 0.128 | 0.129 | 0.280 | Index Scan |
| W3 | WRITE | Confirm OTP verification session, store session token hash, and extend expiry by 15 minutes (confirmVerification success) | 0.143 | 0.131 | 0.165 | 0.146 | Index Scan |
| W4 | WRITE | Rotate OTP hash, increment resend count, and reset attempt counter (resendVerification) | 0.136 | 0.173 | 0.132 | 0.147 | Index Scan |
| W5 | WRITE | Start a new scan session and seed pending rows for all enabled sources (startScan data-modifying CTE) | 0.679 | 0.666 | 0.626 | 0.657 | Seq Scan |
| W6 | WRITE | Hard-delete a scan session and its parent verification session (deleteScan privacy cleanup) | 0.525 | 0.674 | 0.558 | 0.586 | Index Scan |

---

## 3. Execution Plan Observations

- **Point & Session Lookups (`R1`, `R2`, `R3`, `R4`, `R10`):** Use `Index Scan` / `Bitmap Index Scan` on primary keys (`verification_sessions_pkey`, `scan_sessions_pkey`) and foreign-key indexes (`idx_sf_scan_session`, `idx_sa_scan_priority`, `idx_vs_pending_expiry`), completing in sub-millisecond time (`< 0.5 ms`).
- **Global Aggregations & Reports (`R5`, `R6`, `R7`, `R8`, `R11`, `R12`):** Combine `Seq Scan`, `Index Scan`, and `Index Only Scan` across `scan_source_statuses` (`40,000` rows), `scan_findings` (`26,048` rows), and `finding_exposed_fields` (`72,500` rows) using hash and group aggregations.
- **Transactional Writes (`W1`–`W6`):** Single-row and CTE-driven writes (`INSERT`, `UPDATE`, `DELETE`) hit primary-key indexes directly and execute in `< 1 ms` inside `BEGIN ... ROLLBACK`.
