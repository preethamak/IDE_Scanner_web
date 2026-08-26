import { publicDb, serviceDb } from "@/lib/supabase";
import { isConcreteVersion, listMarketplaceVersions, resolveMarketplaceExtension, searchMarketplace } from "@/lib/marketplace";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

const cachedVersions=unstable_cache(async(id:string)=>listMarketplaceVersions(id),["registry-versions-v2"],{revalidate:21600,tags:["registry-versions"]});

export type CatalogExtension = {
  id: string;
  name: string;
  display_name: string;
  publisher: string;
  description: string;
  registry: string;
  publisher_verified: boolean;
  installs: number;
  rating: number;
  icon_url: string;
  repository_url: string;
  last_published_at: string | null;
  catalog_rank: number | null;
  latest_version?: string;
  latest_scan?: Record<string, unknown> | null;
};

export type ScanDecision = "allow" | "review" | "block" | "incomplete";
export type PublicSecurityFeedItem = { scan_id: string; extension_id: string; version: string; display_name: string; severity: string; decision: ScanDecision; public_outcome: string; decision_basis: string; evidence_confidence: string; scanned_at: string; coverage_percent: number; decision_reason: string };
export type PublicInventoryItem = PublicSecurityFeedItem & { publisher: string; publisher_verified: boolean; description: string; icon_url: string; risk_score: number; malware_score: number; artifact_sha256: string; provenance_tier: string; expected_profile_id: string; capability_assessment: Record<string, unknown>; scanner_build: string; ruleset_version: string; score_schema_version: string };
export type PublicInventory = { items: PublicInventoryItem[]; totals: { extensions: number; releases: number; complete: number; allowed: number; expected: number; investigate: number; review: number; blocked: number; lastScannedAt: string | null } };

const cachedSecurityFeed=unstable_cache(async(limit:number)=>fetchPublicSecurityFeed(limit),["public-feed-v1"],{revalidate:300,tags:["public-intel"]});
const cachedPublicInventory=unstable_cache(async(limit:number)=>fetchPublicInventory(limit),["public-inventory-v1"],{revalidate:300,tags:["public-intel"]});
const cachedCatalog=unstable_cache(async(query:string,limit:number)=>fetchCatalog(query,limit),["public-catalog-v1"],{revalidate:300,tags:["public-intel","catalog"]});

export function getPublicSecurityFeed(limit = 6): Promise<PublicSecurityFeedItem[]> { return cachedSecurityFeed(limit); }

/** Current-policy reproducible scans only. Development and private work never enter this catalog. */
export function getPublicInventory(limit = 240): Promise<PublicInventory> { return cachedPublicInventory(limit); }

export function listCatalog(query = "", limit = 50): Promise<CatalogExtension[]> { return cachedCatalog(query, limit); }

async function fetchPublicSecurityFeed(limit = 6): Promise<PublicSecurityFeedItem[]> {
  const db = publicDb();
  if (!db) return [];
  const classification = await activePublicClassification(db);
  if (!classification) return [];
  if (classification.scanIds?.length === 0) return [];
  let request = db.from("scans").select("id,extension_id,version,severity,decision,public_outcome,decision_basis,evidence_confidence,scanned_at,coverage_percent,decision_reason").in("scan_purpose", ["public_intelligence", "benchmark"]).eq("score_schema_version", classification.scoreSchemaVersion).eq("analysis_status", "complete").eq("policy_version", classification.policyVersion).eq("ruleset_version", classification.rulesetVersion).eq("scanner_build", classification.scannerBuild).in("decision", ["review", "block"]).order("scanned_at", { ascending: false }).limit(80);
  request = classification.scanIds ? request.in("id", classification.scanIds) : request.is("superseded_at", null);
  const { data: scans } = await request;
  const rank = (severity: string) => ({ CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 }[severity] || 0);
  const latest = new Map<string, Record<string, unknown>>();
  for (const scan of (scans || []) as Array<Record<string, unknown>>) { const key = `${String(scan.extension_id).toLowerCase()}@${scan.version}`; if (!latest.has(key)) latest.set(key, scan); }
  const rows = [...latest.values()].sort((a, b) => rank(String(b.severity)) - rank(String(a.severity)) || String(b.scanned_at).localeCompare(String(a.scanned_at))).slice(0, limit);
  const ids = [...new Set(rows.map((item) => String(item.extension_id)))];
  const { data: extensions } = ids.length ? await db.from("extensions").select("id,display_name").in("id", ids) : { data: [] as Array<{ id: string; display_name: string }> };
  const names = new Map((extensions || []).map((item) => [String(item.id), String(item.display_name)]));
  return rows.map((item) => ({ scan_id: String(item.id), extension_id: String(item.extension_id), version: String(item.version), display_name: names.get(String(item.extension_id)) || String(item.extension_id), severity: String(item.severity || "INFO"), decision: normalizeDecision(item.decision), public_outcome: String(item.public_outcome || legacyPublicOutcome(item)), decision_basis: String(item.decision_basis || "legacy_scanner_result"), evidence_confidence: String(item.evidence_confidence || "none"), scanned_at: String(item.scanned_at), coverage_percent: Number(item.coverage_percent || 0), decision_reason: String(item.decision_reason || "Open the exact artifact evidence.") }));
}

