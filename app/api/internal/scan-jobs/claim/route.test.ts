import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ rpc }) }));
import { POST } from "./route";

const githubSha = "a".repeat(40);
function request(secret = "runner-secret", body: Record<string, unknown> = { runner_id: "github-actions-1", github_sha: githubSha }) {
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
    rpc.mockResolvedValue({ data: { id: "job-1", extension_id: "publisher.extension", version: "1.2.3", target_platform: "darwin-x64", expected_scanner_build: githubSha }, error: null });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "job-1", extension_id: "publisher.extension", version: "1.2.3", target_platform: "darwin-x64" });
    expect(rpc).toHaveBeenCalledWith("claim_deep_scan_job", { p_runner_id: "github-actions-1", p_scanner_build: githubSha, p_job_id: null, p_github_run_id: null });
  });

  it("claims an explicitly dispatched job and records its GitHub run", async () => {
    rpc.mockResolvedValue({ data: { id: "550e8400-e29b-41d4-a716-446655440000", extension_id: "publisher.extension", version: "1.2.3", expected_scanner_build: githubSha }, error: null });
    const response = await POST(request("runner-secret", { runner_id: "github-actions-42", job_id: "550e8400-e29b-41d4-a716-446655440000", github_run_id: "42", github_sha: githubSha }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("claim_deep_scan_job", { p_runner_id: "github-actions-42", p_scanner_build: githubSha, p_job_id: "550e8400-e29b-41d4-a716-446655440000", p_github_run_id: 42 });
  });

  it("rejects a worker whose build differs from the job binding", async () => {
    rpc.mockResolvedValue({ data: { id: "job-1", extension_id: "publisher.extension", version: "1.2.3", expected_scanner_build: "b".repeat(40) }, error: null });
    expect((await POST(request())).status).toBe(409);
  });

  it("rejects malformed job and run identities", async () => {
    expect((await POST(request("runner-secret", { runner_id: "github-actions", job_id: "not-a-uuid", github_sha: githubSha }))).status).toBe(400);
    expect((await POST(request("runner-secret", { runner_id: "github-actions", github_run_id: -1, github_sha: githubSha }))).status).toBe(400);
    expect((await POST(request("runner-secret", { runner_id: "github-actions", github_sha: "self-asserted" }))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
