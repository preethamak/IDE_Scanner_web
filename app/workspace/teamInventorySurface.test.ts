import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const workspace = read("../TeamWorkspace.tsx");
const inventory = read("./TeamInventoryPanel.tsx");
const css = read("./teamInventory.module.css");

describe("team inventory workspace surface", () => {
  it("makes inventory a first-class team workspace destination", () => {
    expect(workspace).toContain('["inventory", "Inventory", Laptop]');
    expect(workspace).toContain("<TeamInventoryPanel");
    expect(workspace).toContain("teamId={activeTeam.id}");
  });

  it("covers empty, import, ready, retry, and bulk-monitoring states", () => {
    for (const copy of [
      "No team inventory yet.",
      "Import one device snapshot",
      "Load example",
      "Try again",
      "Monitor {monitorable.length} discovered",
      "Exact versions scanned",
      "Unknown or unscanned",
    ]) expect(inventory).toContain(copy);
  });

  it("limits file input and explains the privacy boundary", () => {
    expect(inventory).toContain('accept="application/json,.json"');
    expect(inventory).toContain("file.size > 1_000_000");
    expect(inventory).toContain("not local paths or source files");
  });

  it("has responsive inventory cards, table, and importer styles", () => {
    for (const selector of [".metrics", ".table", ".importer", "@media(max-width:850px)"]) expect(css).toContain(selector);
  });
});
