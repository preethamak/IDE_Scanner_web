import { createHash } from "node:crypto";

export const EXTENSION_POLICY_SCHEMA = "guardrails.enterprise-policy.v1";

export type ExtensionPolicyDecision = "allow" | "exception" | "review" | "block";

export type ExtensionPolicyDecisionRow = {
  id?: string;
  scan_id?: string;
  extension_id: string;
  version: string;
  decision: ExtensionPolicyDecision | string;
  rationale?: string | null;
  updated_at?: string | null;
  artifact_sha256?: string | null;
  artifact_identity_match?: boolean;
  scanner_build?: string | null;
  policy_version?: string | null;
  score_schema_version?: string | null;
  analysis_status?: string | null;
  coverage_percent?: number | null;
  risk_score?: number | null;
  malware_score?: number | null;
  capabilities?: unknown;
  capability_assessment?: unknown;
  trust_tier?: string | null;
  public_outcome?: string | null;
};

export type ExtensionPolicyEntry = {
  decision_id: string;
  scan_id: string;
  extension_id: string;
  version: string;
  artifact_sha256: string;
  decision: "allow" | "exception";
  rationale: string;
  updated_at: string | null;
  scanner_build: string;
  policy_version: string;
  score_schema_version: string;
  analysis_status: string;
  coverage_percent: number | null;
  risk_score: number | null;
  malware_score: number | null;
  capability_contract: {
    observed: string[];
    requires_explicit_review: boolean;
    review_reason: string | null;
  };
  trust_tier: string;
  public_outcome: string;
};

export type ExtensionPolicyBundle = {
  schema: typeof EXTENSION_POLICY_SCHEMA;
  generated_at: string;
  team_id: string;
  policy_hash: string;
  default_action: "deny";
  enforcement: {
    vscode: {
      settings: {
        "extensions.allowed": Record<string, false | true | string[]>;
        "extensions.autoUpdate": false;
      };
      limitation: string;
    };
    guardrails: {
        exact_release_allowlist: ExtensionPolicyEntry[];
        requires_artifact_sha256: true;
        requires_complete_analysis: true;
        requires_capability_contract: true;
      };
  };
  entries: ExtensionPolicyEntry[];
  unresolved: Array<{
    decision_id: string;
    extension_id: string;
    version: string;
    decision: string;
    reason: string;
  }>;
  summary: {
    allowed_releases: number;
    unresolved_approvals: number;
    reviewed_or_blocked_releases: number;
  };
};

const SHA256 = /^[a-f0-9]{64}$/i;
const EXTENSION_ID = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/;
const EXPLICIT_REVIEW_CAPABILITIES = new Set([
  "agentic",
  "agent_shell",
  "agent_filesystem",
  "agent_network",
  "credential_input",
  "credential_commands",
  "credential_configuration",
  "native_code",
  "process_execution",
  "ide_contributions",
  "lifecycle_scripts",
  "network",
]);

/**
 * Build the deployable organization policy from exact team decisions.
 *
 * The VS Code setting is intentionally only a compatibility layer: it can
 * enforce an exact extension version, but not the artifact hash. The
 * GuardRails list remains hash-bound so the CLI/IDE enforcement layer can
 * reject a republished artifact with the same version.
 */
