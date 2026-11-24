-- =====================================================================
-- CP3: Sentinel Application & Analytics SQL Queries (R1-R12 READ, W1-W6 WRITE)
-- Team T0058 (Sentinel) — Privacy-First Personal Data Exposure Platform
-- Every query includes its ID and exact uppercase -- READ or -- WRITE marker.
-- Sample parameters match deterministic seed rows in 06_seed_data.sql.
-- =====================================================================

-- R1 -- READ : Verify active ownership session by ID, token hash, and email hash (startScan auth check)
SELECT vs.verification_session_id,
       vs.verified,
       vs.expires_at,
       COUNT(ss.scan_session_id) AS existing_scans
FROM verification_sessions vs
LEFT JOIN scan_sessions ss
       ON ss.verification_session_id = vs.verification_session_id
WHERE vs.verification_session_id = 1
  AND vs.verified = TRUE
  AND vs.expires_at > NOW()
  AND vs.session_token_hash = repeat('c3', 32)
  AND vs.email_hash = repeat('a1', 32)
GROUP BY vs.verification_session_id, vs.verified, vs.expires_at;

-- R2 -- READ : Get scan status, per-source execution statuses, and finding count (getScanStatus polling)
SELECT ss.scan_session_id,
       ss.status AS scan_status,
       sr.source_id,
       sr.name AS source_name,
       sss.status AS source_status,
       sss.latency_ms,
       sss.error_message,
       COUNT(sf.finding_id) AS source_finding_count
FROM scan_sessions ss
JOIN scan_source_statuses sss
  ON sss.scan_session_id = ss.scan_session_id
JOIN source_registry sr
  ON sr.source_id = sss.source_id
LEFT JOIN scan_findings sf
       ON sf.scan_session_id = ss.scan_session_id
      AND sf.source_id = sr.source_id
WHERE ss.scan_session_id = 1
GROUP BY ss.scan_session_id,
         ss.status,
         sr.source_id,
         sr.name,
         sss.status,
         sss.latency_ms,
         sss.error_message
ORDER BY sr.source_id;

-- R3 -- READ : Get normalized findings with source names and aggregated exposed fields for a scan (getScanFindings)
SELECT sf.finding_id,
       sf.scan_session_id,
       sf.source_id,
       sr.name AS source_name,
       sf.incident_id,
       sf.identifier_type,
       sf.match_type,
       sf.breach_date,
       sf.retrieved_at,
       sf.confidence,
       sf.evidence_reference,
       ARRAY_AGG(fef.field_name ORDER BY fef.field_name) AS exposed_fields
FROM scan_findings sf
JOIN scan_sessions ss
  ON ss.scan_session_id = sf.scan_session_id
JOIN source_registry sr
  ON sr.source_id = sf.source_id
JOIN finding_exposed_fields fef
  ON fef.finding_id = sf.finding_id
WHERE sf.scan_session_id = 1
GROUP BY sf.finding_id,
         sf.scan_session_id,
         sf.source_id,
         sr.name,
         sf.incident_id,
         sf.identifier_type,
         sf.match_type,
         sf.breach_date,
         sf.retrieved_at,
         sf.confidence,
         sf.evidence_reference
ORDER BY sf.breach_date DESC, sf.finding_id;

-- R4 -- READ : Get prioritized remediation action plan for a completed scan (getScanFindings actions)
SELECT sa.action_id,
       sa.scan_session_id,
       ss.status AS scan_status,
       sa.priority,
       sa.action_code,
       sa.title,
       sa.reason,
       sa.category_trigger
FROM scan_actions sa
JOIN scan_sessions ss
  ON ss.scan_session_id = sa.scan_session_id
WHERE sa.scan_session_id = 1
ORDER BY sa.priority ASC;

-- R5 -- READ : Fetch enabled threat-intelligence sources with timeout and rate-limit configuration (runScanPipeline)
SELECT sr.source_id,
       sr.name,
       sr.enabled,
       sr.timeout_ms,
       sr.rate_limit_per_min,
       COUNT(sss.scan_session_id) AS total_scans_assigned
FROM source_registry sr
LEFT JOIN scan_source_statuses sss
       ON sss.source_id = sr.source_id
