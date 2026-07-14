import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ rpc }) }));
import { POST } from "./route";

function request(secret = "runner-secret", body: Record<string, unknown> = { runner_id: "github-actions-1" }) {
  return new Request("http://localhost/api/internal/scan-jobs/claim", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

describe("scan claim endpoint", () => {
  beforeEach(() => { process.env.SCAN_RUNNER_SECRET = "runner-secret"; rpc.mockReset(); });

  it("rejects invalid runner credentials", async () => {
    expect((await POST(request("wrong"))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 204 when the queue is empty", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect((await POST(request())).status).toBe(204);
  });

  it("returns only the claimed artifact contract", async () => {
    rpc.mockResolvedValue({ data: { id: "job-1", extension_id: "publisher.extension", version: "1.2.3" }, error: null });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "job-1", extension_id: "publisher.extension", version: "1.2.3" });
  });
});
