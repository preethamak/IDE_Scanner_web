import { describe, expect, it } from "vitest";
import { cyclonedxVulnerabilities } from "@/lib/reportBundle";

describe("cyclonedxVulnerabilities", () => {
  it("returns display-safe scanner evidence and ignores malformed entries", () => {
    expect(
      cyclonedxVulnerabilities({
        vulnerabilities: [
          {
            id: "GR-EXEC-001",
            description: "Process execution requires review.",
            ratings: [{ severity: "high" }],
            affects: [{ ref: "pkg:npm/example@1.0.0" }, { ref: 12 }],
          },
          { id: "  " },
          null,
        ],
      }),
    ).toEqual([
      {
        id: "GR-EXEC-001",
        severity: "high",
        description: "Process execution requires review.",
        affectedRefs: ["pkg:npm/example@1.0.0"],
      },
    ]);
  });

  it("treats absent or invalid vulnerability sections as no evidence", () => {
    expect(cyclonedxVulnerabilities({ vulnerabilities: {} })).toEqual([]);
    expect(cyclonedxVulnerabilities(undefined)).toEqual([]);
  });
});
