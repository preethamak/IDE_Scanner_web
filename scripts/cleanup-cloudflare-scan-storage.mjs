import { execFileSync } from "node:child_process";

const database = process.env.CLOUDFLARE_SCAN_DATABASE || "abscissa-scan-data";
const preserveBuild = String(process.env.PRESERVE_SCANNER_BUILD || "").trim().toLowerCase();
const apply = String(process.env.APPLY || "false").trim().toLowerCase() === "true";

if (!/^[0-9a-f]{40}$/.test(preserveBuild)) {
  throw new Error("PRESERVE_SCANNER_BUILD must be a full 40-character scanner commit SHA.");
}

const active = query(`
  SELECT r.id, r.expected_reports, r.report_count_at_activation,
         (SELECT COUNT(*) FROM app_scan_publication_release_reports rr WHERE rr.release_id=r.id) AS member_count
  FROM app_scan_publication_releases r
  WHERE r.active=1
  LIMIT 1
`)[0];
if (!active?.id) throw new Error("Refusing cleanup: no active publication release exists.");
if (Number(active.expected_reports) !== Number(active.report_count_at_activation)
  || Number(active.expected_reports) !== Number(active.member_count)) {
  throw new Error("Refusing cleanup: active publication release is not internally consistent.");
}

const target = query(`
  SELECT COUNT(*) AS report_count,
         COALESCE(SUM(length(r.report_json)), 0) AS inline_chars
  FROM app_scan_reports r
  JOIN app_scan_jobs j ON j.id=r.job_id
  WHERE j.scan_purpose='public_intelligence'
    AND lower(COALESCE(j.expected_scanner_build, ''))<>${sql(preserveBuild)}
    AND NOT EXISTS (
      SELECT 1
      FROM app_scan_publication_release_reports rr
      WHERE rr.release_id=${sql(active.id)}
        AND rr.scan_id=r.scan_id
    )
`)[0] || {};

const summary = {
  database,
  active_release: String(active.id),
  active_release_reports: Number(active.member_count),
  preserved_scanner_build: preserveBuild,
  target_public_non_active_reports: Number(target.report_count || 0),
  target_inline_report_chars: Number(target.inline_chars || 0),
  apply,
};
console.log(JSON.stringify(summary, null, 2));

if (!apply) {
  console.log("Dry run only. Set APPLY=true to remove the target report payloads.");
  process.exit(0);
}

const targetScanIds = `
  SELECT r.scan_id
  FROM app_scan_reports r
  JOIN app_scan_jobs j ON j.id=r.job_id
  WHERE j.scan_purpose='public_intelligence'
    AND lower(COALESCE(j.expected_scanner_build, ''))<>${sql(preserveBuild)}
    AND NOT EXISTS (
      SELECT 1
      FROM app_scan_publication_release_reports rr
      WHERE rr.release_id=${sql(active.id)}
        AND rr.scan_id=r.scan_id
    )
`;

execute(`DELETE FROM app_scan_report_previews WHERE scan_id IN (${targetScanIds})`);
execute(`DELETE FROM app_scan_report_chunks WHERE scan_id IN (${targetScanIds})`);
execute(`DELETE FROM app_scan_reports WHERE scan_id IN (${targetScanIds})`);

const remaining = query(`
  SELECT COUNT(*) AS report_count,
         COALESCE(SUM(length(r.report_json)), 0) AS inline_chars
  FROM app_scan_reports r
  JOIN app_scan_jobs j ON j.id=r.job_id
  WHERE j.scan_purpose='public_intelligence'
    AND lower(COALESCE(j.expected_scanner_build, ''))<>${sql(preserveBuild)}
    AND NOT EXISTS (
      SELECT 1
      FROM app_scan_publication_release_reports rr
      WHERE rr.release_id=${sql(active.id)}
        AND rr.scan_id=r.scan_id
    )
`)[0] || {};
if (Number(remaining.report_count || 0) !== 0) {
  throw new Error(`Cleanup verification failed: ${remaining.report_count} target reports remain.`);
}
console.log(JSON.stringify({
  deleted_public_non_active_reports: Number(target.report_count || 0),
  remaining_public_non_active_reports: Number(remaining.report_count || 0),
}, null, 2));

function query(command) {
  const raw = execFileSync("npx", ["wrangler", "d1", "execute", database, "--remote", "--command", command, "--json"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const payload = JSON.parse(raw);
  return payload.flatMap((item) => Array.isArray(item?.results) ? item.results : []);
}

function execute(command) {
  execFileSync("npx", ["wrangler", "d1", "execute", database, "--remote", "--command", command], { stdio: "inherit" });
}

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
