import { beforeEach, describe, expect, it, vi } from "vitest";

const { queueDeepScan } = vi.hoisted(() => ({ queueDeepScan: vi.fn() }));
vi.mock("@/lib/deepScan", () => ({ queueDeepScan }));
vi.mock("@/lib/supabaseServer", () => ({
  serverDb: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) } }),
}));
vi.mock("@/lib/supabase", () => ({ serviceDb: vi.fn() }));

import { POST } from "./route";

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/deep-scans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Deep Scan request endpoint", () => {
  beforeEach(() => queueDeepScan.mockReset());

  it("requests a real rescan only when force is explicitly true", async () => {
    queueDeepScan.mockResolvedValue({ id: "job-1", status: "queued" });

    expect((await POST(request({ extension_id: "publisher.extension", version: "1.2.3", force: true }))).status).toBe(202);
    expect(queueDeepScan).toHaveBeenCalledWith("publisher.extension", "1.2.3", expect.any(Request), "user-1", true);

    await POST(request({ extension_id: "publisher.extension", version: "1.2.3", force: "true" }));
    expect(queueDeepScan).toHaveBeenLastCalledWith("publisher.extension", "1.2.3", expect.any(Request), "user-1", false);
  });
});
