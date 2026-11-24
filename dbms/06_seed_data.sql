-- =====================================================================
-- CP4: Deterministic Synthetic Seed Data for Sentinel (`sentinel_ap`)
-- Team T0058 (Sentinel)
-- Populates:
--   6      source_registry feeds (5 enabled, 1 disabled)
--   5,000  verification_sessions
--   8,000  scan_sessions
--   40,000 scan_source_statuses
--   25,000+ scan_findings
--   65,000+ finding_exposed_fields
--   18,000+ scan_actions
-- =====================================================================

BEGIN;

SELECT setseed(0.42);

-- 1. Seed source_registry (6 feeds)
INSERT INTO source_registry (source_id, name, enabled, timeout_ms, rate_limit_per_min, created_at, updated_at)
VALUES
    ('sentinel_verified_feed_01', 'Primary Breach Metadata Feed', TRUE,  6000, 120, NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 day'),
    ('sentinel_archive_feed_02',  'Secondary Archive Index',      TRUE,  6000,  90, NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 day'),
    ('hibp_breach_feed_03',       'HaveIBeenPwned Verified Feed', TRUE,  5000,  60, NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 days'),
    ('xposed_paste_index_04',     'XposedOrNot Paste Monitor',    TRUE,  4500, 100, NOW() - INTERVAL '45 days', NOW() - INTERVAL '2 days'),
    ('credential_combo_feed_05',  'Credential Combo Metadata DB', TRUE,  5500,  80, NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day'),
    ('darkweb_dump_monitor_06',   'Legacy Darkweb Archive Feed',  FALSE, 8000,  30, NOW() - INTERVAL '120 days', NOW() - INTERVAL '10 days');

-- 2. Seed verification_sessions (5,000 rows)
-- IDs 1..4000 are verified sessions; IDs 4001..5000 are unverified or pending sessions (except 5000 which is verified for W6 test).
INSERT INTO verification_sessions (
    verification_session_id,
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
SELECT
    g AS verification_session_id,
    CASE
        WHEN g = 1    THEN repeat('a1', 32)
        WHEN g = 4501 THEN repeat('d4', 32)
        ELSE md5('email_' || (g % 2500)::text) || md5('salt_email_' || (g % 2500)::text)
    END AS email_hash,
    CASE
        WHEN g = 1    THEN repeat('b2', 32)
        WHEN g = 4501 THEN repeat('e5', 32)
        ELSE md5('otp_' || g::text) || md5('salt_otp_' || g::text)
    END AS otp_hmac,
    CASE
        WHEN g = 1    THEN 0
        WHEN g = 4501 THEN 1
        WHEN g <= 4000 THEN (g % 3)
        ELSE (g % 6)
    END AS attempts,
    CASE
        WHEN g = 1    THEN 0
        WHEN g = 4501 THEN 1
        ELSE (g % 4)
    END AS resend_count,
    CASE
        WHEN g IN (1, 4501, 5000) THEN NOW() - INTERVAL '3 minutes'
        WHEN g > 4400             THEN NOW() - ((g % 8) || ' minutes')::interval
        ELSE NOW() - ((g % 720) || ' hours')::interval
    END AS last_sent_at,
    (g <= 4000 OR g = 5000) AS verified,
    CASE
        WHEN g = 1    THEN repeat('c3', 32)
        WHEN g <= 4000 OR g = 5000 THEN md5('tok_' || g::text) || md5('salt_tok_' || g::text)
        ELSE NULL
    END AS session_token_hash,
    CASE
        WHEN g IN (1, 5000) THEN NOW() + INTERVAL '15 minutes'
        WHEN g = 4501       THEN NOW() + INTERVAL '8 minutes'
        WHEN g > 4400       THEN NOW() + (((g % 9) + 2) || ' minutes')::interval
        ELSE NOW() - ((g % 720) || ' hours')::interval + INTERVAL '15 minutes'
    END AS expires_at,
    CASE
        WHEN g IN (1, 4501, 5000) THEN NOW() - INTERVAL '4 minutes'
        WHEN g > 4400             THEN NOW() - (((g % 8) + 1) || ' minutes')::interval
        ELSE NOW() - ((g % 720) || ' hours')::interval - INTERVAL '1 minute'
    END AS created_at
FROM generate_series(1, 5000) AS g;

SELECT setval(pg_get_serial_sequence('verification_sessions', 'verification_session_id'), 5000, true);

-- 3. Seed scan_sessions (8,000 rows)
INSERT INTO scan_sessions (
    scan_session_id,
    verification_session_id,
    status,
    expires_at,
    created_at,
    updated_at
)
SELECT
    s AS scan_session_id,
    CASE
        WHEN s = 1    THEN 1
        WHEN s = 8000 THEN 5000
        ELSE ((s - 1) % 4000) + 1
    END AS verification_session_id,
    CASE
        WHEN s = 1          THEN 'completed'
        WHEN s % 20 = 0     THEN 'failed'
        WHEN s % 7 = 0      THEN 'partial'
        WHEN s % 25 = 0     THEN 'running'
        WHEN s % 33 = 0     THEN 'cancelled'
        ELSE 'completed'
    END AS status,
    NOW() - ((s % 500) || ' hours')::interval + INTERVAL '20 minutes' AS expires_at,
    NOW() - ((s % 500) || ' hours')::interval AS created_at,
    NOW() - ((s % 500) || ' hours')::interval + INTERVAL '2 seconds' AS updated_at
FROM generate_series(1, 8000) AS s;

SELECT setval(pg_get_serial_sequence('scan_sessions', 'scan_session_id'), 8000, true);

-- 4. Seed scan_source_statuses (8,000 scans * 5 enabled sources = 40,000 rows)
INSERT INTO scan_source_statuses (
    scan_session_id,
    source_id,
    status,
    latency_ms,
    error_message
)
SELECT
    ss.scan_session_id,
    sr.source_id,
    CASE
        WHEN ss.status = 'running' THEN 'pending'
        WHEN ss.status = 'failed'  THEN
            CASE WHEN (ss.scan_session_id + sr.ord) % 2 = 0 THEN 'timeout' ELSE 'failed' END
        WHEN ss.status = 'partial' AND sr.ord >= 4 THEN
            CASE WHEN (ss.scan_session_id + sr.ord) % 2 = 0 THEN 'timeout' ELSE 'failed' END
        ELSE 'success'
    END AS status,
    CASE
        WHEN ss.status = 'running' THEN NULL
        WHEN ss.status = 'failed' OR (ss.status = 'partial' AND sr.ord >= 4) THEN
            CASE WHEN (ss.scan_session_id + sr.ord) % 2 = 0 THEN sr.timeout_ms ELSE 450 + ((ss.scan_session_id * 37 + sr.ord * 19) % 900) END
        ELSE 110 + ((ss.scan_session_id * 29 + sr.ord * 43) % 650)
    END AS latency_ms,
    CASE
        WHEN ss.status = 'running' THEN NULL
        WHEN ss.status = 'failed' OR (ss.status = 'partial' AND sr.ord >= 4) THEN
            CASE
                WHEN (ss.scan_session_id + sr.ord) % 2 = 0 THEN 'Provider timeout'
                ELSE 'Upstream feed HTTP 503 unavailable'
            END
        ELSE NULL
    END AS error_message
FROM scan_sessions ss
CROSS JOIN (
    SELECT source_id, timeout_ms, ROW_NUMBER() OVER (ORDER BY source_id) AS ord
    FROM source_registry
    WHERE enabled = TRUE
) sr;

-- 5. Seed scan_findings (~26,000 rows across completed and partial scans)
INSERT INTO scan_findings (
    scan_session_id,
    source_id,
    incident_id,
    identifier_type,
    match_type,
    breach_date,
    retrieved_at,
    confidence,
    evidence_reference
)
SELECT
    sss.scan_session_id,
    sss.source_id,
    (ARRAY[
        'inc_synthetic_retail_2023',
        'inc_synthetic_newsletter_2024',
        'inc_cloud_forum_dump_2022',
        'inc_travel_booking_leak_2023',
        'inc_gaming_portal_auth_2021',
        'inc_fintech_Alert_list_2024',
        'inc_saas_workspace_export_2023',
        'inc_ecommerce_orders_2022'
    ])[((sss.scan_session_id * 3 + ascii(substr(sss.source_id, 1, 1))) % 8) + 1] AS incident_id,
    'email' AS identifier_type,
    'exact' AS match_type,
    (DATE '2021-01-15' + (((sss.scan_session_id * 17) % 1400) || ' days')::interval)::date AS breach_date,
    NOW() - ((sss.scan_session_id % 500) || ' hours')::interval AS retrieved_at,
    CASE
        WHEN sss.scan_session_id % 10 = 0 THEN 'medium'
        ELSE 'high'
    END AS confidence,
    UPPER(sss.source_id) || '/REF-' || (2021 + (sss.scan_session_id % 4))::text || '-' || lpad((sss.scan_session_id % 9999)::text, 4, '0') AS evidence_reference
FROM scan_source_statuses sss
WHERE sss.status = 'success'
  AND (sss.scan_session_id = 1 OR (sss.scan_session_id + ascii(substr(sss.source_id, 10, 1))) % 4 <> 0);

-- 6. Seed finding_exposed_fields (~68,000 rows: every finding exposes 'email' plus 1-3 additional fields)
INSERT INTO finding_exposed_fields (finding_id, field_name)
SELECT finding_id, 'email'
FROM scan_findings
UNION ALL
SELECT finding_id, 'password_hash'
FROM scan_findings
WHERE finding_id % 2 = 1
UNION ALL
SELECT finding_id, 'username'
FROM scan_findings
WHERE finding_id % 3 <> 0
UNION ALL
SELECT finding_id, 'phone_number'
FROM scan_findings
WHERE finding_id % 4 = 0
UNION ALL
SELECT finding_id, 'ip_address'
FROM scan_findings
WHERE finding_id % 5 = 0
UNION ALL
SELECT finding_id, 'full_name'
FROM scan_findings
WHERE finding_id % 6 = 0;

-- 7. Seed scan_actions (~19,000 rows across scans that produced findings)
WITH scans_with_findings AS (
    SELECT DISTINCT sf.scan_session_id,
           BOOL_OR(fef.field_name IN ('password_hash', 'password')) AS has_password,
           BOOL_OR(fef.field_name = 'phone_number') AS has_phone
    FROM scan_findings sf
    JOIN finding_exposed_fields fef ON fef.finding_id = sf.finding_id
    GROUP BY sf.scan_session_id
)
INSERT INTO scan_actions (scan_session_id, action_code, priority, title, reason, category_trigger)
SELECT
    swf.scan_session_id,
    act.action_code,
    ROW_NUMBER() OVER (PARTITION BY swf.scan_session_id ORDER BY act.ord) AS priority,
    act.title,
    act.reason,
    act.category_trigger
FROM scans_with_findings swf
JOIN LATERAL (
    SELECT 1 AS ord,
           'act_change_password' AS action_code,
           'Change the password on the affected service' AS title,
           'A password or password hash was reported in a breach record.' AS reason,
           'password_hash' AS category_trigger
    WHERE swf.has_password
    UNION ALL
    SELECT 2 AS ord,
           'act_reused_passwords' AS action_code,
           'Update any other accounts that share that password' AS title,
           'Attackers test exposed credentials across other websites.' AS reason,
           'password_hash' AS category_trigger
    WHERE swf.has_password
    UNION ALL
    SELECT 3 AS ord,
           'act_enable_mfa' AS action_code,
           'Enable multi-factor authentication (MFA)' AS title,
           'An authenticator app or security key blocks sign-ins even if a password is known.' AS reason,
           'email' AS category_trigger
    UNION ALL
    SELECT 4 AS ord,
           'act_watch_smishing' AS action_code,
           'Be cautious of unexpected SMS messages or calls' AS title,
           'Your phone number was listed alongside your email address.' AS reason,
           'phone_number' AS category_trigger
    WHERE swf.has_phone
) act ON TRUE;

COMMIT;

ANALYZE;
