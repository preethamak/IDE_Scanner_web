import { createHmac } from "node:crypto";
import { gzipSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, ingestScanBundle, incompleteArtifactReason } = vi.hoisted(() => ({
  rpc: vi.fn(),
  ingestScanBundle: vi.fn(),
  incompleteArtifactReason: vi.fn(),
}));

vi.mock("@/lib/scanIngest", () => ({
  ingestScanBundle,
  incompleteArtifactReason,
}));

vi.mock("@/lib/supabase", () => ({
  serviceDb: () => ({
    from: (table: string) => {
      if (table !== "scan_jobs") throw new Error(`Unexpected table ${table}`);
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          data: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            extension_id: "publisher.extension",
            version: "1.2.3",
          },
          error: null,
        }),
      };
      return query;
    },
    rpc,
  }),
}));

import { POST } from "./route";

const secret = "callback-secret";
const jobId = "550e8400-e29b-41d4-a716-446655440000";

function request(
  payload: unknown,
  options: { encoding?: string; signed?: boolean; raw?: Buffer; contentLength?: number } = {},
): Request {
  const body = options.raw || Buffer.from(JSON.stringify(payload));
  const headers = new Headers({
    "Content-Type": "application/json",
    "x-ide-scanner-signature": options.signed === false
      ? "invalid"
      : createHmac("sha256", secret).update(body).digest("hex"),
  });
  if (options.encoding) headers.set("content-encoding", options.encoding);
  if (options.contentLength !== undefined) headers.set("content-length", String(options.contentLength));
  return new Request("http://localhost/api/internal/scan-results", {
    method: "POST",
    headers,
    body: Uint8Array.from(body).buffer,
  });
}

describe("signed scan result callback", () => {
  beforeEach(() => {
    process.env.SCAN_CALLBACK_SECRET = secret;
    rpc.mockReset();
    ingestScanBundle.mockReset();
    incompleteArtifactReason.mockReset();
    incompleteArtifactReason.mockReturnValue(null);
    rpc.mockImplementation(async (name: string) => {
      if (name === "begin_scan_callback") return { data: "750e8400-e29b-41d4-a716-446655440000", error: null };
      if (name === "finish_scan_callback") return { data: "failed", error: null };
      throw new Error(`Unexpected RPC ${name}`);
    });
  });

  it("authenticates the exact compressed bytes before decoding", async () => {
    const raw = gzipSync(Buffer.from(JSON.stringify({ job_id: jobId, error: "worker stopped" })));
    const response = await POST(request(null, { encoding: "gzip", raw }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenNthCalledWith(1, "begin_scan_callback", expect.objectContaining({ p_job_id: jobId }));
    expect(rpc).toHaveBeenNthCalledWith(2, "finish_scan_callback", expect.objectContaining({
      p_result: "worker_failed",
      p_error: "worker stopped",
    }));
  });

  it("rejects unsigned, oversized, and unsupported payloads before database writes", async () => {
    expect((await POST(request({ job_id: jobId }, { signed: false }))).status).toBe(401);
    expect((await POST(request({ job_id: jobId }, { contentLength: 10 * 1024 * 1024 + 1 }))).status).toBe(413);
    expect((await POST(request({ job_id: jobId }, { encoding: "br" }))).status).toBe(415);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed worker fields before recording a receipt", async () => {
    expect((await POST(request(null))).status).toBe(400);
    expect((await POST(request(null, { raw: Buffer.from("{") }))).status).toBe(400);
    expect((await POST(request({ job_id: jobId, error: { message: "no" } }))).status).toBe(400);
    expect((await POST(request({ job_id: jobId }))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("finalizes artifact acquisition failure in one database transaction", async () => {
    incompleteArtifactReason.mockReturnValue("Artifact download exceeded its limit.");
    const response = await POST(request({ job_id: jobId, bundle: { extensions: [{}] } }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenNthCalledWith(2, "finish_scan_callback", {
      p_job_id: jobId,
      p_receipt_id: "750e8400-e29b-41d4-a716-446655440000",
      p_result: "artifact_incomplete",
      p_error: "Artifact download exceeded its limit.",
    });
    expect(ingestScanBundle).not.toHaveBeenCalled();
  });

  it("binds successful publication to the callback receipt", async () => {
    const bundle = { extensions: [{ extension_id: "publisher.extension" }] };
    ingestScanBundle.mockResolvedValue("scan-1");
    const response = await POST(request({ job_id: jobId, bundle }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ scan_id: "scan-1" });
    expect(ingestScanBundle).toHaveBeenCalledWith(jobId, bundle, "750e8400-e29b-41d4-a716-446655440000");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("keeps transient storage failures retryable without terminalizing the job", async () => {
    ingestScanBundle.mockRejectedValue(new TypeError("fetch failed"));
    const response = await POST(request({ job_id: jobId, bundle: { extensions: [{}] } }));
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("2");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("retries a transient Postgres statement timeout without terminalizing the job", async () => {
    ingestScanBundle.mockRejectedValue({
      code: "57014",
      message: "canceling statement due to statement timeout",
    });
    const response = await POST(request({ job_id: jobId, bundle: { extensions: [{}] } }));
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("2");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("atomically records a permanent ingestion rejection", async () => {
    ingestScanBundle.mockRejectedValue(new Error("canonical identity mismatch"));
    const response = await POST(request({ job_id: jobId, bundle: { extensions: [{}] } }));
    expect(response.status).toBe(422);
    expect(rpc).toHaveBeenNthCalledWith(2, "finish_scan_callback", {
      p_job_id: jobId,
      p_receipt_id: "750e8400-e29b-41d4-a716-446655440000",
      p_result: "callback_rejected",
      p_error: "canonical identity mismatch",
    });
  });
});
