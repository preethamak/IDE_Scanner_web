import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { defaultMarketplacePageCount } from "./marketplace-pagination.mjs";

const scannerBuild = String(process.env.SCANNER_BUILD || "").trim().toLowerCase();
const scanDatabase = process.env.CLOUDFLARE_SCAN_DATABASE || "abscissa-scan-data";
const batchLimit = boundedInteger("SCAN_BATCH_LIMIT", 100, 1, 10_000);
const cohortLimit = boundedInteger("COHORT_LIMIT", 250, 1, 10_000);
const requestedCandidateCount = Math.min(batchLimit, cohortLimit);
const marketplacePageCount = boundedInteger("MARKETPLACE_PAGE_COUNT", defaultMarketplacePageCount(requestedCandidateCount), 1, 100);
const requireActiveRelease = String(process.env.REQUIRE_ACTIVE_RELEASE || "").trim().toLowerCase() === "true";
if (!/^[0-9a-f]{40}$/.test(scannerBuild)) {
  throw new Error("SCANNER_BUILD must be a full 40-character scanner commit SHA.");
}

if (requireActiveRelease) {
  const active = queryD1(`
    SELECT r.id,r.scanner_build,r.expected_reports,r.report_count_at_activation,
           r.accuracy_gate_corpus_id,r.accuracy_gate_corpus_version,r.accuracy_gate_sha256,
           (SELECT COUNT(DISTINCT rr.scan_id)
            FROM app_scan_publication_release_reports rr
            WHERE rr.release_id=r.id) AS release_report_count
    FROM app_scan_publication_releases r
    WHERE r.active=1
    LIMIT 1
  `)[0];
  if (!active
    || String(active.scanner_build || "").toLowerCase() !== scannerBuild
    || Number(active.expected_reports) < 1
    || Number(active.report_count_at_activation) !== Number(active.expected_reports)
    || Number(active.release_report_count) !== Number(active.expected_reports)
    || !String(active.accuracy_gate_corpus_id || "").trim()
    || !String(active.accuracy_gate_corpus_version || "").trim()
    || !/^[0-9a-f]{64}$/i.test(String(active.accuracy_gate_sha256 || ""))) {
    throw new Error("Bulk scans require an active accuracy-attested Cloudflare release for the requested scanner build.");
  }
}

const rows = queryD1(`
  SELECT extension_id,chunk_index,payload
  FROM registry_product_chunks
  ORDER BY extension_id,chunk_index
`);
const products = new Map();
for (const row of rows) {
  const extensionId = String(row.extension_id || "").trim();
  if (!extensionId) continue;
  const chunks = products.get(extensionId) || [];
  chunks.push(String(row.payload || ""));
  products.set(extensionId, chunks);
}

const candidates = [];
const candidateByKey = new Map();
for (const chunks of products.values()) {
  let product;
  try {
    product = JSON.parse(chunks.join(""));
  } catch {
    continue;
  }
  const extension = product?.extension && typeof product.extension === "object" ? product.extension : {};
  const versions = Array.isArray(product?.versions) ? product.versions : [];
  const latest = versions.find((item) => item?.is_latest === true) || versions[0];
  const extensionId = String(extension.id || latest?.extension_id || "").trim();
  const version = String(latest?.version || "").trim();
  if (!extensionId || !version) continue;
  const candidate = {
    extensionId,
    version,
    rank: Number.isFinite(Number(extension.catalog_rank)) ? Number(extension.catalog_rank) : Number.MAX_SAFE_INTEGER,
    source: "d1-catalog",
  };
  candidateByKey.set(`${extensionId.toLowerCase()}@${version}`, candidate);
}

// The legacy D1 mirror may contain only the last imported publication's
// product rows. Fill a requested cohort from the authoritative Marketplace
// ranking so publication cannot silently stop at a partial catalog.
if (candidateByKey.size < Math.min(batchLimit, cohortLimit)) {
  const marketplace = (await Promise.all(Array.from({ length: marketplacePageCount }, (_, index) => marketplacePage(index + 1)))).flat();
  for (const item of marketplace) {
    const key = `${item.extensionId.toLowerCase()}@${item.version}`;
    const existing = candidateByKey.get(key);
    if (existing) {
      existing.rank = Math.min(existing.rank, item.rank);
      continue;
    }
    candidateByKey.set(key, item);
  }
}

candidates.push(...candidateByKey.values());

