import type { ExtensionSummary, FindingSummary, ReportSummary, Verdict } from "@/lib/types";

export type CollectorManifest = {
  publisher?: unknown;
  name?: unknown;
  displayName?: unknown;
  version?: unknown;
  description?: unknown;
  activationEvents?: unknown;
  scripts?: unknown;
  contributes?: unknown;
  dependencies?: unknown;
  devDependencies?: unknown;
  main?: unknown;
  browser?: unknown;
  extensionKind?: unknown;
  categories?: unknown;
  engines?: unknown;
  repository?: unknown;
};

export type CollectorExtension = {
  client?: unknown;
  path?: unknown;
  manifest?: unknown;
  package_json?: unknown;
};

export function buildCollectorReport(extensions: CollectorExtension[]) {
  const reportExtensions = extensions.map(toReportExtension);
  const summary = {
    total_extensions: reportExtensions.length,
    max_malware_score: max(reportExtensions.map((item) => item.malware_score)),
    max_risk_score: max(reportExtensions.map((item) => item.risk_score)),
    by_verdict: countBy(reportExtensions.map((item) => item.verdict)),
    by_severity: countBy(reportExtensions.map((item) => item.severity)),
  };
  const humanSummary = [
    `${reportExtensions.length} installed extension(s) discovered by the local collector.`,
    "Collector reports use package manifests and selected contribution metadata. Extension source files are not uploaded."
  ];
  const report = {
    schema_version: "0.2.0",
    source: "collector",
    generated_at: Date.now(),
    summary,
    human_summary: humanSummary,
    extensions: reportExtensions,
    registry_checks: {},
  };
  return {
    report,
    summary: summarize(reportExtensions, summary, humanSummary),
  };
}

function toReportExtension(item: CollectorExtension): ExtensionSummary & {
  display_name: string;
  description: string;
  source: string;
  capabilities: unknown[];
  findings: FindingSummary[];
  scanned_files: number;
  collector_details: Record<string, unknown>;
} {
  const manifestSource = item.manifest || item.package_json;
  const manifest = manifestSource && typeof manifestSource === "object" ? manifestSource as CollectorManifest : {};
  const publisher = stringValue(manifest.publisher, "unknown");
  const name = stringValue(manifest.name, "unknown");
  const version = stringValue(manifest.version, "unknown");
  const extensionId = `${publisher}.${name}`;
  const details = collectorDetails(manifest);
  const findings = manifestFindings(manifest, details);
  const risk = findings.length ? Math.max(...findings.map((finding) => finding.rule_id === "lifecycle-script" ? 45 : 35)) : 0;
  const verdict: Verdict = risk >= 35 ? "review" : "clean";
  const severity = risk >= 45 ? "MEDIUM" : risk > 0 ? "LOW" : "INFO";
  return {
    instance_id: `${extensionId}:${stringValue(item.path, "")}`,
    extension_id: extensionId,
    name,
    display_name: stringValue(manifest.displayName, name),
    publisher,
    version,
    description: stringValue(manifest.description, ""),
    source: stringValue(item.client, "collector"),
    install_path: stringValue(item.path, ""),
    severity,
    verdict,
    verdict_reason: findings.length ? "Manifest contains review-worthy extension behavior." : "No review-worthy manifest behavior found by collector.",
    malware_score: 0,
    risk_score: risk,
    score_details: {
      basis: findings.length ? "manifest" : "none",
      confidence: "medium",
      components: findings.length ? { manifest_behavior: risk } : {},
      counts: { findings: findings.length },
      suppressors: [],
    },
    finding_count: findings.length,
    top_findings: findings,
    capabilities: [],
    findings,
    scanned_files: 0,
    collector_details: details,
  };
}

