import { afterEach, describe, expect, it, vi } from "vitest";
import { isConcreteVersion, listMarketplaceVersions, listPublisherExtensions, searchMarketplace } from "@/lib/marketplace";

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

  it("returns an exact Marketplace identity without waiting for Open VSX", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("marketplace.visualstudio.com");
      return {
        ok: true,
        json: async () => ({ results: [{ extensions: [{
          extensionName: "copilot", displayName: "GitHub Copilot", publisher: { publisherName: "GitHub" }, versions: [{ version: "1.0.0" }],
        }] }] }),
      };
    });
    vi.stubGlobal("fetch", fetch);

    await expect(searchMarketplace("GitHub.copilot")).resolves.toMatchObject([{ extension_id: "GitHub.copilot" }]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("lists and ranks only extensions from the exact publisher", async () => {
    const extension = (publisher: string, name: string, installs: number) => ({
      extensionName: name,
      displayName: name,
      publisher: { publisherName: publisher, displayName: publisher, isDomainVerified: true },
      versions: [{ version: "1.0.0" }],
      statistics: [{ statisticName: "install", value: installs }],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ extensions: [extension("GitHub", "second", 20), extension("Other", "noise", 999), extension("GitHub", "first", 50)] }] }),
    }));
    const results = await listPublisherExtensions("GitHub");
    expect(results.map((item) => item.extension_id)).toEqual(["GitHub.first", "GitHub.second"]);
    const body = JSON.parse(String((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body));
    expect(body.filters[0].criteria).toEqual([{ filterType: 2, value: "GitHub" }]);
  });
});
