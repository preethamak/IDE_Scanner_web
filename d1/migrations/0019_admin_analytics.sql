-- Optional visitor telemetry and operational request health. No raw IPs, prompts,
-- provider responses, search text, full referrer URLs, or auth tokens.
CREATE TABLE IF NOT EXISTS app_analytics_events (
  id TEXT PRIMARY KEY NOT NULL,
  occurred_at TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  session_id TEXT NOT NULL DEFAULT '',
  user_id TEXT,
  referrer TEXT NOT NULL DEFAULT '',
  utm_source TEXT NOT NULL DEFAULT '',
  utm_medium TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT '',
  browser TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  asn TEXT NOT NULL DEFAULT '',
  bot_score INTEGER,
  provider TEXT NOT NULL DEFAULT '',
  operation TEXT NOT NULL DEFAULT '',
  status INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS app_analytics_time_idx ON app_analytics_events(occurred_at);
CREATE INDEX IF NOT EXISTS app_analytics_name_idx ON app_analytics_events(name,occurred_at);
CREATE INDEX IF NOT EXISTS app_analytics_session_idx ON app_analytics_events(session_id,occurred_at);
CREATE TABLE IF NOT EXISTS app_analytics_limits (
  key TEXT PRIMARY KEY NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS app_analytics_limits_expiry_idx ON app_analytics_limits(expires_at);
CREATE TABLE IF NOT EXISTS app_blog_posts (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS app_blog_public_idx ON app_blog_posts(status,published_at);