/** Current-policy reproducible scans only. Development and private work never enter this catalog. */
async function fetchPublicInventory(limit = 240): Promise<PublicInventory> {
  const db = publicDb();
  if (!db) return emptyInventory();
  const classification = await activePublicClassification(db);
  if (!classification) return emptyInventory();
  if (classification.scanIds?.length === 0) return emptyInventory();
  let request = db.from("scans").select("id,extension_id,version,artifact_sha256,severity,decision,decision_reason,public_outcome,decision_basis,evidence_confidence,provenance_tier,expected_profile_id,capability_assessment,score_schema_version,risk_score,malware_score,coverage_percent,scanner_build,ruleset_version,scanned_at").in("scan_purpose", ["public_intelligence", "benchmark"]).eq("score_schema_version", classification.scoreSchemaVersion).eq("analysis_status", "complete").eq("policy_version", classification.policyVersion).eq("ruleset_version", classification.rulesetVersion).eq("scanner_build", classification.scannerBuild).in("decision", ["allow", "review", "block"]).order("scanned_at", { ascending: false }).limit(240);
  request = classification.scanIds ? request.in("id", classification.scanIds) : request.is("superseded_at", null);
  const { data: scans, error } = await request;
  if (error || !scans?.length) return emptyInventory();
  const latest = new Map<string, (typeof scans)[number]>();
  for (const scan of scans) {
    const key = `${String(scan.extension_id).toLowerCase()}@${scan.version}`;
    if (!latest.has(key)) latest.set(key, scan);
  }
  const selectedScans = [...latest.values()].slice(0, Math.min(limit, 240));
  const ids = [...new Set(selectedScans.map((row) => String(row.extension_id)))];
  const { data: stored } = await db.from("extensions").select("id,display_name,publisher,description,icon_url,publisher_verified").in("id", ids);
  const metadata = new Map((stored || []).map((item) => [String(item.id), item]));
  const items: PublicInventoryItem[] = selectedScans.map((row) => {
    const extension = metadata.get(String(row.extension_id));
    const assessment = objectValue(row.capability_assessment);
    const matched = Array.isArray(assessment.matched) ? assessment.matched.map(String) : [];
    return {
      scan_id: String(row.id), extension_id: String(row.extension_id), version: String(row.version), artifact_sha256: String(row.artifact_sha256),
      display_name: String(extension?.display_name || row.extension_id), publisher: String(extension?.publisher || String(row.extension_id).split(".")[0]),
      description: matched.length ? `Expected: ${matched.map(humanize).join(", ")}` : String(row.decision_reason || extension?.description || "Open the exact artifact evidence."),
      icon_url: String(extension?.icon_url || ""), publisher_verified: Boolean(extension?.publisher_verified), severity: String(row.severity || "INFO"),
      decision: normalizeDecision(row.decision), public_outcome: String(row.public_outcome || legacyPublicOutcome(row)), decision_basis: String(row.decision_basis || "legacy_scanner_result"),
      evidence_confidence: String(row.evidence_confidence || "none"), provenance_tier: String(row.provenance_tier || "unknown"), expected_profile_id: String(row.expected_profile_id || ""), capability_assessment: assessment,
      scanned_at: String(row.scanned_at), coverage_percent: Number(row.coverage_percent || 0), decision_reason: String(row.decision_reason || "Open the exact artifact evidence."),
      risk_score: Number(row.risk_score || 0), malware_score: Number(row.malware_score || 0), scanner_build: String(row.scanner_build || "unknown"), ruleset_version: String(row.ruleset_version || "unknown"), score_schema_version: String(row.score_schema_version || "1"),
    };
  });
  return { items, totals: { extensions: new Set(items.map((item) => item.extension_id)).size, releases: items.length, complete: items.filter((item) => item.public_outcome !== "incomplete").length, allowed: items.filter((item) => item.decision === "allow").length, expected: items.filter((item) => item.public_outcome === "expected_capability").length, investigate: items.filter((item) => item.public_outcome === "investigate").length, review: items.filter((item) => item.decision === "review").length, blocked: items.filter((item) => item.decision === "block").length, lastScannedAt: items[0]?.scanned_at || null } };
}

