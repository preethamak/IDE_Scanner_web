import { describe, expect, it } from "vitest";
import {
  evidenceSectionLabel,
  outcomeGroupSummary,
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