WHERE sr.enabled = TRUE
GROUP BY sr.source_id, sr.name, sr.enabled, sr.timeout_ms, sr.rate_limit_per_min
ORDER BY sr.source_id;

-- R6 -- READ : Source reliability, timeout rate, and average latency report across all scans
SELECT sr.source_id,
       sr.name AS source_name,
       COUNT(sss.scan_session_id) AS total_checks,
       COUNT(*) FILTER (WHERE sss.status = 'success') AS success_count,
       COUNT(*) FILTER (WHERE sss.status = 'timeout') AS timeout_count,
       COUNT(*) FILTER (WHERE sss.status = 'failed') AS failed_count,
       ROUND(AVG(sss.latency_ms) FILTER (WHERE sss.status = 'success'), 2) AS avg_success_latency_ms
FROM source_registry sr
JOIN scan_source_statuses sss
  ON sss.source_id = sr.source_id
GROUP BY sr.source_id, sr.name
ORDER BY success_count DESC, sr.source_id;

-- R7 -- READ : Most frequently exposed personal data field categories across completed scans
SELECT fef.field_name,
       COUNT(DISTINCT sf.finding_id) AS finding_occurrences,
       COUNT(DISTINCT sf.scan_session_id) AS affected_scans
FROM finding_exposed_fields fef
JOIN scan_findings sf
  ON sf.finding_id = fef.finding_id
JOIN scan_sessions ss
  ON ss.scan_session_id = sf.scan_session_id
WHERE ss.status = 'completed'
GROUP BY fef.field_name
ORDER BY finding_occurrences DESC, fef.field_name;

-- R8 -- READ : Scan execution summary grouped by scan status and verification attempt tier
SELECT ss.status AS scan_status,
       vs.attempts AS verification_attempts_used,
       COUNT(ss.scan_session_id) AS scan_count,
       MIN(ss.created_at) AS earliest_scan_at,
       MAX(ss.created_at) AS latest_scan_at
FROM scan_sessions ss
JOIN verification_sessions vs
  ON vs.verification_session_id = ss.verification_session_id
GROUP BY ss.status, vs.attempts
ORDER BY scan_count DESC, ss.status;

-- R9 -- READ : Partial and failed scans with degraded source details and error messages
SELECT ss.scan_session_id,
       ss.status AS scan_status,
       sr.source_id,
       sr.name AS source_name,
       sss.status AS source_outcome,
       sss.latency_ms,
       sss.error_message,
       ss.created_at
FROM scan_sessions ss
JOIN scan_source_statuses sss
  ON sss.scan_session_id = ss.scan_session_id
JOIN source_registry sr
  ON sr.source_id = sss.source_id
WHERE ss.status IN ('partial', 'failed')
  AND sss.status IN ('timeout', 'failed')
ORDER BY ss.created_at DESC, ss.scan_session_id DESC
LIMIT 25;

-- R10 -- READ : Active non-expired verification sessions pending OTP confirmation with remaining attempts
SELECT vs.verification_session_id,
       vs.email_hash,
       vs.attempts,
       (5 - vs.attempts) AS attempts_remaining,
       vs.resend_count,
       vs.last_sent_at,
       vs.expires_at
FROM verification_sessions vs
LEFT JOIN scan_sessions ss
       ON ss.verification_session_id = vs.verification_session_id
WHERE vs.verified = FALSE
  AND vs.expires_at > NOW()
  AND vs.attempts < 5
  AND ss.scan_session_id IS NULL
ORDER BY vs.expires_at ASC
LIMIT 25;

-- R11 -- READ : Cross-source incident deduplication candidates (same incident reported by multiple sources in one scan)
SELECT sf.scan_session_id,
       sf.incident_id,
       sf.breach_date,
       COUNT(DISTINCT sf.source_id) AS reporting_sources,
       STRING_AGG(DISTINCT sr.name, ', ' ORDER BY sr.name) AS source_names
FROM scan_findings sf
JOIN scan_sessions ss
  ON ss.scan_session_id = sf.scan_session_id
JOIN source_registry sr
  ON sr.source_id = sf.source_id
WHERE ss.status IN ('completed', 'partial')
GROUP BY sf.scan_session_id, sf.incident_id, sf.breach_date
HAVING COUNT(DISTINCT sf.source_id) > 1
ORDER BY reporting_sources DESC, sf.scan_session_id ASC
LIMIT 25;