export function buildExtensionPolicyBundle(
  teamId: string,
  decisions: ExtensionPolicyDecisionRow[],
  generatedAt = new Date().toISOString(),
): ExtensionPolicyBundle {
  const entries: ExtensionPolicyEntry[] = [];
  const unresolved: ExtensionPolicyBundle["unresolved"] = [];
  const seen = new Set<string>();

  for (const row of decisions) {
    const decision = String(row.decision || "").toLowerCase();
    const extensionId = String(row.extension_id || "").trim();
    const version = String(row.version || "").trim();
    const key = `${extensionId.toLowerCase()}@${version}`;

    if (decision !== "allow" && decision !== "exception") continue;
    if (seen.has(key)) continue;

    if (!EXTENSION_ID.test(extensionId)) {
      unresolved.push({
        decision_id: String(row.id || "unknown"),
        extension_id: extensionId,
        version,
        decision,
        reason: "The extension identifier is not valid for an editor policy entry.",
      });
      continue;
    }
    if (!version) {
      unresolved.push({
        decision_id: String(row.id || "unknown"),
        extension_id: extensionId,
        version,
        decision,
        reason: "An exact version is required; a latest-version approval is not deployable.",
      });
      continue;
    }

    if (row.artifact_identity_match === false) {
      unresolved.push({
        decision_id: String(row.id || "unknown"),
        extension_id: extensionId,
        version,
        decision,
        reason: "The decision does not join to a scan for the same exact extension ID and version.",
      });
      continue;
    }

    const artifactSha256 = String(row.artifact_sha256 || "").toLowerCase();
    if (!SHA256.test(artifactSha256)) {
      unresolved.push({
        decision_id: String(row.id || "unknown"),
        extension_id: extensionId,
        version,
        decision,
        reason: "The approval has no exact artifact SHA-256, so it is withheld from deployment.",
      });
      continue;
    }
    if (String(row.analysis_status || "") !== "complete") {
      unresolved.push({
        decision_id: String(row.id || "unknown"),
        extension_id: extensionId,
        version,
        decision,
        reason: "The exact release does not have complete analysis coverage.",
      });
      continue;
    }

    // Mark only deployable entries as seen. If a stale decision row is
    // missing its scan/hash metadata but a newer joined row is complete, the
    // valid exact release must still be eligible for export.
    seen.add(key);

    entries.push({
      decision_id: String(row.id || "unknown"),
      scan_id: String(row.scan_id || "unknown"),
      extension_id: extensionId,
      version,
      artifact_sha256: artifactSha256,
      decision: decision as "allow" | "exception",
      rationale: String(row.rationale || ""),
      updated_at: row.updated_at ? String(row.updated_at) : null,
      scanner_build: String(row.scanner_build || "unknown"),
      policy_version: String(row.policy_version || "unknown"),
      score_schema_version: String(row.score_schema_version || "unknown"),
      analysis_status: String(row.analysis_status || "unknown"),
      coverage_percent: numberOrNull(row.coverage_percent),
      risk_score: numberOrNull(row.risk_score),
      malware_score: numberOrNull(row.malware_score),
      capability_contract: capabilityContract(row),
      trust_tier: String(row.trust_tier || ""),
      public_outcome: String(row.public_outcome || ""),
    });
  }

  entries.sort((left, right) =>
    `${left.extension_id.toLowerCase()}@${left.version}`.localeCompare(
      `${right.extension_id.toLowerCase()}@${right.version}`,
    ),
  );

  const allowed: Record<string, false | true | string[]> = { "*": false };
  const versionsByExtension = new Map<string, string[]>();
  for (const entry of entries) {
    const key = entry.extension_id.toLowerCase();
    const versions = versionsByExtension.get(key) || [];
    versions.push(entry.version);
    versionsByExtension.set(key, versions);
  }
  for (const [extensionId, versions] of versionsByExtension) {
    allowed[extensionId] = [...new Set(versions)].sort(compareVersions);
  }

  const enforcement: ExtensionPolicyBundle["enforcement"] = {
    vscode: {
      settings: {
        "extensions.allowed": allowed,
        "extensions.autoUpdate": false,
      },
      limitation:
        "VS Code settings enforce extension ID and version, but not artifact bytes. Use the GuardRails exact_release_allowlist to verify SHA-256 before installation and update.",
    },
    guardrails: {
      exact_release_allowlist: entries,
      requires_artifact_sha256: true,
      requires_complete_analysis: true,
      requires_capability_contract: true,
    },
  };
  const hashInput = {
    schema: EXTENSION_POLICY_SCHEMA,
    team_id: teamId,
    default_action: "deny",
    enforcement,
    entries,
    unresolved,
  };
  const policyHash = createHash("sha256").update(canonicalJson(hashInput)).digest("hex");

  return {
    schema: EXTENSION_POLICY_SCHEMA,
    generated_at: generatedAt,
    team_id: teamId,
    policy_hash: policyHash,
    default_action: "deny",
    enforcement,
    entries,
    unresolved,
    summary: {
      allowed_releases: entries.length,
      unresolved_approvals: unresolved.length,
      reviewed_or_blocked_releases: decisions.filter((row) =>
        ["review", "block"].includes(String(row.decision || "").toLowerCase()),
      ).length,
    },
  };
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function capabilityContract(row: ExtensionPolicyDecisionRow): ExtensionPolicyEntry["capability_contract"] {
  const observed = [...new Set([
    ...capabilityIds(row.capabilities),
    ...capabilityIds(row.capability_assessment),
  ])].sort();
  const requiresExplicitReview = observed.some((item) => EXPLICIT_REVIEW_CAPABILITIES.has(item));
  return {
    observed,
    requires_explicit_review: requiresExplicitReview,
    review_reason: requiresExplicitReview
      ? "This exact release exposes a high-impact capability surface; keep the approval attached to the release and review changes before update."
      : null,
  };
}

function capabilityIds(value: unknown): string[] {
  if (typeof value === "string") {
    try {
      return capabilityIds(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") return [item.trim()];
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const id = record.id || record.capability || record.name;
      return typeof id === "string" ? [id.trim()] : [];
    }).filter(Boolean);
  }
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["capabilities", "matched", "observed", "requested_capabilities", "permissions", "unexpected"]) {
    if (key in record) return capabilityIds(record[key]);
  }
  return [];
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(/[.-]/).map((part) => (/^\d+$/.test(part) ? Number(part) : part));
  const rightParts = right.split(/[.-]/).map((part) => (/^\d+$/.test(part) ? Number(part) : part));
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const a = leftParts[index] ?? 0;
    const b = rightParts[index] ?? 0;
    if (a === b) continue;
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b));
  }
  return 0;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
