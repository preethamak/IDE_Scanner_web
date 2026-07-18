import { publicDb, serviceDb } from "@/lib/supabase";
import { listMarketplaceVersions, resolveMarketplaceExtension, searchMarketplace } from "@/lib/marketplace";
import { benchmarkRows } from "@/lib/websiteBenchmarkRows";
import { websiteBenchmark } from "@/lib/websiteBenchmark";
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
export type PublicInventoryItem = PublicSecurityFeedItem & { publisher: string; publisher_verified: boolean; description: string; icon_url: string; risk_score: number; malware_score: number; artifact_sha256: string };
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
  // The registry intentionally uses the frozen July 16 cohort everywhere. This
  // prevents a partially populated operational database from presenting stale
  // or different extension results to different visitors.
  const publishedAt = `${websiteBenchmark.publishedAt}T00:00:00.000Z`;
  const db = publicDb();
  const ids = benchmarkRows.slice(0, limit).map((row) => row.id);
  const { data: stored } = db ? await db.from("extensions").select("id,icon_url,publisher_verified").in("id", ids) : { data: [] as Array<{ id: string; icon_url: string | null; publisher_verified: boolean | null }> };
  const metadata = new Map((stored || []).map((item) => [String(item.id), item]));
  const items: PublicInventoryItem[] = benchmarkRows.slice(0, limit).map((row) => ({
    extension_id: row.id,
    version: row.version,
    artifact_sha256: row.sha256,
    display_name: displayNameForExtension(row.id),
    publisher: row.id.split(".")[0],
    description: `${row.classification.replaceAll("-", " ")} · final regression result`,
    icon_url: String(metadata.get(row.id)?.icon_url || marketplaceIcon(row.id, row.version)),
    publisher_verified: Boolean(metadata.get(row.id)?.publisher_verified || verifiedPublisher(row.id)),
    severity: row.final_severity,
    decision: row.final_decision,
    scanned_at: publishedAt,
    coverage_percent: row.final_coverage,
    decision_reason: `Final updated-scanner disposition: ${row.final_decision}.`,
    risk_score: row.risk,
    malware_score: row.malware,
  }));
  return { items, totals: { extensions: items.length, releases: items.length, complete: items.filter((item) => item.decision !== "incomplete").length, review: items.filter((item) => item.decision === "review").length, blocked: items.filter((item) => item.decision === "block").length, lastScannedAt: publishedAt } };
}

function marketplaceIcon(id: string, version: string) {
  const [publisher, ...name] = id.split(".");
  return `https://${encodeURIComponent(publisher)}.gallery.vsassets.io/_apis/public/gallery/publisher/${encodeURIComponent(publisher)}/extension/${encodeURIComponent(name.join("."))}/${encodeURIComponent(version)}/assetbyname/Microsoft.VisualStudio.Services.Icons.Default`;
}

function verifiedPublisher(id: string) {
  return new Set(["GitHub", "ms-vscode", "ms-vscode-remote", "ms-azuretools", "ms-kubernetes-tools", "ms-python", "amazonwebservices", "aquasecurityofficial", "SonarSource", "redhat", "golang"]).has(id.split(".")[0]);
}

function displayNameForExtension(id: string): string {
  const names: Record<string, string> = {
    "amazonwebservices.aws-toolkit-vscode": "AWS Toolkit",
    "aquasecurityofficial.trivy-vulnerability-scanner": "Trivy Vulnerability Scanner",
    "dbaeumer.vscode-eslint": "ESLint",
    "esbenp.prettier-vscode": "Prettier",
    "GitHub.copilot": "GitHub Copilot",
    "GitHub.copilot-chat": "GitHub Copilot Chat",
    "GitHub.vscode-pull-request-github": "GitHub Pull Requests",
    "ms-azuretools.vscode-docker": "Docker Extension Pack",
    "ms-kubernetes-tools.vscode-kubernetes-tools": "Kubernetes",
    "ms-vscode-remote.remote-containers": "Dev Containers",
    "ms-vscode-remote.remote-ssh": "Remote - SSH",
    "ms-vscode.azure-account": "Azure Account",
    "ms-vscode.cpptools": "C/C++",
    "PKief.material-icon-theme": "Material Icon Theme",
    "RooVeterinaryInc.roo-cline": "Roo Code",
    "SonarSource.sonarlint-vscode": "SonarQube for IDE",
  };
  return names[id] || id.split(".").slice(1).join(" ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  const [scan, findings, files, dependencies, previews] = await Promise.all([
    db.from("scans").select("*").eq("id", scanId).single(),
    db.from("findings").select("*").eq("scan_id", scanId).order("severity"),
    db.from("artifact_files").select("*").eq("scan_id", scanId).order("path").limit(5000),
    db.from("dependencies").select("*").eq("scan_id", scanId).order("relationship").order("name"),
    db.from("artifact_file_previews").select("path,content_sha256,truncated").eq("scan_id", scanId),
  ]);
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
