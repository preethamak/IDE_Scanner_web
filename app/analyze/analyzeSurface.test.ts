import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  new URL("./AnalyzePage.tsx", import.meta.url),
  "utf8",
);
const api = readFileSync(
  new URL("../api/scans/upload/route.ts", import.meta.url),
  "utf8",
);

describe("Analyze product boundary", () => {
  it("routes each source to an honest supported workflow", () => {
    expect(page).toContain("Search the Extension Registry");
    expect(page).toContain("Open the CLI guide");
    expect(page).toContain("Choose report.zip");
    expect(page).not.toContain("/api/scans/upload");
    expect(api).toContain("canonical_cli_required");
  });

  it("validates and imports reports without uploading them", () => {
    expect(page).toContain("100 MB browser import limit");
    expect(page).toContain("parseReportBundle");
    expect(page).toContain("saveImportedReport");
    expect(page).toMatch(/Nothing is\s+uploaded/);
    expect(page).toContain('role="status"');
  });
});
