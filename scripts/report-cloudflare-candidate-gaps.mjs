import { execFileSync } from "node:child_process";

const database = process.env.CLOUDFLARE_SCAN_DATABASE || "abscissa-scan-data";
const build = String(process.env.SCANNER_BUILD || "").trim().toLowerCase();
if (!/^[0-9a-f]{40}$/.test(build)) throw new Error("SCANNER_BUILD must be a full 40-character scanner commit SHA.");

const sql = `
  SELECT extension_id, version, status, attempt_count, dispatch_count,
         COALESCE(error, '') AS error, COALESCE(callback_error, '') AS callback_error,
         updated_at
  FROM app_scan_jobs
  WHERE lower(COALESCE(expected_scanner_build, ''))='${build}'
    AND scan_purpose='public_intelligence'
    AND status<>'complete'
  ORDER BY extension_id, version, created_at DESC;
`;
const raw = execFileSync("npx", ["wrangler", "d1", "execute", database, "--remote", "--command", sql, "--json"], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
const payload = JSON.parse(raw);
const rows = payload.flatMap((item) => Array.isArray(item?.results) ? item.results : []);
console.log(JSON.stringify({ scanner_build: build, gap_count: rows.length, gaps: rows }, null, 2));
