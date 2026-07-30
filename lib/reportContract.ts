export type ReportObject = Record<string, unknown>;

export type ReportExtension = ReportObject & {
  id: string;
  display_name: string;
  publisher: string;
  registry: string;
  icon_url: string;
  publisher_verified: boolean;
};

export type ReportVersion = ReportObject & { version: string };
export type ReportFinding = ReportObject;
export type ReportFile = ReportObject;
export type ReportDependency = ReportObject;

export type ReportScan = ReportObject & {
  id: string;
  extension_id: string;
  version: string;
  artifact_sha256: string;
  analysis_status: "complete" | "incomplete" | "failed";
  decision: "allow" | "review" | "block" | "incomplete";
  public_outcome?: PublicOutcome;
};

export type PublicOutcome =
  | "clear"
  | "expected_capability"
  | "investigate"
  | "preventive_block"
  | "confirmed_threat"
  | "incomplete";

export type ExtensionDossierData = {
  id: string;
  version: string;
  extension: ReportExtension;
  versions: ReportVersion[];
  scan: ReportScan;
  findings: ReportFinding[];
  files: ReportFile[];
  dependencies: ReportDependency[];
};

export class ReportContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportContractError";
  }
}

const PUBLIC_OUTCOMES = new Set<PublicOutcome>([
  "clear",
  "expected_capability",
  "investigate",
  "preventive_block",
  "confirmed_threat",
  "incomplete",
]);
const DECISIONS = new Set<ReportScan["decision"]>([
  "allow",
  "review",
  "block",
  "incomplete",
]);
const ANALYSIS_STATUSES = new Set<ReportScan["analysis_status"]>([
  "complete",
  "incomplete",
  "failed",
]);
const SHA256 = /^[a-f0-9]{64}$/i;

function object(value: unknown, label: string): ReportObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ReportContractError(`${label} must be an object.`);
  }
  return value as ReportObject;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ReportContractError(`${label} must be a non-empty string.`);
  }
  return value;
}

function objectArray(value: unknown, label: string): ReportObject[] {
  if (!Array.isArray(value) || value.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new ReportContractError(`${label} must be an array of objects.`);
  }
  return value as ReportObject[];
}

/**
 * Validates the data boundary between Supabase/registry data and client report rendering.
 * Invalid identity is deliberately rejected: a public report must never infer an artifact.
 */
export function parseExtensionDossierData(value: unknown): ExtensionDossierData {
  const input = object(value, "Report");
  const id = string(input.id, "Report extension id");
  const version = string(input.version, "Report version");
  const extension = object(input.extension, "Report extension");
  const scan = object(input.scan, "Report scan");

  const extensionId = string(extension.id, "Report extension identity");
  if (extensionId.toLowerCase() !== id.toLowerCase()) {
    throw new ReportContractError("Report extension identity does not match the route.");
  }
  const scanExtensionId = string(scan.extension_id, "Report scan extension identity");
  if (scanExtensionId.toLowerCase() !== id.toLowerCase()) {
    throw new ReportContractError("Report scan identity does not match the route.");
  }
  if (string(scan.version, "Report scan version") !== version) {
    throw new ReportContractError("Report scan version does not match the route.");
  }
  const artifactSha256 = string(scan.artifact_sha256, "Report artifact SHA-256");
  if (!SHA256.test(artifactSha256)) {
    throw new ReportContractError("Report artifact SHA-256 must be a 64-character hexadecimal digest.");
  }
  const decision = string(scan.decision, "Report decision") as ReportScan["decision"];
  if (!DECISIONS.has(decision)) {
    throw new ReportContractError("Report decision is unsupported.");
  }
  const analysisStatus = String(scan.analysis_status || "incomplete") as ReportScan["analysis_status"];
  if (!ANALYSIS_STATUSES.has(analysisStatus)) {
    throw new ReportContractError("Report analysis status is unsupported.");
  }
  if (scan.public_outcome != null && !PUBLIC_OUTCOMES.has(String(scan.public_outcome) as PublicOutcome)) {
    throw new ReportContractError("Report public outcome is unsupported.");
  }

  return {
    id,
    version,
    extension: {
      ...extension,
      id: extensionId,
      display_name: String(extension.display_name || id),
      publisher: String(extension.publisher || "Not reported"),
      registry: String(extension.registry || "Registry not reported"),
      icon_url: String(extension.icon_url || ""),
      publisher_verified: Boolean(extension.publisher_verified),
    },
    versions: objectArray(input.versions, "Report versions").map((item) => ({
      ...item,
      version: string(item.version, "Report version entry"),
    })),
    scan: {
      ...scan,
      id: string(scan.id, "Report scan id"),
      extension_id: scanExtensionId,
      version,
      artifact_sha256: artifactSha256.toLowerCase(),
      analysis_status: analysisStatus,
      decision,
      ...(scan.public_outcome == null ? {} : { public_outcome: String(scan.public_outcome) as PublicOutcome }),
    },
    findings: objectArray(input.findings, "Report findings"),
    files: objectArray(input.files, "Report files"),
    dependencies: objectArray(input.dependencies, "Report dependencies"),
  };
}
