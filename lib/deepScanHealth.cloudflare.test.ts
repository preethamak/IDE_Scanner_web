import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  first: vi.fn(),
  prepare: vi.fn(),
}));

vi.mock("@/lib/cloudflareDeepScan", () => ({ cloudflarePrivateAvailable: () => true }));
vi.mock("@/lib/cloudflarePrivate", () => ({ privateDb: () => ({ prepare: mocks.prepare }) }));
vi.mock("@/lib/runtimeEnv", () => ({ runtimeEnv: (name: string) => name === "GITHUB_ACTIONS_TOKEN" ? "configured" : "" }));

import { getDeepScanHealth } from "@/lib/deepScanHealth";

describe("Cloudflare Deep Scan health", () => {
  afterEach(() => vi.clearAllMocks());

  it("treats an empty queue as a healthy idle state", async () => {
    const heartbeat = new Date().toISOString();
    mocks.prepare.mockImplementation(() => ({
      bind: () => ({
        first: () => Promise.resolve({ last_seen_at: heartbeat }),
      }),
      first: () => Promise.resolve(null),
    }));
    await expect(getDeepScanHealth()).resolves.toEqual({ accepting_requests: true, status: "ready", last_seen_at: heartbeat });
    expect(mocks.prepare).toHaveBeenCalledWith("SELECT last_seen_at FROM app_scan_runner_status WHERE id=? LIMIT 1");
  });
});
