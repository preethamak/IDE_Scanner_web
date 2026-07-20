import { beforeEach, describe, expect, it, vi } from "vitest";

const from = vi.fn();
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from }) }));
import { POST } from "./route";

function request(secret: string, jobs: unknown[]) {
  return new Request("http://localhost/api/internal/scan-jobs/enqueue", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ jobs }),
  });
}

describe("canonical scan enqueue endpoint", () => {
  beforeEach(() => {
    process.env.SCAN_RUNNER_SECRET = "runner-secret";
    from.mockReset();
  });

  it("rejects invalid runner credentials before touching the database", async () => {
    const response = await POST(request("wrong", [{ extension_id: "dbaeumer.vscode-eslint", version: "3.0.33", scan_purpose: "benchmark" }]));
    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects non-canonical purposes and malformed identities", async () => {
    expect((await POST(request("runner-secret", [{ extension_id: "not-an-id", version: "3.0.33", scan_purpose: "user_request" }]))).status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("only permits hash-frozen artifacts in the benchmark queue", async () => {
    const response = await POST(request("runner-secret", [{ extension_id: "dbaeumer.vscode-eslint", version: "0.0.1", scan_purpose: "benchmark" }]));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Benchmark artifact is not frozen: dbaeumer.vscode-eslint@0.0.1" });
    expect(from).not.toHaveBeenCalled();
  });
});
