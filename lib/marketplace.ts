import type { MarketplaceSearchResult } from "@/lib/types";

const GALLERY_URL = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=7.2-preview.1";

type GalleryExtension = {
  extensionName?: string;
  displayName?: string;
  shortDescription?: string;
  lastUpdated?: string;
  publisher?: { publisherName?: string; displayName?: string; isDomainVerified?: boolean; flags?: string };
  versions?: Array<{ version?: string; lastUpdated?: string; files?: Array<{ assetType?: string; source?: string }> }>;
  statistics?: Array<{ statisticName?: string; value?: number }>;
};

export async function searchMarketplace(query: string, limit = 20): Promise<MarketplaceSearchResult[]> {
  const [marketplace, openvsx] = await Promise.allSettled([searchVsMarketplace(query, limit), searchOpenVsx(query, limit)]);
  const combined = [...(marketplace.status === "fulfilled" ? marketplace.value : []), ...(openvsx.status === "fulfilled" ? openvsx.value : [])];
  const unique = new Map<string, MarketplaceSearchResult>();
  for (const item of combined) if (!unique.has(item.extension_id.toLowerCase())) unique.set(item.extension_id.toLowerCase(), item);
  if (marketplace.status === "rejected" && openvsx.status === "rejected") {
    throw new Error("Neither VS Marketplace nor Open VSX could be reached.");
  }
  return [...unique.values()].slice(0, limit);
}

