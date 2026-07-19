import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ rpc }) }));
import { GET, POST } from "./route";

function request(secret?: string, url = "http://localhost/api/cron/reconcile-scans") {
  return new Request(url, { method: "POST", headers: secret ? { Authorization: `Bearer ${secret}` } : {} });
}

describe("reconcile-scans cron endpoint", () => {
  beforeEach(() => { process.env.SCAN_RECONCILE_SECRET = "reconcile-secret"; delete process.env.NOTIFICATION_CRON_SECRET; rpc.mockReset(); });
  afterEach(() => { delete process.env.SCAN_RECONCILE_SECRET; });

  it("rejects a missing bearer secret", async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a wrong bearer secret", async () => {
    expect((await POST(request("nope"))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses when no secret is configured", async () => {
    delete process.env.SCAN_RECONCILE_SECRET;
    expect((await POST(request("anything"))).status).toBe(401);
  });

  it("reconciles and returns the count", async () => {
    rpc.mockResolvedValue({ data: 3, error: null });
    const response = await POST(request("reconcile-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reconciled: 3 });
    expect(rpc).toHaveBeenCalledWith("reconcile_stale_deep_scans", { p_queue_grace_minutes: 20 });
  });

  it("honours a grace_minutes override", async () => {
    rpc.mockResolvedValue({ data: 0, error: null });
    await POST(request("reconcile-secret", "http://localhost/api/cron/reconcile-scans?grace_minutes=45"));
    expect(rpc).toHaveBeenCalledWith("reconcile_stale_deep_scans", { p_queue_grace_minutes: 45 });
  });

  it("surfaces an RPC failure as 500", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const response = await POST(request("reconcile-secret"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "boom" });
  });

  it("falls back to the notification cron secret", async () => {
    delete process.env.SCAN_RECONCILE_SECRET;
    process.env.NOTIFICATION_CRON_SECRET = "shared-secret";
    rpc.mockResolvedValue({ data: 1, error: null });
    expect((await GET(request("shared-secret"))).status).toBe(200);
    delete process.env.NOTIFICATION_CRON_SECRET;
  });
});
