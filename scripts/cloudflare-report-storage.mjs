import { createHash } from "node:crypto";

/** Rehydrate D1 report rows whose JSON body was split into ordered chunks. */
export function mergeChunkedCloudflareReports(rows, chunks) {
  const byScanId = new Map();
  for (const chunk of chunks) {
    const scanId = String(chunk?.scan_id || "");
    if (!scanId) continue;
    const entries = byScanId.get(scanId) || [];
    entries.push({ index: Number(chunk?.chunk_index), content: String(chunk?.content || "") });
    byScanId.set(scanId, entries);
  }

  return rows.map((row) => {
    const marker = chunkMarker(row?.report_json);
    if (!marker) return row;
    const scanId = String(row?.scan_id || "");
    const entries = (byScanId.get(scanId) || []).sort((left, right) => left.index - right.index);
    const contiguous = entries.every((entry, index) => entry.index === index);
    if (!contiguous || entries.length !== marker.chunk_count) return { ...row, report_json: "" };
    const reportJson = entries.map((entry) => entry.content).join("");
    if (createHash("sha256").update(reportJson).digest("hex") !== marker.sha256) return { ...row, report_json: "" };
    return { ...row, report_json: reportJson };
  });
}

export function chunkedCloudflareScanIds(rows) {
  return rows
    .filter((row) => Boolean(chunkMarker(row?.report_json)))
    .map((row) => String(row?.scan_id || ""))
    .filter(Boolean);
}

function chunkMarker(value) {
  try {
    const parsed = JSON.parse(String(value || ""));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.chunked !== true) return null;
    const chunkCount = Number(parsed.chunk_count);
    const sha256 = String(parsed.sha256 || "").toLowerCase();
    if (!Number.isInteger(chunkCount) || chunkCount < 1 || !/^[0-9a-f]{64}$/.test(sha256)) return null;
    return { chunk_count: chunkCount, sha256 };
  } catch {
    return null;
  }
}
