import { afterEach, describe, expect, it, vi } from "vitest";
import { onlyMissingSamples, verifyLaunchHealth } from "./verify-launch-health.mjs";

const missingScan = "Scan failure rate is unavailable or invalid.";
const missingDelivery = "Notification failure rate is unavailable or invalid.";
const idle = { healthy: false, reasons: [missingScan, missingDelivery], scan_failure_rate: null, notification_failure_rate: null };

describe("protected health checks", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("permits only genuinely missing samples for deployment, without claiming launch verification", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 503, ok: false, json: async () => idle }));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await verifyLaunchHealth("https://example.test", "secret", { allowMissingSamples: true })).toEqual({ verified: false, reason: "missing_samples" });
    expect(warning).toHaveBeenCalledOnce();
    await expect(verifyLaunchHealth("https://example.test", "secret")).rejects.toThrow("Production health failed");
  });

  it.each([
    { ...idle, reasons: [...idle.reasons, "Deep Scan runner is runner_delayed."] },
    { ...idle, reasons: [missingScan], notification_failure_rate: 0.2 },
    { ...idle, reasons: [missingScan], notification_failure_rate: undefined },
    { ...idle, reasons: [missingScan], scan_failure_rate: 0 },
    { ...idle, reasons: [] },
  ])("rejects other failures or malformed responses: %j", (body) => {
    expect(onlyMissingSamples(503, body)).toBe(false);
  });

  it("rejects unauthorized responses even if the body claims samples are missing", () => {
    expect(onlyMissingSamples(401, idle)).toBe(false);
  });

  it("verifies a genuinely healthy protected response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ healthy: true, reasons: [] }) }));
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await verifyLaunchHealth("https://example.test", "secret")).toEqual({ verified: true });
  });
});
