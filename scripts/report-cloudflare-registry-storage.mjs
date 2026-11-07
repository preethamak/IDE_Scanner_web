import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// Only aggregate metadata is returned. Never print private report contents,
// account records, or scan identifiers. This tool performs no SQL writes.
export const registryStorageQueries = {
  active_pointer: `SELECT COUNT(*) AS pointer_rows FROM registry_publication_state WHERE state_key = 'active'`,
  generations: `SELECT CASE WHEN id = (SELECT publication_id FROM registry_publication_state WHERE state_key = 'active') THEN 'active' ELSE 'other_or_staged' END AS state, COUNT(*) AS generations FROM registry_publications GROUP BY state`,
  section_chunks: `SELECT CASE WHEN publication_id = (SELECT publication_id FROM registry_publication_state WHERE state_key = 'active') THEN 'active' ELSE 'other_or_staged' END AS state, COUNT(*) AS rows, COALESCE(SUM(length(CAST(payload AS BLOB))), 0) AS payload_bytes FROM registry_section_chunks_v2 GROUP BY state`,
  product_chunks: `SELECT CASE WHEN publication_id = (SELECT publication_id FROM registry_publication_state WHERE state_key = 'active') THEN 'active' ELSE 'other_or_staged' END AS state, COUNT(*) AS rows, COALESCE(SUM(length(CAST(payload AS BLOB))), 0) AS payload_bytes FROM registry_product_chunks_v2 GROUP BY state`,
  legacy_section_rows: `SELECT COUNT(*) AS rows, COALESCE(SUM(length(CAST(payload AS BLOB))), 0) AS payload_bytes FROM registry_sections`,
  legacy_sections: `SELECT COUNT(*) AS rows, COALESCE(SUM(length(CAST(payload AS BLOB))), 0) AS payload_bytes FROM registry_section_chunks`,
  legacy_products: `SELECT COUNT(*) AS rows, COALESCE(SUM(length(CAST(payload AS BLOB))), 0) AS payload_bytes FROM registry_product_chunks`,
  report_payloads: `SELECT COUNT(*) AS rows, COALESCE(SUM(length(CAST(report_json AS BLOB))), 0) AS payload_bytes FROM app_scan_reports`,
};

// These identifiers are held only in the runner's memory so two D1 databases
// can be compared. They are never included in the report or workflow logs.
// EXISTs prevents duplicate subscribers/publication membership from inflating
// counts. Flags are independent: a report may be both public and user-owned.
export const sourceReportsQuery = `SELECT r.scan_id, r.job_id, r.extension_id, r.version, r.artifact_sha256,
  length(CAST(r.report_json AS BLOB)) AS payload_bytes,
  CASE WHEN length(r.report_json) < 512 AND json_valid(r.report_json) THEN CASE WHEN json_extract(r.report_json, '$.chunked') = 1 THEN 'chunked_marker' ELSE 'inline_or_other' END ELSE 'inline_or_other' END AS storage_mode,
  CASE WHEN j.scan_purpose IN ('public_intelligence','benchmark','user_request','guest_trial','team_badge') THEN j.scan_purpose ELSE 'other_or_unknown' END AS purpose,
  CASE WHEN j.requested_by IS NOT NULL THEN 1 ELSE 0 END AS has_requester,
  EXISTS(SELECT 1 FROM app_scan_job_subscribers s WHERE s.job_id = r.job_id) AS has_subscribers,
  EXISTS(SELECT 1 FROM app_guest_scan_access g WHERE g.job_id = r.job_id) AS has_guest_access,
  EXISTS(SELECT 1 FROM app_scan_publication_release_reports m JOIN app_scan_publication_releases p ON p.id=m.release_id WHERE m.scan_id=r.scan_id AND p.active=1) AS in_active_publication,
  EXISTS(SELECT 1 FROM app_scan_publication_release_reports m JOIN app_scan_publication_releases p ON p.id=m.release_id WHERE m.scan_id=r.scan_id AND p.active<>1) AS in_other_publication
  FROM app_scan_reports r LEFT JOIN app_scan_jobs j ON j.id=r.job_id`;
export const destinationReportsQuery = `SELECT scan_id, job_id, extension_id, version, artifact_sha256 FROM app_scan_reports`;
export const referencedReportsQuery = `SELECT DISTINCT scan_id FROM app_team_badges WHERE scan_id IS NOT NULL
  UNION SELECT DISTINCT jt.value AS scan_id FROM app_team_state s,
    json_tree(CASE WHEN json_valid(s.state_json) THEN s.state_json ELSE '{}' END) jt
    WHERE jt.type='text' AND jt.key IN ('scan_id','baseline_scan_id','target_scan_id','latest_scan_id')`;
export const invalidWorkspaceQuery = `SELECT COUNT(*) AS invalid_rows FROM app_team_state WHERE CASE WHEN json_valid(state_json) THEN json_type(state_json) <> 'object' ELSE 1 END`;

