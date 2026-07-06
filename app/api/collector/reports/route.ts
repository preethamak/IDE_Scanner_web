import { NextResponse } from "next/server";
import { saveAgentReport } from "@/lib/agentReports";
import type { ExtensionSummary, FindingSummary, ReportSummary, Verdict } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CollectorExtension = {
  client?: unknown;
  path?: unknown;
  manifest?: unknown;
  package_json?: unknown;
};

export async function POST(request: Request) {
  const expectedToken = process.env.IDE_SCANNER_AGENT_TOKEN;
  if (expectedToken) {
    const header = request.headers.get("authorization") || "";
    if (header !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const payload = await request.json().catch(() => null) as { agent?: unknown; extensions?: unknown } | null;
  const extensions = Array.isArray(payload?.extensions) ? payload.extensions as CollectorExtension[] : [];
  const reportExtensions = extensions.map(toReportExtension);
  const report = {
    schema_version: "0.1.0",
    source: "collector",
    generated_at: Date.now(),
    summary: {
      total_extensions: reportExtensions.length,
      max_malware_score: max(reportExtensions.map((item) => item.malware_score)),
      max_risk_score: max(reportExtensions.map((item) => item.risk_score)),
      by_verdict: countBy(reportExtensions.map((item) => item.verdict)),
      by_severity: countBy(reportExtensions.map((item) => item.severity)),
    },
    human_summary: [
      `${reportExtensions.length} installed extension(s) discovered by the lightweight collector.`,
      "Inventory-only collector reports use package manifests and do not require the scanner package to be installed locally."
    ],
    extensions: reportExtensions,
    registry_checks: {},
  };

  const summary = summarize(reportExtensions, report.summary, report.human_summary);
  try {
    const saved = await saveAgentReport({
      agent: payload?.agent,
      summary,
      report,
    });
    return NextResponse.json({
      id: saved.id,
      status: "complete",
      source: "agent",
      createdAt: saved.createdAt,
      total_extensions: summary.summary.total_extensions,
      review: summary.action_counts.review,
      clean: summary.action_counts.clean,
      max_risk_score: summary.summary.max_risk_score,
      max_malware_score: summary.summary.max_malware_score,
      report_url: `/api/scans/${saved.id}/report`,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid collector report" }, { status: 400 });
  }
}

function toReportExtension(item: CollectorExtension): ExtensionSummary & {
  description: string;
  source: string;
  capabilities: unknown[];
  findings: FindingSummary[];
  scanned_files: number;
} {
  const manifestSource = item.manifest || item.package_json;
  const manifest = manifestSource && typeof manifestSource === "object" ? manifestSource as Record<string, unknown> : {};
  const publisher = stringValue(manifest.publisher, "unknown");
  const name = stringValue(manifest.name, "unknown");
  const version = stringValue(manifest.version, "unknown");
  const extensionId = `${publisher}.${name}`;
  const findings = manifestFindings(manifest);
  const risk = findings.length ? Math.max(...findings.map((finding) => finding.rule_id === "lifecycle-script" ? 45 : 35)) : 0;
  const verdict: Verdict = risk >= 35 ? "review" : "clean";
  const severity = risk >= 45 ? "MEDIUM" : risk > 0 ? "LOW" : "INFO";
  return {
    instance_id: `${extensionId}:${stringValue(item.path, "")}`,
    extension_id: extensionId,
    name,
    publisher,
    version,
    description: stringValue(manifest.description, ""),
    source: stringValue(item.client, "collector"),
    install_path: stringValue(item.path, ""),
    severity,
    verdict,
    verdict_reason: findings.length ? "Manifest contains review-worthy extension behavior." : "No review-worthy manifest behavior found by inventory collector.",
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
  };
}

function manifestFindings(manifest: Record<string, unknown>): FindingSummary[] {
  const findings: FindingSummary[] = [];
  const scripts = manifest.scripts && typeof manifest.scripts === "object" ? manifest.scripts as Record<string, unknown> : {};
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

  const activationEvents = Array.isArray(manifest.activationEvents) ? manifest.activationEvents.filter((value): value is string => typeof value === "string") : [];
  const startupEvents = activationEvents.filter((value) => value === "*" || value === "onStartupFinished");
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
    top_risk_extensions: [...extensions].sort((a, b) => b.risk_score - a.risk_score || a.extension_id.localeCompare(b.extension_id)).slice(0, 50),
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

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}
