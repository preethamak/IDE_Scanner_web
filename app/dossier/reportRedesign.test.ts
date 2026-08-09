import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("exact-release report redesign", () => {
  it("places decision evidence and identity in the first report viewport", () => {
    const dossier = read("../ExtensionDossier.tsx");
    expect(dossier).toContain("Report evidence snapshot");
    expect(dossier).toContain("Actionable evidence");
    expect(dossier).toContain("Package scope");
    expect(dossier).toContain("About immutable reports");
  });

  it("makes the policy path inspectable instead of presenting an unexplained score", () => {
    const overview = read("./OverviewSection.tsx");
    for (const step of ["Artifact bound", "Analysis checked", "Evidence grouped", "Policy applied"]) {
      expect(overview).toContain(step);
    }
    expect(overview).toContain('aria-label="Decision trace"');
  });

  it("uses a route-scoped dense shell with responsive and sticky navigation", () => {
    const css = read("./reportShell.module.css");
    expect(css).toContain(".pulse");
    expect(css).toContain("position:sticky");
    expect(css).toContain("reportTrace");
    expect(css).toContain("@media(max-width:620px)");
  });
});
