export const DEFAULT_DEEP_SCAN_SUPPORT_REASON =
  "Deep Scan requires a VS Code package manifest or a Visual Studio VSIX package.";

export class DeepScanUnsupportedError extends Error {
  constructor(message = DEFAULT_DEEP_SCAN_SUPPORT_REASON) {
    super(message);
    this.name = "DeepScanUnsupportedError";
  }
}
