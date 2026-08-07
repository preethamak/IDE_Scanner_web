import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const css = readFileSync(
  new URL("./reports.module.css", import.meta.url),
  "utf8",
);

describe("reports product surface", () => {
  it("leads with portable evidence and represents local storage honestly", () => {
    expect(page).toContain("Keep the decision portable");
    expect(page).toContain("without uploading them");
    expect(page).toContain("Stored in this browser");
    expect(page).toContain("Import a report");
  });

  it("supports loading, empty, populated, and confirmed-delete states", () => {
    expect(page).toContain("Opening your local report library");
    expect(page).toContain("No reports saved on this device");
    expect(page).toContain("pendingDelete === report.id");
    expect(page).toContain('role="alertdialog"');
  });

  it("uses a light responsive surface with reduced-motion behavior", () => {
    expect(css).toContain("#dce9ff");
    expect(css).toContain("#ffe5ef");
    expect(css).toContain("#efffcf");
    expect(css).toContain("prefers-reduced-motion");
  });
});
