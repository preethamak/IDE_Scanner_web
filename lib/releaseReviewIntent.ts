export type ExactReleaseIntent = {
  extensionId: string;
  version: string;
  scanId: string;
};

/** A partial identity is not an exact-release instruction. Never fill it from latest. */
export function readExactReleaseIntent(search: string): ExactReleaseIntent | null {
  const params = new URLSearchParams(search);
  const extensionId = params.get("extension")?.trim() || "";
  const version = params.get("version")?.trim() || "";
  const scanId = params.get("scanId")?.trim() || "";
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/.test(extensionId) || !version || version.length > 256 || !/^[0-9a-f-]{36}$/i.test(scanId)) return null;
  return { extensionId, version, scanId };
}

export function monitorWorkspaceHref(release: ExactReleaseIntent): string {
  return `/workspace?${new URLSearchParams({ intent: "monitor", extension: release.extensionId, version: release.version, scanId: release.scanId })}`;
}

export function exactReleaseReportHref(release: ExactReleaseIntent): string {
  return `/extensions/${encodeURIComponent(release.extensionId)}/versions/${encodeURIComponent(release.version)}/scans/${encodeURIComponent(release.scanId)}`;
}

export function assertExactWatchBaseline(body: Record<string, unknown>, release: ExactReleaseIntent): void {
  if (body.baseline_version !== release.version || body.baseline_scan_id !== release.scanId) {
    throw new Error("The workspace did not confirm this exact scan as its baseline. Your selected release has been kept; retry or open its report.");
  }
}

export function monitoringStatus(health: { status: string }, watchCount: number): string {
  if (!watchCount) return "Not configured";
  if (health.status === "healthy") return "Current";
  if (health.status === "degraded") return "Needs attention";
  return "Awaiting check";
}
