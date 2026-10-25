CREATE TABLE IF NOT EXISTS app_agent_reports (
  id TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  agent_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  report_json TEXT NOT NULL,
  report_chunk_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS app_agent_reports_created_idx
  ON app_agent_reports(created_at DESC);

CREATE TABLE IF NOT EXISTS app_agent_report_chunks (
  report_id TEXT NOT NULL REFERENCES app_agent_reports(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  PRIMARY KEY(report_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS app_agent_report_chunks_report_idx
  ON app_agent_report_chunks(report_id, chunk_index);
