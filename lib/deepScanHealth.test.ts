import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ maybeSingle: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from }) }));
import { getDeepScanHealth } from "@/lib/deepScanHealth";

describe("Deep Scan health", () => {
  const priorRunner = process.env.SCAN_RUNNER_SECRET; const priorToken = process.env.GITHUB_ACTIONS_TOKEN;
  afterEach(() => { if (priorRunner === undefined) delete process.env.SCAN_RUNNER_SECRET; else process.env.SCAN_RUNNER_SECRET = priorRunner; if (priorToken === undefined) delete process.env.GITHUB_ACTIONS_TOKEN; else process.env.GITHUB_ACTIONS_TOKEN = priorToken; vi.clearAllMocks(); });
  it("refuses requests when required server configuration is absent", async () => { delete process.env.SCAN_RUNNER_SECRET; delete process.env.GITHUB_ACTIONS_TOKEN; await expect(getDeepScanHealth()).resolves.toMatchObject({ accepting_requests: false, status: "configuration_unavailable" }); });
  it("accepts requests but reports a delayed runner without a heartbeat", async () => { process.env.SCAN_RUNNER_SECRET = "test"; process.env.GITHUB_ACTIONS_TOKEN = "test"; mocks.maybeSingle.mockResolvedValue({ data: null, error: null }); mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }); await expect(getDeepScanHealth()).resolves.toMatchObject({ accepting_requests: true, status: "runner_delayed" }); });
  it("reports a recent heartbeat as ready", async () => { process.env.SCAN_RUNNER_SECRET = "test"; process.env.GITHUB_ACTIONS_TOKEN = "test"; mocks.maybeSingle.mockResolvedValue({ data: { last_seen_at: new Date().toISOString() }, error: null }); mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }); await expect(getDeepScanHealth()).resolves.toMatchObject({ accepting_requests: true, status: "ready" }); });
});
