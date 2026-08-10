import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("exact-release report redesign", () => {
  it("places decision evidence and identity in the first report viewport", () => {
    const dossier = read("../ExtensionDossier.tsx");
    const hero = read("./ReportHero.tsx");
    expect(dossier).toContain("<ReportHero");
    expect(hero).toContain("Exact-release evidence snapshot");
    expect(hero).toContain("What is immutable?");
    expect(hero).toContain("Keep the decision useful");
  });

  it("makes the policy path inspectable instead of presenting an unexplained score", () => {
    const overview = read("./OverviewSection.tsx");
    for (const step of ["Artifact bound", "Analysis checked", "Evidence grouped", "Policy applied"]) {
      expect(overview).toContain(step);
    }
    expect(overview).toContain('aria-label="Decision trace"');
  });

  it("uses one route-scoped left report navigation instead of a second top bar", () => {
    const css = read("./reportShell.module.css");
    const sidebar = read("./reportSidebar.module.css");
    expect(css).toContain("grid-template-columns:210px");
    expect(sidebar).toContain("position:sticky");
    expect(sidebar).toContain(".mobile");
    expect(css).toContain("reportTrace");
    expect(css).toContain("@media(max-width:620px)");
  });

  it("consolidates the report into eight understandable sections", () => {
    const dossier = read("../ExtensionDossier.tsx");
    for (const section of ["Summary", "What changed", "Evidence", "Capabilities", "Package", "Publisher", "Coverage", "Technical"]) expect(dossier).toContain(section);
    expect(dossier).not.toContain('label: "README"');
  });
});
