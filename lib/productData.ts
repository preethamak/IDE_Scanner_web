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
      if (latest?.latest_scan_id) {
        const result = await db.from("scans").select("*").eq("id", latest.latest_scan_id).maybeSingle();
        scan = result.data as Record<string, unknown> | null;
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
