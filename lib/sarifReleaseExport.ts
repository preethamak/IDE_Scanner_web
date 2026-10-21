type RecordValue = Record<string, unknown>;

export type SarifReleaseInput = {
  extensionId: string;
  version: string;
  scan: RecordValue;
  findings: unknown[];
  reportUrl: string;
};

const pathPattern = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9@._+\-/]{1,512}$/;

/**
 * Produces a portable SARIF view of public finding summaries. Raw evidence,
 * source previews, and analyzer internals deliberately never cross this boundary.
 */
export function publicReleaseSarif(input: SarifReleaseInput) {
  const findings = input.findings.filter(isRecord);
  const rules = new Map<string, RecordValue>();
  const results = findings.map((finding, index) => {
    const ruleId = safeText(finding.rule_id, 160) || `guardrails.finding.${index + 1}`;
    if (!rules.has(ruleId)) {
      rules.set(ruleId, {
        id: ruleId,
        name: ruleId,
        shortDescription: { text: safeText(finding.summary, 500) || "GuardRails extension finding" },
        fullDescription: { text: safeText(finding.recommendation, 2_000) || "Review the exact release evidence in GuardRails." },
        helpUri: input.reportUrl,
        properties: { category: safeText(finding.category, 120) || "uncategorized" },
      });
    }
    const location = findingLocation(finding, input.extensionId, input.version);
    return {
      ruleId,
      level: sarifLevel(safeText(finding.severity, 40)),
      message: { text: safeText(finding.summary, 2_000) || "GuardRails reported an extension finding." },
      ...(location ? { locations: [location] } : {}),
      properties: {
        severity: safeText(finding.severity, 40) || "unknown",
        confidence: numberValue(finding.confidence),
        actionability: safeText(finding.actionability, 80) || null,
        report_url: input.reportUrl,
      },
    };
  });

  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: {
        driver: {
          name: "GuardRails",
          informationUri: "https://abscissa.dev",
          semanticVersion: safeText(input.scan.scanner_version || input.scan.scanner_build, 160) || undefined,
          rules: [...rules.values()],
        },
      },
      automationDetails: { id: `guardrails/${input.extensionId}@${input.version}/${safeText(input.scan.id, 160) || "release"}` },
      results,
      invocations: [{ executionSuccessful: String(input.scan.analysis_status || "complete") === "complete" }],
      properties: {
        extension_id: input.extensionId,
        extension_version: input.version,
        artifact_sha256: safeSha256(input.scan.artifact_sha256),
        report_url: input.reportUrl,
        coverage_percent: numberValue(input.scan.coverage_percent),
      },
    }],
  };
}

function findingLocation(finding: RecordValue, extensionId: string, version: string) {
  const refs = Array.isArray(finding.file_refs) ? finding.file_refs : [];
  const path = refs.map((entry) => safeText(entry, 512)).find((entry) => pathPattern.test(entry));
  if (!path) return null;
  return { physicalLocation: { artifactLocation: { uri: `vsix://${extensionId}/${version}/${path}` } } };
}

function sarifLevel(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === "critical" || normalized === "high") return "error";
  if (normalized === "medium" || normalized === "moderate") return "warning";
  return "note";
}

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";
}

function safeSha256(value: unknown) {
  const candidate = safeText(value, 64);
  return /^[a-f0-9]{64}$/i.test(candidate) ? candidate.toLowerCase() : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
