import { normalizeMarketplaceId } from "@/lib/marketplace";
import type { DiscoveryResponse, DiscoveryResult, MarketplaceSearchResult, PublisherDiscoveryResult } from "@/lib/types";

export function normalizedDiscoveryQuery(query: string): string | undefined {
  try { return normalizeMarketplaceId(query); } catch { return undefined; }
}

export function buildDiscoveryResponse(query: string, items: MarketplaceSearchResult[], source: "registry" | "registry-cache" = "registry"): DiscoveryResponse {
  const clean = query.trim();
  const normalized = normalizedDiscoveryQuery(clean);
  const needle = clean.toLocaleLowerCase();
  const terms = needle.split(/\s+/).filter(Boolean);
  const enriched: DiscoveryResult[] = items.map((item) => {
    const identity = item.extension_id.toLocaleLowerCase();
    const name = item.display_name.toLocaleLowerCase();
    const exact = normalized ? identity === normalized.toLocaleLowerCase() : name === needle;
    const matching = !exact && terms.length > 0 && terms.every((term) => name.includes(term) || identity.includes(term));
    return {
      ...item,
      normalized_identity: item.extension_id,
      source: source === "registry-cache" ? "cache" : "registry",
      match_reason: exact ? (normalized ? "exact_identity" : "exact_name") : matching ? "matching" : "related",
      icon_state: item.icon_url ? "published" : "fallback",
    };
  });
  const exact_match = enriched.find((item) => item.match_reason === "exact_identity" || item.match_reason === "exact_name") || null;
  const matching_extensions = enriched.filter((item) => item.match_reason === "matching");
  const related_extensions = enriched.filter((item) => item.match_reason === "related");
  const publishers = new Map<string, PublisherDiscoveryResult>();
  for (const item of enriched) {
    const publisherMatches = item.publisher.toLocaleLowerCase() === needle
      || item.publisher_display_name.toLocaleLowerCase() === needle;
    if (!publisherMatches) continue;
    const key = `${item.registry || "vs-marketplace"}:${item.publisher.toLocaleLowerCase()}`;
    const current = publishers.get(key);
    publishers.set(key, {
      publisher: item.publisher,
      display_name: item.publisher_display_name || item.publisher,
      verified: Boolean(item.publisher_verified),
      registry: item.registry || "vs-marketplace",
      matched_extensions: (current?.matched_extensions || 0) + 1,
    });
  }
  return { query: clean, normalized_query: normalized, exact_match, matching_extensions, related_extensions, matching_publishers: [...publishers.values()], results: items, source };
}
