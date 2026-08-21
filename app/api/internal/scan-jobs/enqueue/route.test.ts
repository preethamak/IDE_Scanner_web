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
  const scannerBuild = "a".repeat(40);
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
    expect((await POST(request("runner-secret", [{ extension_id: "dbaeumer.vscode-eslint", version: "3.0.33", scan_purpose: "benchmark", scanner_build: scannerBuild, target_platform: "linux-x64&redirect=1" }]))).status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("only permits hash-frozen artifacts in the benchmark queue", async () => {
    const response = await POST(request("runner-secret", [{ extension_id: "dbaeumer.vscode-eslint", version: "0.0.1", scan_purpose: "benchmark", scanner_build: scannerBuild }]));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Benchmark artifact is not frozen: dbaeumer.vscode-eslint@0.0.1" });
    expect(from).not.toHaveBeenCalled();
  });

  it("rebinds an unstarted job to the workflow build that will claim it", async () => {
    const update = vi.fn();
    const versionUpsert = vi.fn(async () => ({ error: null }));
    from.mockImplementation((table: string) => {
      if (table === "extensions") return { select: () => ({ or: async () => ({ data: [{ id: "Publisher.Extension" }], error: null }) }) };
      if (table === "extension_versions") return { upsert: versionUpsert };
      if (table === "scan_jobs") {
        if (!update.mock.calls.length) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    in: () => ({
                      maybeSingle: async () => ({
                        data: { id: "job-1", extension_id: "Publisher.Extension", version: "1.2.3", scan_purpose: "user_request", status: "queued", expected_scanner_build: null, target_platform: "" },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
            update,
          };
        }
      }
      throw new Error(`Unexpected table access: ${table}`);
    });
    update.mockReturnValue({
      eq: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: async () => ({ data: { id: "job-1", extension_id: "Publisher.Extension", version: "1.2.3", scan_purpose: "public_intelligence" }, error: null }),
          }),
        }),
      }),
    });

    const response = await POST(request("runner-secret", [{
      extension_id: "publisher.extension",
      version: "1.2.3",
      scan_purpose: "public_intelligence",
      scanner_build: scannerBuild,
      target_platform: "darwin-x64",
    }]));

    expect(response.status).toBe(200);
    expect(versionUpsert).toHaveBeenCalledWith([
      expect.objectContaining({ extension_id: "Publisher.Extension", version: "1.2.3" }),
    ], { onConflict: "extension_id,version" });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ expected_scanner_build: scannerBuild, claim_protocol: 2, scan_purpose: "public_intelligence", target_platform: "darwin-x64" }));
  });

  it("does not rebind a job that is already running under another build", async () => {
    from.mockImplementation((table: string) => {
      if (table === "extensions") return { select: () => ({ or: async () => ({ data: [{ id: "publisher.extension" }], error: null }) }) };
      if (table === "extension_versions") return { upsert: async () => ({ error: null }) };
      if (table === "scan_jobs") return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({
                  maybeSingle: async () => ({
                    data: { id: "job-1", extension_id: "publisher.extension", version: "1.2.3", scan_purpose: "user_request", status: "running", expected_scanner_build: "b".repeat(40) },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };
      throw new Error(`Unexpected table access: ${table}`);
    });

    const response = await POST(request("runner-secret", [{
      extension_id: "publisher.extension",
      version: "1.2.3",
      scan_purpose: "public_intelligence",
      scanner_build: scannerBuild,
    }]));

    expect(response.status).toBe(409);
  });
});
