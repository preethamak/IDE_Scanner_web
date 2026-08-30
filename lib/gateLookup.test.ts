import { describe, expect, it } from "vitest";
import { formatGateResult, isValidGateCheck } from "./gateLookup";

describe("isValidGateCheck", () => {
  it("accepts a well-formed publisher.name and semver-ish version", () => {
    expect(isValidGateCheck({ extension: "ms-python.python", version: "2026.8.1" })).toBe(true);
  });

  it("rejects an extension id without a publisher segment", () => {
    expect(isValidGateCheck({ extension: "python", version: "1.0.0" })).toBe(false);
  });

  it("rejects an empty version", () => {
    expect(isValidGateCheck({ extension: "ms-python.python", version: "" })).toBe(false);
  });
});

describe("formatGateResult", () => {
  const check = { extension: "publisher.name", version: "1.2.3" };

  it("returns unreviewed, not fail, when no scan exists and fail-on-unreviewed is off", () => {
    const result = formatGateResult(check, null, false);
    expect(result.verdict).toBe("unreviewed");
    expect(result.decision).toBeNull();
  });

  it("returns fail when no scan exists and fail-on-unreviewed is on", () => {
    const result = formatGateResult(check, null, true);
    expect(result.verdict).toBe("fail");
  });

  it("passes an allow decision", () => {
    const result = formatGateResult(check, { id: "s1", decision: "allow", extension_id: "publisher.name", version: "1.2.3" }, false);
    expect(result.verdict).toBe("pass");
    expect(result.report).toContain("/extensions/publisher.name/versions/1.2.3/scans/s1");
  });

  it("fails a block decision even when fail-on-unreviewed is off", () => {
    const result = formatGateResult(check, { id: "s1", decision: "block", extension_id: "publisher.name", version: "1.2.3" }, false);
    expect(result.verdict).toBe("fail");
  });

  it("fails a review decision", () => {
    const result = formatGateResult(check, { id: "s1", decision: "review", extension_id: "publisher.name", version: "1.2.3" }, false);
    expect(result.verdict).toBe("fail");
  });
});