async function searchVsMarketplace(query: string, limit: number): Promise<MarketplaceSearchResult[]> {
  const response = await fetch(GALLERY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json;api-version=7.2-preview.1" },
    body: JSON.stringify({ filters: [{ criteria: [{ filterType: 10, value: query }], pageNumber: 1, pageSize: Math.min(limit, 25), sortBy: 4 }], flags: 914 }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`VS Marketplace search returned ${response.status}`);
  const data = await response.json() as { results?: Array<{ extensions?: GalleryExtension[] }> };
  return (data.results?.[0]?.extensions || []).map(normalizeExtension).filter((item): item is MarketplaceSearchResult => Boolean(item));
}

async function searchOpenVsx(query: string, limit: number): Promise<MarketplaceSearchResult[]> {
  const response = await fetch(`https://open-vsx.org/api/-/search?query=${encodeURIComponent(query)}&size=${Math.min(limit, 25)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Open VSX search returned ${response.status}`);
  const data = await response.json() as { extensions?: OpenVsxExtension[] };
  return (data.extensions || []).map(normalizeOpenVsx);
}

export async function resolveMarketplaceExtension(extensionId: string): Promise<MarketplaceSearchResult> {
  const normalized = normalizeMarketplaceId(extensionId);
  const results = await searchMarketplace(normalized, 25);
  const exact = results.find((item) => item.extension_id.toLowerCase() === normalized.toLowerCase());
  if (!exact) {
    const openvsx = await resolveOpenVsxExtension(normalized);
    if (openvsx) return openvsx;
    throw new Error(`Extension ${normalized} was not found on VS Marketplace or Open VSX.`);
  }
  return exact;
}

export async function listMarketplaceVersions(extensionId: string): Promise<Array<{ extension_id: string; version: string; registry: "vs-marketplace" | "openvsx"; published_at: string; download_url: string; is_latest: boolean; scan_state: "not_scanned" }>> {
  const normalized = normalizeMarketplaceId(extensionId);
  const [publisher, name] = normalized.split(".", 2);
  const marketplace = await fetch(GALLERY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json;api-version=7.2-preview.1" },
    body: JSON.stringify({ filters: [{ criteria: [{ filterType: 7, value: normalized }], pageNumber: 1, pageSize: 1 }], flags: 402 }),
    cache: "no-store",
  }).then(async (response) => response.ok ? response.json() as Promise<{ results?: Array<{ extensions?: GalleryExtension[] }> }> : null).catch(() => null);
  const raw = marketplace?.results?.[0]?.extensions?.[0];
  const versions = (raw?.versions || []).filter((item) => item.version).map((item, index) => ({ extension_id: normalized, version: String(item.version), registry: "vs-marketplace" as const, published_at: String(item.lastUpdated || ""), download_url: `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${encodeURIComponent(publisher)}/vsextensions/${encodeURIComponent(name)}/${encodeURIComponent(String(item.version))}/vspackage`, is_latest: index === 0, scan_state: "not_scanned" as const }));
  if (versions.length) return versions;

  const openvsx = await fetch(`https://open-vsx.org/api/${encodeURIComponent(publisher)}/${encodeURIComponent(name)}`, { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<OpenVsxExtension & { allVersions?: Record<string, string> }> : null).catch(() => null);
  if (!openvsx) return [];
  const all = Object.keys(openvsx.allVersions || {});
  const versionValues = all.length ? all : openvsx.version ? [openvsx.version] : [];
  return versionValues.map((version, index) => ({ extension_id: normalized, version, registry: "openvsx" as const, published_at: version === openvsx.version ? String(openvsx.timestamp || "") : "", download_url: version === openvsx.version ? String(openvsx.files?.download || "") : `https://open-vsx.org/api/${encodeURIComponent(publisher)}/${encodeURIComponent(name)}/${encodeURIComponent(version)}/file/${encodeURIComponent(publisher)}.${encodeURIComponent(name)}-${encodeURIComponent(version)}.vsix`, is_latest: index === 0 || version === openvsx.version, scan_state: "not_scanned" as const }));
}

export function marketplaceVsixUrl(item: MarketplaceSearchResult): string {
  if (item.download_url) return item.download_url;
  const [, name] = item.extension_id.split(".", 2);
  return `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${encodeURIComponent(item.publisher)}/vsextensions/${encodeURIComponent(name)}/${encodeURIComponent(item.version)}/vspackage`;
}

export function normalizeMarketplaceId(value: string): string {
  const raw = value.trim();
  const vscodePrefix = "vscode:extension/";
  if (raw.toLowerCase().startsWith(vscodePrefix)) return raw.slice(vscodePrefix.length).split(/[?#]/, 1)[0];
  try {
    const url = new URL(raw);
    const itemName = url.searchParams.get("itemName");
    if (itemName) return itemName;
  } catch { /* It is already an extension id. */ }
  if (!/^[\w-]+\.[\w.-]+$/.test(raw)) throw new Error("Use publisher.extension, a Marketplace URL, or vscode:extension/ URI.");
  return raw;
}

function normalizeExtension(raw: GalleryExtension): MarketplaceSearchResult | null {
  const publisher = raw.publisher?.publisherName || "";
  const name = raw.extensionName || "";
  const version = raw.versions?.[0];
  if (!publisher || !name || !version?.version) return null;
  const stats = Object.fromEntries((raw.statistics || []).map((item) => [item.statisticName?.toLowerCase(), item.value || 0]));
  const icon = version.files?.find((item) => item.assetType === "Microsoft.VisualStudio.Services.Icons.Small") || version.files?.find((item) => item.assetType === "Microsoft.VisualStudio.Services.Icons.Default");
  return {
    extension_id: `${publisher}.${name}`,
    display_name: raw.displayName || name,
    publisher,
    publisher_display_name: raw.publisher?.displayName || publisher,
    publisher_verified: Boolean(raw.publisher?.isDomainVerified || String(raw.publisher?.flags || "").toLowerCase().includes("verified")),
    short_description: raw.shortDescription || "",
    version: version.version,
    last_updated: version.lastUpdated || raw.lastUpdated || "",
    install_count: Number(stats.install || 0),
    rating_average: Number(stats.averagerating || 0),
    rating_count: Number(stats.ratingcount || 0),
    icon_url: icon?.source || "",
    registry: "vs-marketplace"
  };
}

type OpenVsxExtension = { name?: string; namespace?: string; version?: string; displayName?: string; description?: string; verified?: boolean; downloadCount?: number; averageRating?: number; reviewCount?: number; timestamp?: string; files?: { download?: string; icon?: string } };

function normalizeOpenVsx(raw: OpenVsxExtension): MarketplaceSearchResult {
  const publisher = raw.namespace || "unknown";
  const name = raw.name || "extension";
  return { extension_id: `${publisher}.${name}`, display_name: raw.displayName || name, publisher, publisher_display_name: publisher, publisher_verified: Boolean(raw.verified), short_description: raw.description || "", version: raw.version || "", last_updated: raw.timestamp || "", install_count: Number(raw.downloadCount || 0), rating_average: Number(raw.averageRating || 0), rating_count: Number(raw.reviewCount || 0), icon_url: raw.files?.icon || "", registry: "openvsx", download_url: raw.files?.download || "" };
}

async function resolveOpenVsxExtension(extensionId: string): Promise<MarketplaceSearchResult | null> {
  const [publisher, name] = extensionId.split(".", 2);
  const response = await fetch(`https://open-vsx.org/api/${encodeURIComponent(publisher)}/${encodeURIComponent(name)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Open VSX lookup returned ${response.status}`);
  return normalizeOpenVsx(await response.json() as OpenVsxExtension);
}
