-- =====================================================================
-- CP2 / CP3: Sentinel Normalized PostgreSQL Schema (3NF / BCNF)
-- Team T0058 (Sentinel) — Privacy-First Personal Data Exposure Platform
-- Compatible with PostgreSQL 14+
-- =====================================================================

DROP TABLE IF EXISTS scan_actions CASCADE;
DROP TABLE IF EXISTS finding_exposed_fields CASCADE;
DROP TABLE IF EXISTS scan_findings CASCADE;
DROP TABLE IF EXISTS scan_source_statuses CASCADE;
DROP TABLE IF EXISTS scan_sessions CASCADE;
DROP TABLE IF EXISTS source_registry CASCADE;
DROP TABLE IF EXISTS verification_sessions CASCADE;

-- 1. Ownership Verification Sessions (never stores plaintext email or OTP)
CREATE TABLE verification_sessions (
    verification_session_id BIGSERIAL PRIMARY KEY,
    email_hash              CHAR(64)     NOT NULL,
    otp_hmac                CHAR(64)     NOT NULL,
    attempts                SMALLINT     NOT NULL DEFAULT 0,
    resend_count            SMALLINT     NOT NULL DEFAULT 0,
    last_sent_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    verified                BOOLEAN      NOT NULL DEFAULT FALSE,
    session_token_hash      CHAR(64),
    expires_at              TIMESTAMPTZ  NOT NULL,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_vs_attempts
        CHECK (attempts BETWEEN 0 AND 5),
    CONSTRAINT chk_vs_resend_count
        CHECK (resend_count BETWEEN 0 AND 3),
    CONSTRAINT chk_vs_expires_after_sent
        CHECK (expires_at > last_sent_at),
    CONSTRAINT chk_vs_verified_token
        CHECK (verified = FALSE OR session_token_hash IS NOT NULL)
);

-- 2. Threat-Intelligence Source Registry (API secrets remain in .env only)
CREATE TABLE source_registry (
    source_id          VARCHAR(64)  PRIMARY KEY,
    name               VARCHAR(120) NOT NULL UNIQUE,
    enabled            BOOLEAN      NOT NULL DEFAULT TRUE,
    timeout_ms         INTEGER      NOT NULL DEFAULT 6000,
    rate_limit_per_min INTEGER      NOT NULL DEFAULT 60,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sr_timeout
        CHECK (timeout_ms >= 100),
    CONSTRAINT chk_sr_rate_limit
        CHECK (rate_limit_per_min >= 1)
);

-- 3. Scan Sessions (ephemeral scan execution linked to a verified session)
CREATE TABLE scan_sessions (
    scan_session_id         BIGSERIAL   PRIMARY KEY,
    verification_session_id BIGINT      NOT NULL
        REFERENCES verification_sessions(verification_session_id) ON DELETE CASCADE,
    status                  VARCHAR(16) NOT NULL DEFAULT 'running',
    expires_at              TIMESTAMPTZ NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_ss_status
        CHECK (status IN ('running', 'completed', 'partial', 'failed', 'cancelled')),
    CONSTRAINT chk_ss_expires_after_created
        CHECK (expires_at > created_at)
);

-- 4. Per-Source Execution Statuses per Scan (no source_name stored -> 3NF)
CREATE TABLE scan_source_statuses (
    scan_session_id BIGINT      NOT NULL
        REFERENCES scan_sessions(scan_session_id) ON DELETE CASCADE,
    source_id       VARCHAR(64) NOT NULL
        REFERENCES source_registry(source_id) ON DELETE RESTRICT,
    status          VARCHAR(16) NOT NULL DEFAULT 'pending',
    latency_ms      INTEGER,
    error_message   TEXT,
    PRIMARY KEY (scan_session_id, source_id),
    CONSTRAINT chk_sss_status
        CHECK (status IN ('pending', 'success', 'timeout', 'failed')),
    CONSTRAINT chk_sss_latency
        CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

-- 5. Normalized Breach Findings per Scan
CREATE TABLE scan_findings (
    finding_id         BIGSERIAL    PRIMARY KEY,
    scan_session_id    BIGINT       NOT NULL
        REFERENCES scan_sessions(scan_session_id) ON DELETE CASCADE,
    source_id          VARCHAR(64)  NOT NULL
        REFERENCES source_registry(source_id) ON DELETE RESTRICT,
    incident_id        VARCHAR(120) NOT NULL,
    identifier_type    VARCHAR(32)  NOT NULL DEFAULT 'email',
    match_type         VARCHAR(32)  NOT NULL DEFAULT 'exact',
    breach_date        DATE,
    retrieved_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    confidence         VARCHAR(16)  NOT NULL DEFAULT 'high',
    evidence_reference TEXT         NOT NULL,
    CONSTRAINT uq_sf_scan_source_incident
        UNIQUE (scan_session_id, source_id, incident_id),
    CONSTRAINT chk_sf_identifier_type
        CHECK (identifier_type IN ('email')),
    CONSTRAINT chk_sf_match_type
        CHECK (match_type IN ('exact')),
    CONSTRAINT chk_sf_confidence
        CHECK (confidence IN ('high', 'medium', 'low'))
);

-- 6. Atomic Exposed Fields per Finding (decomposes exposedFields[] for 1NF)
CREATE TABLE finding_exposed_fields (
    finding_id BIGINT      NOT NULL
        REFERENCES scan_findings(finding_id) ON DELETE CASCADE,
    field_name VARCHAR(64) NOT NULL,
    PRIMARY KEY (finding_id, field_name),
    CONSTRAINT chk_fef_field_name
        CHECK (field_name IN (
            'email',
            'username',
            'password_hash',
            'password',
            'phone_number',
            'ip_address',
            'full_name',
            'mailing_address'
        ))
);

-- 7. Prioritized Remediation Action Plan per Scan
CREATE TABLE scan_actions (
    action_id        BIGSERIAL    PRIMARY KEY,
    scan_session_id  BIGINT       NOT NULL
        REFERENCES scan_sessions(scan_session_id) ON DELETE CASCADE,
    action_code      VARCHAR(64)  NOT NULL,
    priority         SMALLINT     NOT NULL,
    title            VARCHAR(200) NOT NULL,
    reason           TEXT         NOT NULL,
    category_trigger VARCHAR(64)  NOT NULL,
    CONSTRAINT uq_sa_scan_priority
        UNIQUE (scan_session_id, priority),
    CONSTRAINT uq_sa_scan_action_code
        UNIQUE (scan_session_id, action_code),
    CONSTRAINT chk_sa_priority
        CHECK (priority > 0)
);

-- Supporting Indexes for Application Queries & Analytics
CREATE INDEX idx_vs_email_hash
    ON verification_sessions(email_hash);

CREATE INDEX idx_vs_pending_expiry
    ON verification_sessions(expires_at, attempts)
    WHERE verified = FALSE;

CREATE INDEX idx_ss_verification_id
    ON scan_sessions(verification_session_id);

CREATE INDEX idx_ss_status_created
    ON scan_sessions(status, created_at DESC);

CREATE INDEX idx_sss_source_status
    ON scan_source_statuses(source_id, status);

CREATE INDEX idx_sf_scan_session
    ON scan_findings(scan_session_id);

CREATE INDEX idx_sf_incident_date
    ON scan_findings(incident_id, breach_date);

CREATE INDEX idx_fef_field_name
    ON finding_exposed_fields(field_name);

CREATE INDEX idx_sa_scan_priority
    ON scan_actions(scan_session_id, priority);