async function fetchCatalog(query = "", limit = 50): Promise<CatalogExtension[]> {
  const db = publicDb();
  if (db) {
    let request = db.from("extensions").select("*, extension_versions(version,is_latest,latest_scan_id,scan_state)").order("catalog_rank", { ascending: true, nullsFirst: false }).limit(Math.min(limit, 100));
    if (query.trim()) request = request.or(`id.ilike.%${escapeFilter(query)}%,display_name.ilike.%${escapeFilter(query)}%,publisher.ilike.%${escapeFilter(query)}%`);
    const { data, error } = await request;
    if (!error && data?.length) return data.map((row) => normalizeCatalogRow(row as Record<string, unknown>));
  }
  if (!query.trim()) return [];
  const registry = await searchMarketplace(query, limit);
  return registry.map((item, index) => ({ id: item.extension_id, name: item.extension_id.split(".").slice(1).join("."), display_name: item.display_name, publisher: item.publisher, description: item.short_description, registry: item.registry || "vs-marketplace", publisher_verified: item.publisher_verified, installs: item.install_count, rating: item.rating_average, icon_url: item.icon_url, repository_url: "", last_published_at: item.last_updated || null, catalog_rank: index + 1, latest_version: item.version, latest_scan: null }));
}

export async function getExtensionProduct(id: string, client?: SupabaseClient): Promise<{ extension: CatalogExtension; versions: Array<Record<string, unknown>>; scan: Record<string, unknown> | null } | null> {
  const db = client || publicDb();
  if (db) {
    const storedId = await resolveStoredExtensionId(db, id);
    if (!storedId) return registryProduct(id);
    const [{ data: extension }, { data: versions }] = await Promise.all([
      db.from("extensions").select("*").eq("id", storedId).maybeSingle(),
      db.from("extension_versions").select("*").eq("extension_id", storedId).order("published_at", { ascending: false, nullsFirst: false }),
    ]);
    if (extension) {
      let versionRows = versions || [];
      if (versionRows.length <= 1) {
        const registryVersions = await cachedVersions(storedId).catch(() => []);
        const persisted = new Map(versionRows.map((item) => [String(item.version), item]));
        versionRows = registryVersions.map((item) => ({ ...item, ...(persisted.get(item.version) || {}) }));
        if (!versionRows.length) versionRows = versions || [];
      }
      versionRows = dedupeVersions(versionRows);
      const latest = versionRows.find((item) => item.is_latest) || versionRows[0];
      let scan: Record<string, unknown> | null = null;
      if (versionRows.length) {
        const scansByVersion = await getVisibleScansByVersion(db, storedId);
        versionRows = versionRows.map((item) => {
          const versionScan = scansByVersion.get(String(item.version));
          return {
            ...item,
            latest_scan_id: versionScan?.id || null,
            scan_state: versionScan ? String(versionScan.analysis_status || "complete") : "not_scanned",
            decision: versionScan?.decision || null,
            coverage_percent: versionScan?.coverage_percent ?? null,
            scanned_at: versionScan?.scanned_at || null,
          };
        });
        scan = scansByVersion.get(String(latest?.version || "")) || null;
      }
      return { extension: normalizeCatalogRow(extension as Record<string, unknown>), versions: dedupeVersions(versionRows), scan };
    }
  }
  return registryProduct(id);
}

