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

export async function resolveMarketplaceExtension(extensionId: string): Promise<MarketplaceSearchResult> {
  const normalized = normalizeMarketplaceId(extensionId);
  const results = await searchMarketplace(normalized, 25);
  const exact = results.find((item) => item.extension_id.toLowerCase() === normalized.toLowerCase());
  if (!exact) throw new Error(`Extension ${normalized} was not found on VS Marketplace.`);
  return exact;
}

export function marketplaceVsixUrl(item: MarketplaceSearchResult): string {
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
    icon_url: icon?.source || ""
  };
}
