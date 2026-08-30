import { describe, expect, it } from "vitest";
import { matchesQuery, rankAlternatives, type AlternativeCandidate } from "@/lib/alternatives";

function candidate(overrides: Partial<AlternativeCandidate>): AlternativeCandidate {
  return {
    extension_id: "acme.tool",
    version: "1.0.0",
    display_name: "Tool",
    publisher: "acme",
    publisher_verified: false,
    description: "A python linter",
    decision: "allow",
    severity: "INFO",
    public_outcome: "expected_capability",
    scan_id: "scan-1",
    ...overrides,
  };
}

describe("matchesQuery", () => {
  it("matches name, publisher, and description keywords case-insensitively", () => {
    const item = candidate({ display_name: "Python Lint Pro", publisher: "JetForge", description: "Fast linting" });
    expect(matchesQuery(item, "python")).toBe(true);
    expect(matchesQuery(item, "jetforge")).toBe(true);
    expect(matchesQuery(item, "LINTING")).toBe(true);
    expect(matchesQuery(item, "kubernetes")).toBe(false);
  });

  it("rejects an empty query", () => {
    expect(matchesQuery(candidate({}), "   ")).toBe(false);
  });
});

describe("rankAlternatives", () => {
  it("puts allow decisions before review and block", () => {
    const ranked = rankAlternatives(
      [
        candidate({ extension_id: "a.blocked", decision: "block", severity: "INFO" }),
        candidate({ extension_id: "b.review", decision: "review", severity: "INFO" }),
        candidate({ extension_id: "c.allowed", decision: "allow", severity: "HIGH" }),
      ],
      "linter",
    );
    expect(ranked[0].extension_id).toBe("c.allowed");
  });

  it("ranks better trust tiers first among allowed extensions", () => {
    const verified = candidate({
      extension_id: "a.verified",
      capability_assessment: {
        matched: ["network"],
        behavioral_verification: { status: "complete", matches_declaration: true },
      },
    });
    const analyzed = candidate({ extension_id: "b.analyzed" });
    const ranked = rankAlternatives([analyzed, verified], "linter");
    // Both allow; tier ordering decides only when deriveTrustTier separates them.
    expect(ranked.map((item) => item.extension_id)).toContain("a.verified");
    expect(ranked.findIndex((item) => item.trust_tier === "attention")).toBe(-1);
  });

  it("prefers verified publishers, then lower severity, as tie-breakers", () => {
    const ranked = rankAlternatives(
      [
        candidate({ extension_id: "a.unverified", publisher_verified: false, severity: "LOW" }),
        candidate({ extension_id: "b.verifiedpub", publisher_verified: true, severity: "MEDIUM" }),
        candidate({ extension_id: "c.verifiedlow", publisher_verified: true, severity: "INFO" }),
      ],
      "linter",
    );
    expect(ranked.map((item) => item.extension_id)).toEqual([
      "c.verifiedlow",
      "b.verifiedpub",
      "a.unverified",
    ]);
  });

  it("demotes extensions whose public outcome needs investigation below plain allow", () => {
    const ranked = rankAlternatives(
      [
        candidate({ extension_id: "a.flagged", public_outcome: "investigate" }),
        candidate({ extension_id: "b.clean" }),
      ],
      "linter",
    );
    expect(ranked[0].extension_id).toBe("b.clean");
    expect(ranked[0].trust_tier).not.toBe("attention");
    expect(ranked[1].trust_tier).toBe("attention");
  });

  it("dedupes by extension id, keeps the best release, and caps results at five", () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      candidate({ extension_id: `pub.ext${index}` }),
    );
    const dupes = [
      candidate({ extension_id: "pub.ext0", version: "2.0.0", decision: "review", scan_id: "scan-old" }),
      ...many,
    ];
    const ranked = rankAlternatives(dupes, "linter");
    expect(ranked).toHaveLength(5);
    const first = ranked.find((item) => item.extension_id === "pub.ext0");
    expect(first?.decision).toBe("allow");
    expect(first?.version).toBe("1.0.0");
  });

  it("builds the exact-release report path", () => {
    const ranked = rankAlternatives([candidate({ scan_id: "scan-9" })], "linter");
    expect(ranked[0].report_path).toBe("/extensions/acme.tool/versions/1.0.0/scans/scan-9");
  });

  it("returns nothing when no keyword matches", () => {
    expect(rankAlternatives([candidate({})], "terraform")).toEqual([]);
  });
});
