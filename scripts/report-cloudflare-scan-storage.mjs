import { execFileSync } from "node:child_process";

const database = process.env.CLOUDFLARE_SCAN_DATABASE || "abscissa-scan-data";
const queries = {
  "database.page_count": "SELECT page_count AS value FROM pragma_page_count",
  "database.page_size": "SELECT page_size AS value FROM pragma_page_size",
  "database.freelist_count": "SELECT freelist_count AS value FROM pragma_freelist_count",
  "reports.rows": "SELECT COUNT(*) AS value FROM app_scan_reports",
  "reports.report_json_chars": "SELECT COALESCE(SUM(length(report_json)), 0) AS value FROM app_scan_reports",
  "report_chunks.rows": "SELECT COUNT(*) AS value FROM app_scan_report_chunks",
  "report_chunks.content_chars": "SELECT COALESCE(SUM(length(content)), 0) AS value FROM app_scan_report_chunks",
  "previews.rows": "SELECT COUNT(*) AS value FROM app_scan_report_previews",
  "previews.content_chars": "SELECT COALESCE(SUM(length(content)), 0) AS value FROM app_scan_report_previews",
  "jobs.rows": "SELECT COUNT(*) AS value FROM app_scan_jobs",
  "job_events.rows": "SELECT COUNT(*) AS value FROM app_scan_job_events",
  "job_events.detail_json_chars": "SELECT COALESCE(SUM(length(detail_json)), 0) AS value FROM app_scan_job_events",
  "active_release.release": "SELECT COALESCE((SELECT id FROM app_scan_publication_releases WHERE active=1 LIMIT 1), '') AS value",
  "active_release.reports": "SELECT COALESCE((SELECT report_count_at_activation FROM app_scan_publication_releases WHERE active=1 LIMIT 1), 0) AS value",
  "active_release.release_members": "SELECT COALESCE((SELECT COUNT(*) FROM app_scan_publication_release_reports rr JOIN app_scan_publication_releases r ON r.id=rr.release_id WHERE r.active=1), 0) AS value",
  "active_release.scanner_build": "SELECT COALESCE((SELECT scanner_build FROM app_scan_publication_releases WHERE active=1 LIMIT 1), '') AS value",
  "jobs.complete_public": "SELECT COUNT(*) AS value FROM app_scan_jobs WHERE status='complete' AND scan_purpose IN ('public_intelligence','benchmark')",
  "jobs.failed_public": "SELECT COUNT(*) AS value FROM app_scan_jobs WHERE status='failed' AND scan_purpose IN ('public_intelligence','benchmark')",
  "jobs.queued_public": "SELECT COUNT(*) AS value FROM app_scan_jobs WHERE status IN ('queued','running') AND scan_purpose IN ('public_intelligence','benchmark')",
};

const output = {};
for (const [metric, command] of Object.entries(queries)) {
  const raw = execFileSync("npx", ["wrangler", "d1", "execute", database, "--remote", "--command", command, "--json"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const payload = JSON.parse(raw);
  const row = payload.flatMap((item) => Array.isArray(item?.results) ? item.results : [])[0];
  output[metric] = String(row?.value ?? "");
}
const pageCount = Number(output["database.page_count"] || 0);
const pageSize = Number(output["database.page_size"] || 0);
output["database.approximate_bytes"] = String(pageCount * pageSize);
output["database.approximate_megabytes"] = String(Math.round((pageCount * pageSize / 1024 / 1024) * 100) / 100);
console.log(JSON.stringify(output, null, 2));
