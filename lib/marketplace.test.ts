import { afterEach, describe, expect, it, vi } from "vitest";
import { isConcreteVersion, listMarketplaceVersions } from "@/lib/marketplace";

describe("listMarketplaceVersions", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("deduplicates target-platform entries for the same Marketplace version", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ extensions: [{ versions: [
        { version: "2.1.218", lastUpdated: "first" },
        { version: "2.1.218", lastUpdated: "duplicate-platform" },
        { version: "2.1.217", lastUpdated: "older" },
      ] }] }] }),
    }));

    const versions = await listMarketplaceVersions("Anthropic.claude-code");
    expect(versions.map((item) => item.version)).toEqual(["2.1.218", "2.1.217"]);
    expect(versions.filter((item) => item.is_latest)).toHaveLength(1);
  });

  it("rejects registry channel aliases as exact versions", () => {
    expect(isConcreteVersion("latest")).toBe(false);
    expect(isConcreteVersion("2.1.218")).toBe(true);
  });
});
