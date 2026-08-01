import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) }) }));
import { getDeepScanHealth } from "./deepScanHealth";

describe("Deep Scan health", () => {
  beforeEach(() => { process.env.SCAN_RUNNER_SECRET = "configured"; process.env.GITHUB_ACTIONS_TOKEN = "configured"; maybeSingle.mockReset(); });

  it("is unavailable without a configured runner", async () => {
    delete process.env.GITHUB_ACTIONS_TOKEN;
    expect(await getDeepScanHealth()).toMatchObject({ accepting_requests: false, status: "configuration_unavailable" });
  });

  it("is available after a recent heartbeat", async () => {
    maybeSingle.mockResolvedValue({ data: { last_seen_at: new Date().toISOString() }, error: null });
    expect(await getDeepScanHealth()).toMatchObject({ accepting_requests: true, status: "ready" });
  });

  it("continues accepting work when the heartbeat is stale", async () => {
    maybeSingle.mockResolvedValue({ data: { last_seen_at: new Date(Date.now() - 13 * 60_000).toISOString() }, error: null });
    expect(await getDeepScanHealth()).toMatchObject({ accepting_requests: true, status: "runner_delayed" });
  });
});
