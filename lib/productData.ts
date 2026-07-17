import { publicDb, serviceDb } from "@/lib/supabase";
import { listMarketplaceVersions, resolveMarketplaceExtension, searchMarketplace } from "@/lib/marketplace";
import { unstable_cache } from "next/cache";

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

export type PublicSecurityFeedItem = { extension_id: string; version: string; display_name: string; severity: string; decision: string; scanned_at: string; coverage_percent: number; decision_reason: string };
export type PublicInventoryItem = PublicSecurityFeedItem & { publisher: string; description: string; icon_url: string; risk_score: number; malware_score: number; artifact_sha256: string };
export type PublicInventory = { items: PublicInventoryItem[]; totals: { extensions: number; releases: number; complete: number; review: number; blocked: number; lastScannedAt: string | null } };

export async function getPublicSecurityFeed(limit = 6): Promise<PublicSecurityFeedItem[]> {
  const db = publicDb();
  if (!db) return [];
  const { data: scans } = await db.from("scans").select("extension_id,version,severity,decision,scanned_at,coverage_percent,decision_reason").eq("scan_purpose", "public_intelligence").is("superseded_at", null).in("decision", ["review", "block", "incomplete"]).order("scanned_at", { ascending: false }).limit(80);
  const rank = (severity: string) => ({ CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 }[severity] || 0);
  const latest = new Map<string, Record<string, unknown>>();
  for (const scan of (scans || []) as Array<Record<string, unknown>>) { const key = `${scan.extension_id}@${scan.version}`; if (!latest.has(key)) latest.set(key, scan); }
  const rows = [...latest.values()].sort((a, b) => rank(String(b.severity)) - rank(String(a.severity)) || String(b.scanned_at).localeCompare(String(a.scanned_at))).slice(0, limit);
  const ids = [...new Set(rows.map((item) => String(item.extension_id)))];
  const { data: extensions } = ids.length ? await db.from("extensions").select("id,display_name").in("id", ids) : { data: [] as Array<{ id: string; display_name: string }> };
  const names = new Map((extensions || []).map((item) => [String(item.id), String(item.display_name)]));
  return rows.map((item) => ({ extension_id: String(item.extension_id), version: String(item.version), display_name: names.get(String(item.extension_id)) || String(item.extension_id), severity: String(item.severity || "INFO"), decision: String(item.decision || "incomplete"), scanned_at: String(item.scanned_at), coverage_percent: Number(item.coverage_percent || 0), decision_reason: String(item.decision_reason || "Open the exact artifact evidence.") }));
}

/** Public operational scans only. Benchmark, development and private work never enter this catalog. */
export async function getPublicInventory(limit = 240): Promise<PublicInventory> {
  const empty: PublicInventory = { items: [], totals: { extensions: 0, releases: 0, complete: 0, review: 0, blocked: 0, lastScannedAt: null } };
  const db = publicDb();
  if (!db) return empty;
  const { data, error } = await db.from("scans")
    .select("extension_id,version,artifact_sha256,decision,severity,scanned_at,coverage_percent,decision_reason,risk_score,malware_score")
    .eq("scan_purpose", "public_intelligence").is("superseded_at", null).order("scanned_at", { ascending: false }).limit(limit);
  if (error || !data) return empty;
  const ids = [...new Set((data as Array<Record<string, unknown>>).map((row) => String(row.extension_id)))];
  const { data: extensions } = ids.length ? await db.from("extensions").select("id,display_name,publisher,description,icon_url").in("id", ids) : { data: [] as Array<Record<string, unknown>> };
  const extensionById = new Map((extensions || []).map((row) => [String(row.id), row as Record<string, unknown>]));
  const latest = new Map<string, PublicInventoryItem>();
  const releases = new Set<string>();
  for (const raw of data as Array<Record<string, unknown>>) {
    const extension = extensionById.get(String(raw.extension_id)) || {};
    const item: PublicInventoryItem = {
      extension_id: String(raw.extension_id), version: String(raw.version), artifact_sha256: String(raw.artifact_sha256 || ""),
      display_name: String(extension.display_name || raw.extension_id), publisher: String(extension.publisher || "Unknown publisher"),
      description: String(extension.description || "Exact artifact analysis is available."), icon_url: String(extension.icon_url || ""),
      severity: String(raw.severity || "INFO"), decision: String(raw.decision || "incomplete"), scanned_at: String(raw.scanned_at),
      coverage_percent: Number(raw.coverage_percent || 0), decision_reason: String(raw.decision_reason || "Open the evidence."),
      risk_score: Number(raw.risk_score || 0), malware_score: Number(raw.malware_score || 0),
    };
    releases.add(`${item.extension_id}@${item.version}@${item.artifact_sha256}`);
    if (!latest.has(item.extension_id)) latest.set(item.extension_id, item);
  }
  const items = [...latest.values()];
  return { items, totals: { extensions: items.length, releases: releases.size, complete: items.filter((item) => item.decision !== "incomplete").length, review: items.filter((item) => item.decision === "review").length, blocked: items.filter((item) => item.decision === "block").length, lastScannedAt: items[0]?.scanned_at || null } };
}

