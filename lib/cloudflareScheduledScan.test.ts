import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ dispatch: vi.fn() }));
vi.mock("./cloudflareGithubDispatch", () => ({ dispatchGithubDeepScan: mocks.dispatch }));

import { dispatchQueuedCloudflareScan } from "./cloudflareScheduledScan";

const queuedJob = {
  id: "candidate-550e8400-e29b-41d4-a716-446655440000",
  dispatch_count: 0,
  updated_at: "2026-09-29T14:00:00.000Z",
};

function database(reservation: Promise<unknown>) {
  const prepare = vi.fn(() => ({
    first: vi.fn().mockResolvedValue(queuedJob),
    bind: vi.fn(() => ({ run: vi.fn(() => reservation) })),
  }));
  return { prepare } as never;
}

describe("Cloudflare scheduled scan dispatch", () => {
  beforeEach(() => mocks.dispatch.mockReset());

  it("does not launch workers when D1 cannot reserve the queued job", async () => {
    const db = database(Promise.reject(new Error("D1 daily row-read limit")));
    await expect(dispatchQueuedCloudflareScan({ GITHUB_ACTIONS_TOKEN: "token" }, db, new Date("2026-09-29T14:20:00.000Z"))).rejects.toThrow("D1 daily row-read limit");
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it("does not launch a duplicate when the optimistic reservation loses", async () => {
    const db = database(Promise.resolve({ meta: { changes: 0 } }));
    await expect(dispatchQueuedCloudflareScan({ GITHUB_ACTIONS_TOKEN: "token" }, db, new Date("2026-09-29T14:20:00.000Z"))).resolves.toMatchObject({ dispatched: false, reason: "recently_dispatched" });
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});
