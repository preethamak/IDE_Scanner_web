import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) }) }));
import { getDeepScanHealth } from "./deepScanHealth";

describe("Deep Scan health", () => {
  beforeEach(() => { process.env.SCAN_RUNNER_SECRET = "configured"; maybeSingle.mockReset(); });

  it("is unavailable without a configured runner", async () => {
    delete process.env.SCAN_RUNNER_SECRET;
    expect(await getDeepScanHealth()).toMatchObject({ available: false, status: "unconfigured" });
  });

  it("is available after a recent heartbeat", async () => {
    maybeSingle.mockResolvedValue({ data: { last_seen_at: new Date().toISOString() }, error: null });
    expect(await getDeepScanHealth()).toMatchObject({ available: true, status: "available" });
  });

  it("is degraded when the heartbeat is stale", async () => {
    maybeSingle.mockResolvedValue({ data: { last_seen_at: new Date(Date.now() - 13 * 60_000).toISOString() }, error: null });
    expect(await getDeepScanHealth()).toMatchObject({ available: false, status: "degraded" });
  });
});