export async function listCatalog(query = "", limit = 50): Promise<CatalogExtension[]> {
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

export async function getExtensionProduct(id: string): Promise<{ extension: CatalogExtension; versions: Array<Record<string, unknown>>; scan: Record<string, unknown> | null } | null> {
  const db = publicDb();
  if (db) {
    const [{ data: extension }, { data: versions }] = await Promise.all([
      db.from("extensions").select("*").eq("id", id).maybeSingle(),
      db.from("extension_versions").select("*").eq("extension_id", id).order("published_at", { ascending: false, nullsFirst: false }),
    ]);
    if (extension) {
      let versionRows = versions || [];
      if (versionRows.length <= 1) {
        const registryVersions = await cachedVersions(id).catch(() => []);
        const persisted = new Map(versionRows.map((item) => [String(item.version), item]));
        versionRows = registryVersions.map((item) => ({ ...item, ...(persisted.get(item.version) || {}) }));
        if (!versionRows.length) versionRows = versions || [];
      }
      const latest = versionRows.find((item) => item.is_latest) || versionRows[0];
      let scan: Record<string, unknown> | null = null;
      const scanIds = versionRows.map((item) => String(item.latest_scan_id || "")).filter(Boolean);
      if (scanIds.length) {
        const result = await db.from("scans").select("*").in("id", scanIds);
        const scans = (result.data || []) as Array<Record<string, unknown>>;
        const scansById = new Map(scans.map((item) => [String(item.id), item]));
        versionRows = versionRows.map((item) => {
          const versionScan = scansById.get(String(item.latest_scan_id || ""));
          return {
            ...item,
            decision: versionScan?.decision || null,
            coverage_percent: versionScan?.coverage_percent ?? null,
            scanned_at: versionScan?.scanned_at || null,
          };
        });
        scan = scansById.get(String(latest?.latest_scan_id || "")) || null;
      }
      return { extension: normalizeCatalogRow(extension as Record<string, unknown>), versions: versionRows, scan };
    }
  }
  try {
    const item = await resolveMarketplaceExtension(id);
    const versions = await cachedVersions(item.extension_id);
    return { extension: { id: item.extension_id, name: item.extension_id.split(".").slice(1).join("."), display_name: item.display_name, publisher: item.publisher, description: item.short_description, registry: item.registry || "vs-marketplace", publisher_verified: item.publisher_verified, installs: item.install_count, rating: item.rating_average, icon_url: item.icon_url, repository_url: "", last_published_at: item.last_updated || null, catalog_rank: null, latest_version: item.version, latest_scan: null }, versions: versions.length ? versions : [{ extension_id: item.extension_id, version: item.version, registry: item.registry, published_at: item.last_updated, is_latest: true, scan_state: "not_scanned" }], scan: null };
  } catch {
    return null;
  }
}

export async function getVersionProduct(id: string, version: string): Promise<Record<string, unknown> | null> {
  const db = publicDb();
  if (!db) return null;
  const { data: versionRow } = await db.from("extension_versions").select("*").eq("extension_id", id).eq("version", version).maybeSingle();
  if (!versionRow) return null;
  const scanId = versionRow.latest_scan_id;
  if (!scanId) return { version: versionRow, scan: null, findings: [], files: [], dependencies: [] };
  const [scan, findings, files, dependencies] = await Promise.all([
    db.from("scans").select("*").eq("id", scanId).single(),
    db.from("findings").select("*").eq("scan_id", scanId).order("severity"),
    db.from("artifact_files").select("*").eq("scan_id", scanId).order("path").limit(5000),
    db.from("dependencies").select("*").eq("scan_id", scanId).order("relationship").order("name"),
  ]);
  return { version: versionRow, scan: scan.data, findings: findings.data || [], files: files.data || [], dependencies: dependencies.data || [] };
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
