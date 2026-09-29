-- Keep worker claims and candidate deduplication bounded as the scan queue grows.
CREATE INDEX IF NOT EXISTS app_scan_jobs_claim_build_idx
  ON app_scan_jobs(status, expected_scanner_build, created_at);

CREATE INDEX IF NOT EXISTS app_scan_jobs_public_identity_idx
  ON app_scan_jobs(scan_purpose, expected_scanner_build, extension_id, version, status);
