-- Machine credentials for Cloudflare-backed GuardRails workspaces. Only the
-- SHA-256 digest is stored; the raw key is returned once at creation time.
CREATE TABLE IF NOT EXISTS app_workspace_api_keys (
  id TEXT PRIMARY KEY NOT NULL,
  team_id TEXT NOT NULL REFERENCES app_teams(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes_json TEXT NOT NULL DEFAULT '["gate:read","collector:write"]',
  created_by TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  last_used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS app_workspace_api_keys_team_idx
  ON app_workspace_api_keys(team_id, created_at DESC);
