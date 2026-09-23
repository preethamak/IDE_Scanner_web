import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { chunkedCloudflareScanIds, mergeChunkedCloudflareReports } from "./cloudflare-report-storage.mjs";

function marker(report, count = 2) {
  return JSON.stringify({ chunked: true, chunk_count: count, sha256: createHash("sha256").update(report).digest("hex") });
}

describe("Cloudflare report storage", () => {
  it("rehydrates an exact ordered report", () => {
    const report = JSON.stringify({ metadata: { scanner_build: "build" }, extensions: [] });
    const rows = mergeChunkedCloudflareReports(
      [{ scan_id: "scan-1", report_json: marker(report) }],
      [{ scan_id: "scan-1", chunk_index: 1, content: report.slice(5) }, { scan_id: "scan-1", chunk_index: 0, content: report.slice(0, 5) }],
    );
    expect(rows[0].report_json).toBe(report);
    expect(chunkedCloudflareScanIds(rows)).toEqual([]);
  });

  it("fails closed for missing, non-contiguous, or tampered chunks", () => {
    const report = "0123456789";
    const row = [{ scan_id: "scan-1", report_json: marker(report) }];
    expect(mergeChunkedCloudflareReports(row, [{ scan_id: "scan-1", chunk_index: 0, content: "01234" }])[0].report_json).toBe("");
    expect(mergeChunkedCloudflareReports(row, [
      { scan_id: "scan-1", chunk_index: 0, content: "01234" },
      { scan_id: "scan-1", chunk_index: 2, content: "56789" },
    ])[0].report_json).toBe("");
    expect(mergeChunkedCloudflareReports(row, [
      { scan_id: "scan-1", chunk_index: 0, content: "xxxxx" },
      { scan_id: "scan-1", chunk_index: 1, content: "yyyyy" },
    ])[0].report_json).toBe("");
  });
});