async function registryProduct(id: string): Promise<{ extension: CatalogExtension; versions: Array<Record<string, unknown>>; scan: Record<string, unknown> | null } | null> {
  try {
    const item = await resolveMarketplaceExtension(id);
    const versions = await cachedVersions(item.extension_id);
    return { extension: { id: item.extension_id, name: item.extension_id.split(".").slice(1).join("."), display_name: item.display_name, publisher: item.publisher, description: item.short_description, registry: item.registry || "vs-marketplace", publisher_verified: item.publisher_verified, installs: item.install_count, rating: item.rating_average, icon_url: item.icon_url, repository_url: "", last_published_at: item.last_updated || null, catalog_rank: null, latest_version: item.version, latest_scan: null }, versions: versions.length ? versions : [{ extension_id: item.extension_id, version: item.version, registry: item.registry, published_at: item.last_updated, is_latest: true, scan_state: "not_scanned" }], scan: null };
  } catch {
    return null;
  }
}

export async function getVersionProduct(id: string, version: string, client?: SupabaseClient): Promise<Record<string, unknown> | null> {
  const db = client || publicDb();
  if (!db) return null;
  const storedId = await resolveStoredExtensionId(db, id);
  if (!storedId) return null;
  const { data: versionRow } = await db.from("extension_versions").select("*").eq("extension_id", storedId).eq("version", version).maybeSingle();
  if (!versionRow) return null;
  const scan = (await getVisibleScansByVersion(db, storedId, version)).get(version);
  const visibleVersion = {
    ...versionRow,
    latest_scan_id: scan?.id || null,
    scan_state: scan ? String(scan.analysis_status || "complete") : "not_scanned",
  };
  if (!scan?.id) return { version: visibleVersion, scan: null, findings: [], files: [], dependencies: [] };
  return loadVersionScan(db, storedId, version, String(scan.id), visibleVersion);
}

export async function getVersionScanProduct(id: string, version: string, scanId: string, client?: SupabaseClient): Promise<Record<string, unknown> | null> {
  const db = client || publicDb();
  if (!db) return null;
  const storedId = await resolveStoredExtensionId(db, id);
  if (!storedId) return null;
  const { data: versionRow } = await db.from("extension_versions").select("*").eq("extension_id", storedId).eq("version", version).maybeSingle();
  if (!versionRow) return null;
  return loadVersionScan(db, storedId, version, scanId, versionRow);
}

async function loadVersionScan(db: SupabaseClient, id: string, version: string, scanId: string, versionRow: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const [scan, findings, files, dependencies, previews] = await Promise.all([
    db.from("scans").select("*").eq("id", scanId).eq("extension_id", id).eq("version", version).maybeSingle(),
    db.from("findings").select("*").eq("scan_id", scanId).order("severity"),
    db.from("artifact_files").select("path,sha256,size_bytes").eq("scan_id", scanId).order("path").limit(5000),
    db.from("dependencies").select("name,version,ecosystem,relationship,advisories").eq("scan_id", scanId).order("relationship").order("name"),
    db.from("artifact_file_previews").select("path,content_sha256,truncated").eq("scan_id", scanId),
  ]);
  if (!scan.data) return null;
  const available = new Map((previews.data || []).map((item) => [String(item.path), item]));
  const fileRows = (files.data || []).map((item) => ({ ...item, preview_available: available.has(String(item.path)), preview: available.get(String(item.path)) || null }));
  return { version: versionRow, scan: scan.data, findings: findings.data || [], files: fileRows, dependencies: dependencies.data || [] };
}

