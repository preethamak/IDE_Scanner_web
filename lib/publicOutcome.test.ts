import { describe, expect, it } from "vitest";
import { normalizePublicOutcome, outcomeMeta } from "@/lib/publicOutcome";

describe("public outcome model", () => {
  it("keeps expected capability separate from investigation", () => {
    expect(outcomeMeta("expected_capability").label).toBe("Allow · expected capability");
    expect(outcomeMeta("investigate").tone).toBe("review");
  });

  it("distinguishes preventive blocks from confirmed threats", () => {
    expect(normalizePublicOutcome("", "block", "suspicious")).toBe("preventive_block");
    expect(normalizePublicOutcome("", "block", "malicious")).toBe("confirmed_threat");
  });
});

describe("explained preventive chain outcome", () => {
  it("renders as review-toned explained chain, distinct from block", () => {
    const meta = outcomeMeta("explained_preventive_chain");
    expect(meta.tone).toBe("review");
    expect(meta.label).toContain("Review");
    expect(normalizePublicOutcome("explained_preventive_chain", "review", "suspicious")).toBe(
      "explained_preventive_chain",
    );
  });
});
