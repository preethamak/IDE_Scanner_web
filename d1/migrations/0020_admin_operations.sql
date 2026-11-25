CREATE TABLE IF NOT EXISTS app_admin_members (
 user_id TEXT PRIMARY KEY REFERENCES app_users(id), role TEXT NOT NULL CHECK(role IN ('viewer','operator','editor','publisher','administrator')),
 active INTEGER NOT NULL DEFAULT 1, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS app_admin_audit (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, subject TEXT NOT NULL,
 outcome TEXT NOT NULL, details_json TEXT NOT NULL DEFAULT '{}', occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS app_admin_audit_time ON app_admin_audit(occurred_at);
CREATE TABLE IF NOT EXISTS app_admin_incidents (
 fingerprint TEXT PRIMARY KEY, kind TEXT NOT NULL, subject TEXT NOT NULL, severity TEXT NOT NULL,
 summary TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'open', first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL,
 acknowledged_by TEXT, acknowledged_at TEXT, notification_state TEXT NOT NULL DEFAULT 'pending', notified_at TEXT
);
CREATE TABLE IF NOT EXISTS app_report_notices (
 scan_id TEXT PRIMARY KEY, extension_id TEXT NOT NULL, version TEXT NOT NULL, artifact_sha256 TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('under_review','corrected','withdrawn','resolved')),
 public_note TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS app_report_notice_release ON app_report_notices(extension_id,version);
CREATE TABLE IF NOT EXISTS app_quality_cases (
 id TEXT PRIMARY KEY, scan_id TEXT NOT NULL, extension_id TEXT NOT NULL, release_version TEXT NOT NULL,
 rule_id TEXT NOT NULL, label TEXT NOT NULL CHECK(label IN ('unconfirmed','confirmed_issue','false_positive','disputed')),
 rationale TEXT NOT NULL, evidence_url TEXT NOT NULL, last_review_id TEXT, revision INTEGER NOT NULL DEFAULT 1, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS app_quality_reviews (
 id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES app_quality_cases(id), label TEXT NOT NULL,
 rationale TEXT NOT NULL, actor_id TEXT NOT NULL, occurred_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS app_llm_usage (
 id TEXT PRIMARY KEY, provider TEXT NOT NULL, model TEXT NOT NULL, input_tokens INTEGER, output_tokens INTEGER,
 input_usd_per_million REAL, output_usd_per_million REAL, pricing_version TEXT, occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS app_llm_usage_time ON app_llm_usage(occurred_at);
CREATE TABLE IF NOT EXISTS app_llm_pricing (
 provider TEXT NOT NULL, model TEXT NOT NULL, input_usd_per_million REAL NOT NULL CHECK(input_usd_per_million>=0),
 output_usd_per_million REAL NOT NULL CHECK(output_usd_per_million>=0), revision INTEGER NOT NULL DEFAULT 1,
 updated_by TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(provider,model)
);
CREATE TABLE IF NOT EXISTS app_product_facts (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, statement TEXT NOT NULL, source_url TEXT NOT NULL,
 lifecycle TEXT NOT NULL CHECK(lifecycle IN ('shipped','beta','planned')), state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','approved','withdrawn')),
 revision INTEGER NOT NULL DEFAULT 1, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL, approved_by TEXT, approved_at TEXT, expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS app_social_posts (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, caption TEXT NOT NULL, hashtags_json TEXT NOT NULL,
 slides_json TEXT NOT NULL, facts_json TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'draft'
 CHECK(state IN ('draft','in_review','approved','scheduled','preparing','processing','publishing','published','failed','unknown','cancelled','blocked')),
 revision INTEGER NOT NULL DEFAULT 1, artifact_hash TEXT NOT NULL, approved_hash TEXT, approved_by TEXT, approved_at TEXT,
 scheduled_at TEXT, company_urn TEXT, document_urn TEXT, remote_post_urn TEXT, publish_attempted_at TEXT,
 lease_until TEXT, last_error TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS app_social_posts_due ON app_social_posts(state,scheduled_at);
CREATE TABLE IF NOT EXISTS app_admin_sso_tickets (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, challenge TEXT NOT NULL, expires_at TEXT NOT NULL
);

ALTER TABLE app_workspace_api_keys ADD COLUMN expires_at TEXT;
CREATE TABLE IF NOT EXISTS app_api_key_usage (
 key_id TEXT NOT NULL, day TEXT NOT NULL, requests INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(key_id,day)
);