candidates.sort((left, right) => left.rank - right.rank || `${left.extensionId}@${left.version}`.localeCompare(`${right.extensionId}@${right.version}`));
const selected = candidates.slice(0, Math.min(batchLimit, cohortLimit));
if (!selected.length) throw new Error("No catalog candidates were available for the D1 candidate scan.");

const now = new Date().toISOString();
const statements = selected.map((item) => {
  const id = `candidate-${randomUUID()}`;
  const values = [
    id,
    item.extensionId,
    item.version,
    "deep",
    "queued",
    "queued",
    "candidate-publication",
    "public_intelligence",
    scannerBuild,
    now,
    now,
    now,
  ].map(sql);
  return `INSERT INTO app_scan_jobs(id,extension_id,version,profile,status,lifecycle_stage,requester_hash,scan_purpose,expected_scanner_build,created_at,updated_at,last_event_at) SELECT ${values.join(",")} WHERE NOT EXISTS (SELECT 1 FROM app_scan_jobs WHERE lower(extension_id)=lower(${sql(item.extensionId)}) AND version=${sql(item.version)} AND scan_purpose='public_intelligence' AND expected_scanner_build=${sql(scannerBuild)} AND status IN ('queued','running','complete'));`;
});

const temp = await mkdtemp(join("/tmp", "guardrails-candidate-d1-"));
const sqlPath = join(temp, "queue.sql");
try {
  await writeFile(sqlPath, `${statements.join("\n")}\n`, "utf8");
  execFileSync("npx", ["wrangler", "d1", "execute", scanDatabase, "--remote", "--file", sqlPath], { stdio: "inherit" });
} finally {
  await rm(temp, { recursive: true, force: true });
}
const missing = verifySelectedJobs(selected, scannerBuild);
if (missing.length) {
  const sample = missing.slice(0, 10).map((item) => `${item.extensionId}@${item.version}`).join(", ");
  throw new Error(`D1 candidate queue verification failed for ${missing.length} selected artifacts; sample: ${sample}`);
}
console.log(JSON.stringify({ scanner_build: scannerBuild, require_active_release: requireActiveRelease, marketplace_page_count: marketplacePageCount, available: candidates.length, selected: selected.length, candidates: selected }, null, 2));

function verifySelectedJobs(items, build) {
  const present = new Set();
  // Keep the verification predicate below under Cloudflare D1's SQLite
  // expression-depth limit. A 100-item cohort becomes one OR branch per
  // extension/version pair, so verify in small bounded batches.
  for (const batch of chunks(items, 25)) {
    const identityFilter = batch
      .map((item) => `(lower(extension_id)=lower(${sql(item.extensionId)}) AND version=${sql(item.version)})`)
      .join(" OR ");
    const rows = queryD1(`
      SELECT extension_id,version
      FROM app_scan_jobs
      WHERE scan_purpose='public_intelligence'
        AND expected_scanner_build=${sql(build)}
        AND status IN ('queued','running','complete')
        AND (${identityFilter})
    `);
    for (const row of rows) present.add(`${String(row.extension_id || "").toLowerCase()}@${String(row.version || "")}`);
  }
  return items.filter((item) => !present.has(`${item.extensionId.toLowerCase()}@${item.version}`));
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function queryD1(command) {
  const raw = execFileSync("npx", ["wrangler", "d1", "execute", scanDatabase, "--remote", "--command", command, "--json"], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  const payload = JSON.parse(raw);
  return Array.isArray(payload?.[0]?.results) ? payload[0].results : [];
}

function boundedInteger(name, fallback, minimum, maximum) {
  const raw = String(process.env[name] || "").trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function marketplacePage(page) {
  const response = await fetch("https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=7.2-preview.1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json;api-version=7.2-preview.1",
      "User-Agent": "guardrails-public-publication-queue",
    },
    body: JSON.stringify({
      filters: [{ criteria: [{ filterType: 8, value: "Microsoft.VisualStudio.Code" }], pageNumber: page, pageSize: 100, sortBy: 4 }],
      flags: 914,
    }),
  });
  if (!response.ok) throw new Error(`Marketplace catalog request failed with HTTP ${response.status} on page ${page}.`);
  const payload = await response.json();
  return (payload?.results?.[0]?.extensions || []).flatMap((extension, index) => {
    const publisher = String(extension?.publisher?.publisherName || "").trim();
    const name = String(extension?.extensionName || "").trim();
    const version = String(extension?.versions?.[0]?.version || "").trim();
    if (!publisher || !name || !version) return [];
    return [{ extensionId: `${publisher}.${name}`, version, rank: (page - 1) * 100 + index + 1, source: "marketplace" }];
  });
}
