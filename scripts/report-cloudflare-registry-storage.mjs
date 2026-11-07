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

export function readQueryResults(raw) {
  const payload = JSON.parse(raw);
  if (!Array.isArray(payload) || payload.some((item) => item?.success !== true || !Array.isArray(item.results))) throw new Error("D1 storage query did not return a successful result.");
  return payload.flatMap((item) => item.results);
}

export async function reportRegistryStorage({ accountId, databaseId, token, runQuery, fetchImpl = fetch }) {
  if (!/^[a-f0-9]{32}$/i.test(accountId || "") || !/^[a-f0-9-]{36}$/i.test(databaseId || "") || !token) throw new Error("Cloudflare account, database and token are required.");
  const response = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
  const metadata = await response.json();
  if (!response.ok || metadata?.success !== true || !Number.isFinite(metadata?.result?.file_size)) throw new Error("Could not read registry database size.");
  const output = { database: "abscissa-registry", file_size_bytes: metadata.result.file_size, aggregates: {} };
  for (const [name, sql] of Object.entries(registryStorageQueries)) output.aggregates[name] = readQueryResults(await runQuery(sql));
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await reportRegistryStorage({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    databaseId: process.env.CLOUDFLARE_REGISTRY_DATABASE_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
    runQuery: async (sql) => execFileSync("npx", ["wrangler", "d1", "execute", "abscissa-registry", "--remote", "--command", sql, "--json"], { encoding: "utf8", maxBuffer: 1024 * 1024 }),
  });
  console.log(JSON.stringify(report, null, 2));
}
