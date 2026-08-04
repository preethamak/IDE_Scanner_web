/** A watched release must not be starved by the public catalog batch cap. */
export function canQueueCatalogScan(input: { queued: number; limit: number; monitoredRelease: boolean }): boolean {
  return input.monitoredRelease || input.queued < input.limit;
}

/** A release comparison is decision-ready only with complete, full evidence. */
export function targetComparisonReady(scan: { analysis_status?: unknown; coverage_percent?: unknown; artifact_sha256?: unknown }): boolean {
  return scan.analysis_status === "complete" && Number(scan.coverage_percent) >= 100 && typeof scan.artifact_sha256 === "string" && /^[0-9a-f]{64}$/i.test(scan.artifact_sha256);
}