-- R12 -- READ : Completed scans exposing password hashes alongside high-priority credential remediation actions
SELECT ss.scan_session_id,
       vs.email_hash,
       COUNT(DISTINCT sf.finding_id) AS password_findings,
       sa.action_code,
       sa.priority,
       sa.title
FROM scan_sessions ss
JOIN verification_sessions vs
  ON vs.verification_session_id = ss.verification_session_id
JOIN scan_findings sf
  ON sf.scan_session_id = ss.scan_session_id
JOIN finding_exposed_fields fef
  ON fef.finding_id = sf.finding_id
JOIN scan_actions sa
  ON sa.scan_session_id = ss.scan_session_id
WHERE ss.status = 'completed'
  AND fef.field_name = 'password_hash'
  AND sa.action_code = 'act_change_password'
GROUP BY ss.scan_session_id, vs.email_hash, sa.action_code, sa.priority, sa.title
ORDER BY password_findings DESC, ss.scan_session_id ASC
LIMIT 25;

-- W1 -- WRITE : Create a new OTP verification session (startVerification)
INSERT INTO verification_sessions (
    email_hash,
    otp_hmac,
    attempts,
    resend_count,
    last_sent_at,
    verified,
    session_token_hash,
    expires_at,
    created_at
)
VALUES (
    repeat('1a', 32),
    repeat('2b', 32),
    0,
    0,
    NOW(),
    FALSE,
    NULL,
    NOW() + INTERVAL '10 minutes',
    NOW()
)
RETURNING verification_session_id, expires_at;

-- W2 -- WRITE : Increment failed OTP attempts on invalid verification code (confirmVerification failure)
UPDATE verification_sessions
SET attempts = attempts + 1
WHERE verification_session_id = 4501
  AND verified = FALSE
  AND attempts < 5
  AND expires_at > NOW()
RETURNING verification_session_id, attempts, (5 - attempts) AS attempts_remaining;

-- W3 -- WRITE : Confirm OTP verification session, store session token hash, and extend expiry by 15 minutes (confirmVerification success)
UPDATE verification_sessions
SET verified = TRUE,
    session_token_hash = repeat('f6', 32),
    expires_at = NOW() + INTERVAL '15 minutes'
WHERE verification_session_id = 4501
  AND verified = FALSE
  AND attempts < 5
  AND expires_at > NOW()
RETURNING verification_session_id, verified, expires_at;

-- W4 -- WRITE : Rotate OTP hash, increment resend count, and reset attempt counter (resendVerification)
UPDATE verification_sessions
SET otp_hmac = repeat('9e', 32),
    resend_count = resend_count + 1,
    attempts = 0,
    last_sent_at = NOW()
WHERE verification_session_id = 4501
  AND verified = FALSE
  AND resend_count < 3
  AND expires_at > NOW()
RETURNING verification_session_id, resend_count, last_sent_at;

-- W5 -- WRITE : Start a new scan session and seed pending rows for all enabled sources (startScan data-modifying CTE)
WITH new_scan AS (
    INSERT INTO scan_sessions (
        verification_session_id,
        status,
        expires_at,
        created_at,
        updated_at
    )
    VALUES (
        1,
        'running',
        NOW() + INTERVAL '20 minutes',
        NOW(),
        NOW()
    )
    RETURNING scan_session_id
)
INSERT INTO scan_source_statuses (
    scan_session_id,
    source_id,
    status,
    latency_ms,
    error_message
)
SELECT ns.scan_session_id,
       sr.source_id,
       'pending',
       NULL,
       NULL
FROM new_scan ns
CROSS JOIN source_registry sr
WHERE sr.enabled = TRUE
RETURNING scan_session_id, source_id, status;

-- W6 -- WRITE : Hard-delete a scan session and its parent verification session (deleteScan privacy cleanup)
WITH target_scan AS (
    DELETE FROM scan_sessions
    WHERE scan_session_id = 8000
    RETURNING verification_session_id
)
DELETE FROM verification_sessions vs
USING target_scan ts
WHERE vs.verification_session_id = ts.verification_session_id
RETURNING vs.verification_session_id;
