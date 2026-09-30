import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("MCP registry surface", () => {
  it("keeps directory metadata and local assessment separate", () => {
    const page = read("./page.tsx");
    const client = read("./McpRegistryClient.tsx");
    const route = read("../api/mcp/scan/route.ts");
    expect(page).toContain("loadMcpDirectory");
    expect(client).toContain("/api/mcp/scan");
    expect(client).toContain("Unavailable metrics remain visible");
    expect(route).toContain("localScannerEnabled");
  });

  it("uses the established GuardRails registry path", () => {
    const route = read("../registry/mcp/page.tsx");
    const nav = read("../SiteNav.tsx");
    expect(route).toContain("/registry/mcp");
    expect(nav).toContain("MCP Registry");
  });
});
