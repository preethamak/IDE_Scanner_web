import { execFileSync } from "node:child_process";

const database = process.env.CLOUDFLARE_SCAN_DATABASE || "abscissa-scan-data";
const queries = {
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

const groupQueries = {
  jobs_by_build_status: `
    SELECT COALESCE(j.expected_scanner_build, '') AS scanner_build,
           j.scan_purpose, j.status, COUNT(*) AS count
    FROM app_scan_jobs j
    GROUP BY COALESCE(j.expected_scanner_build, ''), j.scan_purpose, j.status
    ORDER BY count DESC, scanner_build, j.scan_purpose, j.status
  `,
  reports_by_release_and_purpose: `
    SELECT CASE WHEN member.scan_id IS NULL THEN 'not_active_release' ELSE 'active_release_member' END AS release_membership,
           j.scan_purpose, COUNT(*) AS report_count,
           COALESCE(SUM(length(report.report_json)), 0) AS inline_chars
    FROM app_scan_reports report
    JOIN app_scan_jobs j ON j.id=report.job_id
    LEFT JOIN app_scan_publication_release_reports member
      ON member.scan_id=report.scan_id
     AND member.release_id=(SELECT id FROM app_scan_publication_releases WHERE active=1 LIMIT 1)
    GROUP BY release_membership, j.scan_purpose
    ORDER BY release_membership, j.scan_purpose
  `,
  chunks_by_release: `
    SELECT CASE WHEN member.scan_id IS NULL THEN 'not_active_release' ELSE 'active_release_member' END AS release_membership,
           COUNT(*) AS chunk_rows, COALESCE(SUM(length(chunk.content)), 0) AS content_chars
    FROM app_scan_report_chunks chunk
    LEFT JOIN app_scan_publication_release_reports member
      ON member.scan_id=chunk.scan_id
     AND member.release_id=(SELECT id FROM app_scan_publication_releases WHERE active=1 LIMIT 1)
    GROUP BY release_membership
    ORDER BY release_membership
  `,
  previews_by_release: `
    SELECT CASE WHEN member.scan_id IS NULL THEN 'not_active_release' ELSE 'active_release_member' END AS release_membership,
           COUNT(*) AS preview_rows, COALESCE(SUM(length(preview.content)), 0) AS content_chars
    FROM app_scan_report_previews preview
    LEFT JOIN app_scan_publication_release_reports member
      ON member.scan_id=preview.scan_id
     AND member.release_id=(SELECT id FROM app_scan_publication_releases WHERE active=1 LIMIT 1)
    GROUP BY release_membership
    ORDER BY release_membership
  `,
};
for (const [name, command] of Object.entries(groupQueries)) {
  const raw = execFileSync("npx", ["wrangler", "d1", "execute", database, "--remote", "--command", command, "--json"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const payload = JSON.parse(raw);
  output[name] = payload.flatMap((item) => Array.isArray(item?.results) ? item.results : []);
}

console.log(JSON.stringify(output, null, 2));