function collectorDetails(manifest: CollectorManifest): Record<string, unknown> {
  const contributes = objectValue(manifest.contributes);
  const dependencyNames = Object.keys(objectValue(manifest.dependencies));
  const devDependencyNames = Object.keys(objectValue(manifest.devDependencies));
  return {
    display_name: stringValue(manifest.displayName, ""),
    main: stringValue(manifest.main, ""),
    browser: stringValue(manifest.browser, ""),
    extension_kind: arrayStrings(manifest.extensionKind).slice(0, 8),
    categories: arrayStrings(manifest.categories).slice(0, 12),
    activation_events: arrayStrings(manifest.activationEvents).slice(0, 30),
    scripts: objectValue(manifest.scripts),
    contributes: summarizeContributes(contributes),
    dependency_count: dependencyNames.length,
    dependency_samples: dependencyNames.slice(0, 20),
    dev_dependency_count: devDependencyNames.length,
    engine_vscode: stringValue(objectValue(manifest.engines).vscode, ""),
    repository: repositoryUrl(manifest.repository),
  };
}

function summarizeContributes(contributes: Record<string, unknown>): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  for (const key of ["commands", "views", "configuration", "debuggers", "languages", "grammars", "themes", "snippets", "keybindings", "authentication", "notebooks", "terminal", "taskDefinitions"]) {
    const value = contributes[key];
    if (Array.isArray(value)) {
      summary[key] = {
        count: value.length,
        samples: value.slice(0, 8).map((item) => labelForContribution(item)),
      };
    } else if (value && typeof value === "object") {
      summary[key] = { count: 1, samples: Object.keys(value as Record<string, unknown>).slice(0, 8) };
    }
  }
  return summary;
}

function labelForContribution(value: unknown): string {
  if (!value || typeof value !== "object") return String(value || "");
  const item = value as Record<string, unknown>;
  return stringValue(item.command, "") || stringValue(item.id, "") || stringValue(item.name, "") || stringValue(item.title, "") || "contribution";
}

function manifestFindings(manifest: CollectorManifest, details: Record<string, unknown>): FindingSummary[] {
  const findings: FindingSummary[] = [];
  const scripts = objectValue(manifest.scripts);
  const lifecycle = ["preinstall", "install", "postinstall"].filter((name) => typeof scripts[name] === "string");
  if (lifecycle.length) {
    findings.push({
      finding_id: "manifest-lifecycle-script",
      rule_id: "lifecycle-script",
      category: "supply-chain",
      severity: "MEDIUM",
      confidence: 70,
      evidence_summary: `Lifecycle script(s): ${lifecycle.join(", ")}`,
      file_refs: ["package.json"],
      recommendation: "Review install-time scripts before allowing this extension in managed environments."
    });
  }

  const startupEvents = arrayStrings(details.activation_events).filter((value) => value === "*" || value === "onStartupFinished");
  if (startupEvents.length) {
    findings.push({
      finding_id: "manifest-startup-activation",
      rule_id: "startup-activation",
      category: "capability",
      severity: "LOW",
      confidence: 70,
      evidence_summary: `Startup activation event(s): ${startupEvents.join(", ")}`,
      file_refs: ["package.json"],
      recommendation: "Confirm the extension needs to activate at IDE startup."
    });
  }
  return findings;
}

function summarize(extensions: ExtensionSummary[], summary: ReportSummary["summary"], humanSummary: string[]): ReportSummary {
  const actionCounts = {
    malicious: 0,
    suspicious: 0,
    review: extensions.filter((item) => item.verdict === "review").length,
    clean: extensions.filter((item) => item.verdict === "clean").length,
  };
  return {
    summary,
    human_summary: humanSummary,
    posture_summary: undefined,
    posture: [],
    version_deltas: [],
    top_risk_extensions: [...extensions].sort((a, b) => b.risk_score - a.risk_score || a.extension_id.localeCompare(b.extension_id)).slice(0, 200),
    action_counts: actionCounts,
    finding_counts: {
      by_rule: countBy(extensions.flatMap((item) => item.top_findings.map((finding) => finding.rule_id))),
      by_category: countBy(extensions.flatMap((item) => item.top_findings.map((finding) => finding.category))),
      by_severity: countBy(extensions.flatMap((item) => item.top_findings.map((finding) => finding.severity))),
    },
  };
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function max(values: number[]): number {
  return values.length ? Math.max(...values) : 0;
}

function arrayStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function repositoryUrl(value: unknown): string {
  if (typeof value === "string") return value;
  return stringValue(objectValue(value).url, "");
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}
