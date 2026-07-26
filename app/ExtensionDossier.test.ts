import { describe, expect, it } from "vitest";
import {
  evidenceSectionLabel,
  outcomeGroupSummary,
  selectPackagedReadme,
} from "@/app/ExtensionDossier";

describe("outcome-specific evidence copy", () => {
  it("does not describe a block as approval review", () => {
    expect(outcomeGroupSummary("block", 2)).toBe(
      "2 evidence groups support this do-not-install decision.",
    );
    expect(evidenceSectionLabel("block")).toBe(
      "Evidence supporting this decision",
    );
  });

  it("keeps review and incomplete evidence semantics distinct", () => {
    expect(outcomeGroupSummary("review", 1)).toBe(
      "1 behavior group needs context before approval.",
    );
    expect(evidenceSectionLabel("incomplete")).toBe(
      "Evidence collected before completion",
    );
  });
});

describe("packaged README selection", () => {
  it("prefers the root text README over nested icon and dependency files", () => {
    expect(
      selectPackagedReadme([
        { path: "assets/icons/readme.svg", preview_available: false },
        { path: "node_modules/example/README.md", preview_available: true },
        { path: "readme.md", preview_available: true },
      ]),
    ).toMatchObject({ path: "readme.md", preview_available: true });
  });
});
