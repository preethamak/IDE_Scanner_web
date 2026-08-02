export type ExtensionPageScan = Record<string, unknown> | null | undefined;

export type ExtensionPageModel = {
  extensionId: string;
  version: string;
  hasPublicReport: boolean;
  reportHref: string;
  decision: "allow" | "review" | "block" | "incomplete" | "not-scanned";
};

export function extensionPageModel(extensionId: string, version: string, scan: ExtensionPageScan): ExtensionPageModel {
  const id = encodeURIComponent(extensionId);
  const release = encodeURIComponent(version);
  const scanId = scan?.id ? String(scan.id) : "";
  return {
    extensionId,
    version,
    hasPublicReport: Boolean(scanId),
    reportHref: scanId ? `/extensions/${id}/versions/${release}/scans/${encodeURIComponent(scanId)}` : `/extensions/${id}/versions/${release}`,
    decision: scanDecision(scan?.decision),
  };
}

export function scanDecision(value: unknown): ExtensionPageModel["decision"] {
  const decision = String(value || "").toLowerCase();
  return decision === "allow" || decision === "review" || decision === "block" || decision === "incomplete" ? decision : "not-scanned";
}