/** Identity matching does not prove payload, access, chunk, or preview parity. */
export function summarizeReportParity(source, destination, sourceReferences, destinationReferences) {
  const dest = new Map(destination.map((row) => [String(row.scan_id), row]));
  const references = new Set([...sourceReferences, ...destinationReferences].map((row) => String(row.scan_id || '')));
  const groups = new Map();
  for (const row of source) {
    const id = String(row.scan_id || '');
    if (!id || !Number.isSafeInteger(Number(row.payload_bytes)) || Number(row.payload_bytes) < 0) throw new Error('Registry report metadata is incomplete.');
    const match = dest.get(id);
    const complete = [row.job_id, row.extension_id, row.version, row.artifact_sha256].every((value) => typeof value === 'string' && value.length > 0);
    const parity = !complete ? 'source_identity_incomplete' : !match ? 'missing' :
      String(row.extension_id).toLowerCase() === String(match.extension_id || '').toLowerCase() && String(row.version) === String(match.version || '') && String(row.artifact_sha256).toLowerCase() === String(match.artifact_sha256 || '').toLowerCase() && String(row.job_id) === String(match.job_id || '') ? 'identity_match_only' : 'identity_conflict';
    const flags = {
      purpose: String(row.purpose || 'other_or_unknown'), storage_mode: String(row.storage_mode || 'unknown'),
      active_publication: Number(row.in_active_publication) === 1, other_publication: Number(row.in_other_publication) === 1,
      requester: Number(row.has_requester) === 1, subscribers: Number(row.has_subscribers) === 1,
      guest_access: Number(row.has_guest_access) === 1, known_team_reference: references.has(id), destination_identity: parity,
    };
    const key = JSON.stringify(flags);
    const current = groups.get(key) || { ...flags, reports: 0, payload_bytes: 0 };
    current.reports += 1; current.payload_bytes += Number(row.payload_bytes); groups.set(key, current);
  }
  return { verification: 'identity metadata only; queries are paginated without a database snapshot, so concurrent writes may affect completeness; payloads, chunks, previews, permissions, external links and all possible team references are not verified', reports: source.length, groups: [...groups.values()] };
}

export function readQueryResults(raw) {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error('D1 storage query returned invalid JSON.');
  }
  if (!Array.isArray(payload) || payload.some((item) => item?.success !== true || !Array.isArray(item.results))) throw new Error("D1 storage query did not return a successful result.");
  return payload.flatMap((item) => item.results);
}

export function runWranglerQuery(sql, database, execute = execFileSync) {
  try {
    return execute("npx", ["wrangler", "d1", "execute", database, "--remote", "--command", sql, "--json"], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    // Child process errors include captured output, which can contain IDs.
    throw new Error('Cloudflare storage query failed; no results were reported.');
  }
}

export async function reportRegistryStorage({ accountId, databaseId, scanDatabaseId, token, runQuery, fetchImpl = fetch }) {
  if (!/^[a-f0-9]{32}$/i.test(accountId || "") || !/^[a-f0-9-]{36}$/i.test(databaseId || "") || !/^[a-f0-9-]{36}$/i.test(scanDatabaseId || "") || !token) throw new Error("Cloudflare account, database IDs and token are required.");
  async function size(id) {
    const response = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${id}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    const metadata = await response.json();
    if (!response.ok || metadata?.success !== true || !Number.isFinite(metadata?.result?.file_size)) throw new Error("Could not read database size.");
    return metadata.result.file_size;
  }
  const [registryBytes, scanBytes] = await Promise.all([size(databaseId), size(scanDatabaseId)]);
  const output = { database: "abscissa-registry", file_size_bytes: registryBytes, scan_data_file_size_bytes: scanBytes, aggregates: {} };
  for (const [name, sql] of Object.entries(registryStorageQueries)) output.aggregates[name] = readQueryResults(await runQuery(sql, 'abscissa-registry'));
  async function readPages(sql, database) {
    const rows = [];
    const pageSize = 200;
    const countRows = async () => {
      const result = readQueryResults(await runQuery(`SELECT COUNT(*) AS total FROM (${sql})`, database));
      const count = Number(result[0]?.total);
      if (result.length !== 1 || !Number.isSafeInteger(count) || count < 0 || count > 100000) throw new Error('Report inventory count is unavailable or exceeds its safe limit.');
      return count;
    };
    const expected = await countRows();
    // An extra empty page is required for exact multiples. A hard limit fails
    // closed instead of presenting a partial inventory as complete.
    for (let offset = 0; offset <= 100000; offset += pageSize) {
      const page = readQueryResults(await runQuery(`SELECT * FROM (${sql}) ORDER BY scan_id LIMIT ${pageSize} OFFSET ${offset}`, database));
      if (page.length > pageSize || (offset === 100000 && page.length > 0)) throw new Error('Report inventory exceeded its safe limit.');
      rows.push(...page);
      if (page.length < pageSize) {
        if (rows.length !== expected || await countRows() !== expected || new Set(rows.map((row) => row.scan_id)).size !== rows.length) throw new Error('Report inventory changed or was incomplete.');
        return rows;
      }
    }
    throw new Error('Report inventory could not be completed.');
  }
  const source = await readPages(sourceReportsQuery, 'abscissa-registry');
  const destination = await readPages(destinationReportsQuery, 'abscissa-scan-data');
  const sourceReferences = await readPages(referencedReportsQuery, 'abscissa-registry');
  const destinationReferences = await readPages(referencedReportsQuery, 'abscissa-scan-data');
  const sourceInvalid = readQueryResults(await runQuery(invalidWorkspaceQuery, 'abscissa-registry'));
  const destinationInvalid = readQueryResults(await runQuery(invalidWorkspaceQuery, 'abscissa-scan-data'));
  const invalidCount = (rows) => {
    const value = Number(rows[0]?.invalid_rows);
    if (rows.length !== 1 || !Number.isSafeInteger(value) || value < 0) throw new Error('Workspace validation count is unavailable.');
    return value;
  };
  output.report_identity_parity = summarizeReportParity(source, destination, sourceReferences, destinationReferences);
  output.report_identity_parity.invalid_workspace_documents = {
    registry: invalidCount(sourceInvalid), scan_data: invalidCount(destinationInvalid),
  };
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await reportRegistryStorage({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    databaseId: process.env.CLOUDFLARE_REGISTRY_DATABASE_ID,
    scanDatabaseId: process.env.CLOUDFLARE_SCAN_DATABASE_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
    runQuery: async (sql, database) => runWranglerQuery(sql, database),
  });
  console.log(JSON.stringify(report, null, 2));
}
