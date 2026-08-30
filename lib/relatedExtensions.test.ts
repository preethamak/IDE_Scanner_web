import { describe, expect, it } from "vitest";
import {
  rankRelatedExtensions,
  safetyRank,
  tokenizeForMatch,
  type RelatedCandidate,
  type RelatedCurrent,
} from "./relatedExtensions";

const current: RelatedCurrent = {
  extension_id: "acme.python-lint",
  display_name: "Python Linter",
  description: "Fast linting for Python projects",
  publisher: "acme",
  decision: "review",
  severity: "MEDIUM",
};

function candidate(overrides: Partial<RelatedCandidate>): RelatedCandidate {
  return {
    extension_id: "other.ext",
    display_name: "Python Helper",
    publisher: "other",
    publisher_verified: false,
    description: "Linting utilities for Python",
    icon_url: "",
    decision: "allow",
    severity: "INFO",
    ...overrides,
  };
}

describe("tokenizeForMatch", () => {
  it("lowercases, drops short words and stopwords", () => {
    const tokens = tokenizeForMatch("The Python Extension for VS Code linting");
    expect(tokens.has("python")).toBe(true);
    expect(tokens.has("linting")).toBe(true);
    expect(tokens.has("the")).toBe(false);
    expect(tokens.has("extension")).toBe(false);
    expect(tokens.has("vs")).toBe(false);
  });
});

describe("safetyRank", () => {
  it("orders allow < review < block and uses severity as tiebreaker", () => {
    expect(safetyRank("allow", "INFO")).toBeLessThan(safetyRank("review", "INFO"));
    expect(safetyRank("review", "LOW")).toBeLessThan(safetyRank("review", "HIGH"));
    expect(safetyRank("review", "CRITICAL")).toBeLessThan(safetyRank("block", "INFO"));
  });
});

describe("rankRelatedExtensions", () => {
  it("excludes the current extension itself", () => {
    const result = rankRelatedExtensions(current, [
      candidate({ extension_id: "ACME.Python-Lint" }),
    ]);
    expect(result).toEqual([]);
  });

  it("excludes candidates with no keyword overlap", () => {
    const result = rankRelatedExtensions(current, [
      candidate({ display_name: "Docker Manager", description: "Manage containers" }),
    ]);
    expect(result).toEqual([]);
  });

  it("excludes candidates less safe than the current extension", () => {
    const result = rankRelatedExtensions(current, [
      candidate({ extension_id: "bad.python", decision: "block", severity: "CRITICAL" }),
      candidate({ extension_id: "worse.python", decision: "review", severity: "HIGH" }),
    ]);
    expect(result).toEqual([]);
  });

  it("keeps equal-safety candidates and prefers allow + verified + lower severity", () => {
    const equal = candidate({ extension_id: "eq.python", decision: "review", severity: "MEDIUM" });
    const verifiedAllow = candidate({ extension_id: "ver.python", publisher_verified: true });
    const plainAllow = candidate({ extension_id: "plain.python" });
    const result = rankRelatedExtensions(current, [equal, plainAllow, verifiedAllow]);
    expect(result.map((item) => item.extension_id)).toEqual([
      "ver.python",
      "plain.python",
      "eq.python",
    ]);
  });

  it("ranks stronger keyword overlap higher", () => {
    const one = candidate({ extension_id: "one.match", display_name: "Python Tools", description: "General utilities" });
    const two = candidate({ extension_id: "two.match", display_name: "Python Linter Pro", description: "Linting projects" });
    const result = rankRelatedExtensions(current, [one, two]);
    expect(result[0].extension_id).toBe("two.match");
  });

  it("dedupes multiple releases of the same extension", () => {
    const result = rankRelatedExtensions(current, [
      candidate({ extension_id: "dup.python" }),
      candidate({ extension_id: "dup.python", severity: "LOW" }),
    ]);
    expect(result).toHaveLength(1);
  });

  it("caps results at the limit (default 4)", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      candidate({ extension_id: `alt${i}.python` }),
    );
    expect(rankRelatedExtensions(current, many)).toHaveLength(4);
  });

  it("treats an unscanned current extension as least safe, so allow candidates qualify", () => {
    const unscanned = { ...current, decision: "not-scanned", severity: undefined };
    const result = rankRelatedExtensions(unscanned, [candidate({})]);
    expect(result).toHaveLength(1);
  });
});
