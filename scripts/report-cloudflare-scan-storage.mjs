import { execFileSync } from "node:child_process";

const database = process.env.CLOUDFLARE_SCAN_DATABASE || "abscissa-scan-data";
const command = `
  SELECT 'database' AS section, 'page_count' AS metric, CAST((SELECT page_count FROM pragma_page_count) AS TEXT) AS value
  UNION ALL SELECT 'database', 'page_size', CAST((SELECT page_size FROM pragma_page_size) AS TEXT)
  UNION ALL SELECT 'database', 'freelist_count', CAST((SELECT freelist_count FROM pragma_freelist_count) AS TEXT)
  UNION ALL SELECT 'reports', 'rows', CAST(COUNT(*) AS TEXT) FROM app_scan_reports
  UNION ALL SELECT 'reports', 'report_json_chars', CAST(COALESCE(SUM(length(report_json)), 0) AS TEXT) FROM app_scan_reports
  UNION ALL SELECT 'report_chunks', 'rows', CAST(COUNT(*) AS TEXT) FROM app_scan_report_chunks
  UNION ALL SELECT 'report_chunks', 'content_chars', CAST(COALESCE(SUM(length(content)), 0) AS TEXT) FROM app_scan_report_chunks
  UNION ALL SELECT 'previews', 'rows', CAST(COUNT(*) AS TEXT) FROM app_scan_report_previews
  UNION ALL SELECT 'previews', 'content_chars', CAST(COALESCE(SUM(length(content)), 0) AS TEXT) FROM app_scan_report_previews
  UNION ALL SELECT 'jobs', 'rows', CAST(COUNT(*) AS TEXT) FROM app_scan_jobs
  UNION ALL SELECT 'job_events', 'rows', CAST(COUNT(*) AS TEXT) FROM app_scan_job_events
  UNION ALL SELECT 'job_events', 'detail_json_chars', CAST(COALESCE(SUM(length(detail_json)), 0) AS TEXT) FROM app_scan_job_events
  UNION ALL SELECT 'active_release', 'release', COALESCE((SELECT id FROM app_scan_publication_releases WHERE active=1 LIMIT 1), '')
  UNION ALL SELECT 'active_release', 'reports', CAST(COALESCE((SELECT report_count_at_activation FROM app_scan_publication_releases WHERE active=1 LIMIT 1), 0) AS TEXT)
  UNION ALL SELECT 'active_release', 'release_members', CAST(COALESCE((SELECT COUNT(*) FROM app_scan_publication_release_reports rr JOIN app_scan_publication_releases r ON r.id=rr.release_id WHERE r.active=1), 0) AS TEXT)
  UNION ALL SELECT 'active_release', 'scanner_build', COALESCE((SELECT scanner_build FROM app_scan_publication_releases WHERE active=1 LIMIT 1), '')
  UNION ALL SELECT 'jobs', 'complete_public', CAST(COUNT(*) AS TEXT) FROM app_scan_jobs WHERE status='complete' AND scan_purpose IN ('public_intelligence','benchmark')
  UNION ALL SELECT 'jobs', 'failed_public', CAST(COUNT(*) AS TEXT) FROM app_scan_jobs WHERE status='failed' AND scan_purpose IN ('public_intelligence','benchmark')
  UNION ALL SELECT 'jobs', 'queued_public', CAST(COUNT(*) AS TEXT) FROM app_scan_jobs WHERE status IN ('queued','running') AND scan_purpose IN ('public_intelligence','benchmark')
  GROUP BY section, metric, value
  ORDER BY section, metric;
`;

const raw = execFileSync("npx", ["wrangler", "d1", "execute", database, "--remote", "--command", command, "--json"], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
const payload = JSON.parse(raw);
const rows = payload.flatMap((item) => Array.isArray(item?.results) ? item.results : []);
const output = Object.fromEntries(rows.map((row) => [`${row.section}.${row.metric}`, row.value]));
const pageCount = Number(output["database.page_count"] || 0);
const pageSize = Number(output["database.page_size"] || 0);
output["database.approximate_bytes"] = String(pageCount * pageSize);
output["database.approximate_megabytes"] = String(Math.round((pageCount * pageSize / 1024 / 1024) * 100) / 100);
console.log(JSON.stringify(output, null, 2));
