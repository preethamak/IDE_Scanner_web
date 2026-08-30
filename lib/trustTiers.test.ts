import { describe, expect, it } from "vitest";
import { deriveTrustTier, trustBadgeText } from "./trustTiers";

describe("deriveTrustTier", () => {
  it("never presents a release without a completed analysis as clean", () => {
    expect(deriveTrustTier({ found: false }).tier).toBe("unanalyzed");
    expect(deriveTrustTier({ decision: null }).tier).toBe("unanalyzed");
    expect(
      deriveTrustTier({ decision: "allow", analysis_status: "incomplete" })
        .tier,
    ).toBe("unanalyzed");
  });

  it("separates confirmed risk from a release that needs a human decision", () => {
    expect(deriveTrustTier({ decision: "block" }).tier).toBe("confirmed_risk");
    expect(deriveTrustTier({ decision: "review" }).tier).toBe("attention");
  });

  it("only reports no findings when evidence coverage is high", () => {
    const covered = deriveTrustTier({
      decision: "allow",
      analysis_status: "complete",
      coverage_percent: 92,
    });
    expect(covered.tier).toBe("verified");
    expect(covered.label).toBe("no findings");
    expect(
      deriveTrustTier({
        decision: "allow",
        analysis_status: "complete",
        coverage_percent: 41,
      }).tier,
    ).toBe("analyzed");
  });

  it("does not claim safety in any label", () => {
    for (const decision of ["allow", "review", "block"] as const) {
      const label = deriveTrustTier({
        decision,
        analysis_status: "complete",
        coverage_percent: 100,
      }).label;
      expect(label).not.toMatch(/safe|secure|guarantee/i);
    }
  });
});

describe("trustBadgeText", () => {
  it("pins the badge to the analyzed version", () => {
    const info = deriveTrustTier({
      decision: "allow",
      analysis_status: "complete",
      coverage_percent: 95,
    });
    expect(trustBadgeText(info, "1.4.2")).toBe("no findings 1.4.2");
  });

  it("omits a version when nothing was analyzed", () => {
    expect(trustBadgeText(deriveTrustTier({ found: false }), "1.0.0")).toBe(
      "analysis pending",
    );
  });
});
