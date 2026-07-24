import { describe, expect, it } from "vitest";
import { isTransientScanCallbackError } from "@/lib/scanCallbackError";

describe("scan callback error classification", () => {
  it("recognizes transient service failures", () => {
    expect(isTransientScanCallbackError({ status: 503, message: "Service unavailable" })).toBe(true);
    expect(isTransientScanCallbackError({
      message: "<html>gateway.supabase.co | 520: Web server is returning an unknown error</html>",
    })).toBe(true);
    expect(isTransientScanCallbackError(new TypeError("fetch failed"))).toBe(true);
  });

  it("does not retry invalid reports or database constraints", () => {
    expect(isTransientScanCallbackError(new Error("bundle is required for a completed scan."))).toBe(false);
    expect(isTransientScanCallbackError({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe(false);
    expect(isTransientScanCallbackError({ status: 422, message: "Artifact hash does not match the claimed release." })).toBe(false);
  });
});