export async function seedExtensionFromRegistry(id: string): Promise<CatalogExtension> {
  const item = await resolveMarketplaceExtension(id);
  const db = serviceDb();
  const extension = { id: item.extension_id, name: item.extension_id.split(".").slice(1).join("."), display_name: item.display_name, publisher: item.publisher, description: item.short_description, registry: item.registry || "vs-marketplace", publisher_verified: item.publisher_verified, installs: item.install_count, rating: item.rating_average, icon_url: item.icon_url, last_published_at: item.last_updated || null, updated_at: new Date().toISOString() };
  const { error } = await db.from("extensions").upsert(extension, { onConflict: "id" });
  if (error) throw error;
  await db.from("extension_versions").upsert({ extension_id: item.extension_id, version: item.version, registry: item.registry || "vs-marketplace", published_at: item.last_updated || null, download_url: item.download_url || null, is_latest: true }, { onConflict: "extension_id,version" });
  return { ...extension, repository_url: "", catalog_rank: null, latest_version: item.version, latest_scan: null };
}

function normalizeCatalogRow(row: Record<string, unknown>): CatalogExtension {
  const versions = Array.isArray(row.extension_versions) ? row.extension_versions as Array<Record<string, unknown>> : [];
  const latest = versions.find((item) => item.is_latest) || versions[0];
  return { id: String(row.id), name: String(row.name), display_name: String(row.display_name), publisher: String(row.publisher), description: String(row.description || ""), registry: String(row.registry), publisher_verified: Boolean(row.publisher_verified), installs: Number(row.installs || 0), rating: Number(row.rating || 0), icon_url: String(row.icon_url || ""), repository_url: String(row.repository_url || ""), last_published_at: row.last_published_at ? String(row.last_published_at) : null, catalog_rank: row.catalog_rank == null ? null : Number(row.catalog_rank), latest_version: latest ? String(latest.version || "") : undefined, latest_scan: null };
}

function escapeFilter(value: string): string {
  return value.replace(/[,%()]/g, " ").trim();
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function legacyPublicOutcome(row: Record<string, unknown>): string {
  const decision = String(row.decision || "incomplete");
  if (decision === "allow") return "clear";
  if (decision === "review") return "investigate";
  if (decision === "block") return String(row.verdict || "") === "malicious" ? "confirmed_threat" : "preventive_block";
  return "incomplete";
}

function normalizeDecision(value: unknown): ScanDecision {
  const decision = String(value || "incomplete");
  return decision === "allow" || decision === "review" || decision === "block" ? decision : "incomplete";
}

function humanize(value: string): string { return value.replaceAll("_", " "); }

async function resolveStoredExtensionId(db: SupabaseClient, id: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/.test(id)) return null;
  const result = await db.from("extensions").select("id").ilike("id", id).limit(1).maybeSingle();
  if (result.error) throw result.error;
  return result.data?.id ? String(result.data.id) : null;
}

function dedupeVersions(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return [...new Map(rows.filter((row) => isConcreteVersion(String(row.version || ""))).map((row) => [String(row.version), row])).values()];
}

async function activePublicClassification(
  db: SupabaseClient,
): Promise<PublicClassification | null> {
  const result = await db.from("scan_publication_releases").select("id,policy_version,ruleset_version,score_schema_version,scanner_build").eq("active", true).limit(1).maybeSingle();
  if (result.error) {
    if (!isMissingPublicationReleaseTable(result.error)) throw result.error;
    const fallback = dominantPublicClassification(await legacyPublicationRows(db));
    return fallback ? { ...fallback, scanIds: null } : null;
  }
  if (!result.data?.policy_version || !result.data?.ruleset_version || !result.data?.score_schema_version || !result.data?.scanner_build) return null;
  const members = await db.from("scan_publication_release_scans").select("scan_id").eq("release_id", result.data.id);
  if (members.error && !isMissingPublicationMembershipTable(members.error)) throw members.error;
  return {
    policyVersion: String(result.data.policy_version),
    rulesetVersion: String(result.data.ruleset_version),
    scoreSchemaVersion: String(result.data.score_schema_version),
    scannerBuild: String(result.data.scanner_build),
    scanIds: members.error ? null : (members.data || []).map((row) => String(row.scan_id)).filter(Boolean),
  };
}

type PublicClassification = {
  policyVersion: string;
  rulesetVersion: string;
  scoreSchemaVersion: string;
  scannerBuild: string;
  scanIds: string[] | null;
};

