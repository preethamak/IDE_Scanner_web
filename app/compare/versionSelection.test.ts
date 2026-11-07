import { describe, expect, it } from "vitest";
import { chooseBaselineVersion } from "./versionSelection";

const versions = (...values: string[]) => values.map((version) => ({ version }));

describe("comparison baseline selection", () => {
  it("chooses the closest older release even for a historical target and unsorted input", () => {
    expect(chooseBaselineVersion(versions("1.5.8", "1.5.6", "1.5.7", "1.4.9"), "", "1.5.7")).toBe("1.5.6");
    expect(chooseBaselineVersion(versions("3.0.0", "2.0.0", "1.0.0"), "", "3.0.0")).toBe("2.0.0");
  });
  it("leaves the baseline empty when no earlier release or reliable ordering is available", () => {
    expect(chooseBaselineVersion(versions("1.5.8", "1.5.7"), "", "1.5.7")).toBe("");
    expect(chooseBaselineVersion(versions("latest", "1.5.7", "1.5.6"), "", "1.5.7")).toBe("");
    expect(chooseBaselineVersion(versions("1.5.8", "1.5.6"), "", "1.5.7")).toBe("");
  });
  it("respects an explicitly selected distinct baseline", () => {
    expect(chooseBaselineVersion(versions("1.5.8", "1.5.7", "1.5.6"), "1.5.8", "1.5.7")).toBe("1.5.8");
  });
  it("orders prereleases and large numeric segments using SemVer rules", () => {
    expect(chooseBaselineVersion(versions("1.0.0", "1.0.0-rc.10", "1.0.0-rc.2"), "", "1.0.0")).toBe("1.0.0-rc.10");
    expect(chooseBaselineVersion(versions("90071992547409930.0.0", "90071992547409929.0.0"), "", "90071992547409930.0.0")).toBe("90071992547409929.0.0");
    expect(chooseBaselineVersion(versions("1.0.0-rc.01", "1.0.0"), "", "1.0.0")).toBe("");
  });
});
