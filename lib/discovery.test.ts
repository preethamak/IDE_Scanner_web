import { describe, expect, it } from "vitest";
import { buildDiscoveryResponse, normalizedDiscoveryQuery } from "@/lib/discovery";
import type { MarketplaceSearchResult } from "@/lib/types";

const vyper: MarketplaceSearchResult = { extension_id: "tintinweb.vscode-vyper", display_name: "Vyper", publisher: "tintinweb", publisher_display_name: "tintinweb", publisher_verified: false, short_description: "Vyper support", version: "0.1.0", last_updated: "", install_count: 1, rating_average: 0, rating_count: 0, icon_url: "", registry: "vs-marketplace" };
const guard: MarketplaceSearchResult = { ...vyper, extension_id: "vyperguard.vyper-guard", display_name: "Vyper Guard" };

describe("discovery normalization and ranking", () => {
  it("normalizes identities, Marketplace URLs, and VS Code URIs", () => {
    expect(normalizedDiscoveryQuery("tintinweb.vscode-vyper")).toBe("tintinweb.vscode-vyper");
    expect(normalizedDiscoveryQuery("https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-vyper")).toBe("tintinweb.vscode-vyper");
    expect(normalizedDiscoveryQuery("vscode:extension/tintinweb.vscode-vyper")).toBe("tintinweb.vscode-vyper");
  });
  it("does not turn a multi-word fuzzy query into an exact target", () => {
    const result = buildDiscoveryResponse("vyper guard", [vyper]);
    expect(result.exact_match).toBeNull();
    expect(result.matching_extensions).toHaveLength(0);
    expect(result.related_extensions[0].extension_id).toBe("tintinweb.vscode-vyper");
  });
  it("returns an exact Vyper Guard name when it exists", () => {
    const result = buildDiscoveryResponse("vyper guard", [vyper, guard]);
    expect(result.exact_match?.extension_id).toBe("vyperguard.vyper-guard");
    expect(result.exact_match?.match_reason).toBe("exact_name");
  });
});