export async function getVisibleScansByVersion(
  db: SupabaseClient,
  extensionId: string,
  version?: string,
): Promise<Map<string, Record<string, unknown>>> {
  const classification = await activePublicClassification(db);
  const publicRequest = classification && classification.scanIds?.length !== 0
    ? applyVersionFilter(
      db.from("scans")
        .select("*")
        .eq("extension_id", extensionId)
        .in("scan_purpose", ["public_intelligence", "benchmark"])
        .eq("analysis_status", "complete")
        .eq("policy_version", classification.policyVersion)
        .eq("ruleset_version", classification.rulesetVersion)
        .eq("score_schema_version", classification.scoreSchemaVersion)
        .eq("scanner_build", classification.scannerBuild)
        .order("scanned_at", { ascending: false })
        .limit(5000),
      version,
    )
    : null;
  const releaseRequest = publicRequest && classification?.scanIds
    ? publicRequest.in("id", classification.scanIds)
    : publicRequest?.is("superseded_at", null) || null;
  let ownRequest = db.from("scan_job_results")
    .select("linked_at,scan:scans!inner(*)")
    .eq("scan.extension_id", extensionId)
    .order("linked_at", { ascending: false })
    .limit(5000);
  if (version) ownRequest = ownRequest.eq("scan.version", version);
  const [published, ownedLinks] = await Promise.all([
    releaseRequest || Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    ownRequest,
  ]);
  if (published.error) throw published.error;
  if (ownedLinks.error && !isMissingScanJobResultsTable(ownedLinks.error)) throw ownedLinks.error;
  const owned = (ownedLinks.data || [])
    .flatMap((row) => Array.isArray(row.scan) ? row.scan : [row.scan])
    .filter((row) => Boolean(row && typeof row === "object" && !Array.isArray(row)))
    .map((row) => row as Record<string, unknown>);
  return selectVisibleScans(
    (published.data || []) as Record<string, unknown>[],
    owned,
  );
}

export function selectVisibleScans(
  published: Record<string, unknown>[],
  owned: Record<string, unknown>[],
): Map<string, Record<string, unknown>> {
  const selected = new Map<string, Record<string, unknown>>();
  // A signed-in user's own exact scan takes precedence. RLS makes the owned
  // query empty for anonymous users and for scans requested by anyone else.
  for (const row of [...owned, ...published]) {
    const rowVersion = String(row.version || "");
    if (rowVersion && !selected.has(rowVersion)) selected.set(rowVersion, row);
  }
  return selected;
}

function applyVersionFilter<T extends { eq(column: string, value: string): T }>(
  request: T,
  version?: string,
): T {
  return version ? request.eq("version", version) : request;
}

type ClassificationRow = {
  extension_id?: unknown;
  version?: unknown;
  policy_version?: unknown;
  ruleset_version?: unknown;
  score_schema_version?: unknown;
  scanner_build?: unknown;
  scanned_at?: unknown;
};

export function dominantPublicClassification(
  rows: ClassificationRow[],
): { policyVersion: string; rulesetVersion: string; scoreSchemaVersion: string; scannerBuild: string } | null {
  const candidates = new Map<string, {
    policyVersion: string;
    rulesetVersion: string;
    scoreSchemaVersion: string;
    scannerBuild: string;
    artifacts: Set<string>;
    latestScan: string;
  }>();
  for (const row of rows) {
    const policyVersion = String(row.policy_version || "");
    const rulesetVersion = String(row.ruleset_version || "");
    const scoreSchemaVersion = String(row.score_schema_version || "");
    const scannerBuild = String(row.scanner_build || "");
    const extensionId = String(row.extension_id || "").toLowerCase();
    const version = String(row.version || "");
    if (!extensionId || !version || !scoreSchemaVersion || !/^[0-9a-f]{40}$/.test(scannerBuild) || !policyVersion || policyVersion === "legacy" || !rulesetVersion || rulesetVersion === "unknown") continue;
    const key = `${policyVersion}\u0000${rulesetVersion}\u0000${scoreSchemaVersion}\u0000${scannerBuild}`;
    const candidate = candidates.get(key) || {
      policyVersion,
      rulesetVersion,
      scoreSchemaVersion,
      scannerBuild,
      artifacts: new Set<string>(),
      latestScan: "",
    };
    candidate.artifacts.add(`${extensionId}@${version}`);
    candidate.latestScan = [candidate.latestScan, String(row.scanned_at || "")].sort().at(-1) || "";
    candidates.set(key, candidate);
  }
  const selected = [...candidates.values()].sort((left, right) =>
    right.artifacts.size - left.artifacts.size
    || right.latestScan.localeCompare(left.latestScan)
    || left.policyVersion.localeCompare(right.policyVersion)
    || left.rulesetVersion.localeCompare(right.rulesetVersion)
    || left.scoreSchemaVersion.localeCompare(right.scoreSchemaVersion)
    || left.scannerBuild.localeCompare(right.scannerBuild)
  )[0];
  return selected ? {
    policyVersion: selected.policyVersion,
    rulesetVersion: selected.rulesetVersion,
    scoreSchemaVersion: selected.scoreSchemaVersion,
    scannerBuild: selected.scannerBuild,
  } : null;
}

