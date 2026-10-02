export const DEFAULT_DEEP_SCAN_SUPPORT_REASON =
  "Deep Scan supports VS Code-compatible extensions; this Marketplace package is not published with a VS Code package manifest.";

export class DeepScanUnsupportedError extends Error {
  constructor(message = DEFAULT_DEEP_SCAN_SUPPORT_REASON) {
    super(message);
    this.name = "DeepScanUnsupportedError";
  }
}