async function legacyPublicationRows(db: SupabaseClient): Promise<ClassificationRow[]> {
  const rows: ClassificationRow[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 100_000; from += pageSize) {
    const result = await db.from("scans")
      .select("extension_id,version,policy_version,ruleset_version,score_schema_version,scanner_build,scanned_at")
      .in("scan_purpose", ["public_intelligence", "benchmark"])
      .eq("analysis_status", "complete")
      .neq("policy_version", "legacy")
      .neq("ruleset_version", "unknown")
      .is("superseded_at", null)
      .order("scanned_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (result.error) throw result.error;
    const page = (result.data || []) as ClassificationRow[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
  throw new Error("Legacy publication release selection exceeded its safety limit.");
}

function isMissingPublicationReleaseTable(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST205"
    && String(error.message || "").includes("scan_publication_releases");
}

function isMissingPublicationMembershipTable(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST205"
    && String(error.message || "").includes("scan_publication_release_scans");
}

function isMissingScanJobResultsTable(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST205"
    && String(error.message || "").includes("scan_job_results");
}

export type BadgeDecision = {
  found: boolean;
  extension_id: string | null;
  version: string | null;
  decision: "allow" | "review" | "block" | null;
  scanned_at: string | null;
};

const cachedBadgeDecision=unstable_cache(async(id:string)=>fetchBadgeDecision(id),["public-badge-v1"],{revalidate:300,tags:["public-intel"]});

export function getBadgeDecision(id: string): Promise<BadgeDecision> { return cachedBadgeDecision(id.toLowerCase()); }

async function fetchBadgeDecision(rawId: string): Promise<BadgeDecision> {
  const db = publicDb();
  if (!db) return { found: false, extension_id: null, version: null, decision: null, scanned_at: null };
  const storedId = await resolveStoredExtensionId(db, rawId);
  if (!storedId) return { found: false, extension_id: null, version: null, decision: null, scanned_at: null };
  const classification = await activePublicClassification(db).catch(() => null);
  let request = db.from("scans").select("id,extension_id,version,decision,scanned_at")
    .eq("extension_id", storedId)
    .in("scan_purpose", ["public_intelligence", "benchmark"])
    .eq("analysis_status", "complete")
    .is("superseded_at", null)
    .order("scanned_at", { ascending: false })
    .limit(1);
  if (classification?.scanIds) request = request.in("id", classification.scanIds);
  const { data } = await request;
  const row = (data || [])[0] as Record<string, unknown> | undefined;
  if (!row) return { found: true, extension_id: storedId, version: null, decision: null, scanned_at: null };
  const decision = normalizeDecision(row.decision);
  return {
    found: true,
    extension_id: storedId,
    version: String(row.version || ""),
    decision: decision === "incomplete" ? null : decision,
    scanned_at: row.scanned_at ? String(row.scanned_at) : null,
  };
}


function emptyInventory(): PublicInventory {
  return { items: [], totals: { extensions: 0, releases: 0, complete: 0, allowed: 0, expected: 0, investigate: 0, review: 0, blocked: 0, lastScannedAt: null } };
}
