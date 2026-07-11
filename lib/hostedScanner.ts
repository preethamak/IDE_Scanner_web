import { createHash, randomUUID } from "node:crypto";
import { unzipSync } from "fflate";
import { marketplaceVsixUrl, resolveMarketplaceExtension } from "@/lib/marketplace";
import type { ExtensionSummary, FindingSummary, ReportSummary } from "@/lib/types";

const MAX_DOWNLOAD = 50 * 1024 * 1024;
const MAX_EXPANDED = 120 * 1024 * 1024;
const MAX_FILES = 12_000;
const MAX_TEXT_FILE = 2 * 1024 * 1024;

type HostedFinding = FindingSummary & { evidence_class: string; score: number };
type HostedRule = { id: string; severity: "LOW" | "MEDIUM" | "HIGH"; evidence: string; score: number; pattern: RegExp; summary: string; recommendation: string };

const RULES: HostedRule[] = [
  { id: "process-execution", severity: "LOW", evidence: "weak", score: 8, pattern: /\b(child_process|execFile|execSync|spawnSync|spawn)\b/, summary: "Code can execute local processes.", recommendation: "Confirm the executable and arguments are explicit and user-initiated." },
  { id: "dynamic-code-loading", severity: "MEDIUM", evidence: "weak", score: 16, pattern: /\b(eval\s*\(|new\s+Function\s*\(|vm\.runIn)/, summary: "Code uses dynamic evaluation or loading.", recommendation: "Remove dynamic evaluation or inspect the complete constructed payload." },
  { id: "network-access", severity: "LOW", evidence: "weak", score: 6, pattern: /\b(fetch\s*\(|axios\.|https?\.request|WebSocket\s*\()/, summary: "Code performs network requests.", recommendation: "Verify destinations, transmitted data, and user intent." },
  { id: "filesystem-access", severity: "LOW", evidence: "weak", score: 5, pattern: /\b(readFile|writeFile|appendFile|createReadStream|createWriteStream)\b/, summary: "Code reads or writes local files.", recommendation: "Review accessed paths and workspace trust boundaries." },
  { id: "destructive-file-pattern", severity: "MEDIUM", evidence: "weak", score: 18, pattern: /\b(rmSync|rmdirSync|unlinkSync|fs\.rm|fs\.rmdir)\b/, summary: "Code contains destructive file operations.", recommendation: "Confirm deletion scope and require explicit user initiation." },
  { id: "credential-reference", severity: "MEDIUM", evidence: "exposure", score: 18, pattern: /(\.ssh|\.aws\/credentials|\.env\b|api[_-]?key|access[_-]?token|secretStorage)/i, summary: "Code references credential or secret surfaces.", recommendation: "Verify secrets use SecretStorage and never reach logs, files, or unapproved networks." },
  { id: "encoded-payload", severity: "MEDIUM", evidence: "weak", score: 14, pattern: /(fromCharCode\s*\(|atob\s*\(|Buffer\.from\([^\n]{0,120}["']base64)/, summary: "Code constructs or decodes an encoded payload.", recommendation: "Decode and inspect the resulting content before approval." },
  { id: "download-and-execute", severity: "HIGH", evidence: "correlated", score: 42, pattern: /(fetch\s*\(|https?\.request)[\s\S]{0,3000}\b(exec|spawn|child_process)\b|\b(exec|spawn|child_process)\b[\s\S]{0,3000}(fetch\s*\(|https?\.request)/, summary: "Network download and process execution appear in the same source region.", recommendation: "Verify the download origin and immutable integrity check before execution." }
];

export async function scanMarketplaceHosted(extensionId: string): Promise<{ scanId: string; summary: ReportSummary; report: unknown }> {
  const metadata = await resolveMarketplaceExtension(extensionId);
  const response = await fetch(marketplaceVsixUrl(metadata), { headers: { Accept: "application/octet-stream" }, cache: "no-store" });
  if (!response.ok) throw new Error(`VSIX download returned ${response.status}`);
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_DOWNLOAD) throw new Error("VSIX exceeds the 50MB hosted scan limit.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_DOWNLOAD) throw new Error("VSIX is empty or exceeds the 50MB hosted scan limit.");
  return scanHostedBytes(bytes, { extensionId: metadata.extension_id, publisher: metadata.publisher, version: metadata.version, displayName: metadata.display_name, source: "marketplace" });
}

export function scanUploadedHosted(bytes: Uint8Array, filename: string): { scanId: string; summary: ReportSummary; report: unknown } {
  if (!bytes.length || bytes.length > MAX_DOWNLOAD) throw new Error("Package is empty or exceeds the 50MB hosted scan limit.");
  const fallback = filename.replace(/\.(vsix|zip)$/i, "").replace(/[^A-Za-z0-9._-]+/g, "-") || "uploaded-extension";
  return scanHostedBytes(bytes, { extensionId: `upload.${fallback}`, publisher: "uploaded", version: "unresolved", displayName: fallback, source: "upload" });
}

function scanHostedBytes(bytes: Uint8Array, metadata: { extensionId: string; publisher: string; version: string; displayName: string; source: "marketplace" | "upload" }): { scanId: string; summary: ReportSummary; report: unknown } {
  const files = unzipSync(bytes);
  const names = Object.keys(files);
  if (names.length > MAX_FILES) throw new Error(`VSIX contains ${names.length} files; hosted limit is ${MAX_FILES}.`);
  const expandedBytes = names.reduce((total, name) => total + files[name].byteLength, 0);
  if (expandedBytes > MAX_EXPANDED) throw new Error("Expanded VSIX exceeds the 120MB hosted scan limit.");

  const manifestName = names.find((name) => /(^|\/)extension\/package\.json$/i.test(name)) || names.find((name) => /(^|\/)package\.json$/i.test(name));
  if (!manifestName) throw new Error("VSIX does not contain an extension package.json manifest.");
  const manifest = JSON.parse(new TextDecoder().decode(files[manifestName])) as Record<string, unknown>;
  const publisher = String(manifest.publisher || metadata.publisher);
  const name = String(manifest.name || metadata.extensionId.split(".").slice(1).join(".") || metadata.displayName);
  const version = String(manifest.version || metadata.version);
  const extensionId = `${publisher}.${name}`;
  const findings: HostedFinding[] = [];
  const analyzed: string[] = [];
  for (const name of names) {
    if (!/\.(?:js|cjs|mjs|ts|json)$/i.test(name) || /(?:node_modules|\.min\.js$|\.map$)/i.test(name)) continue;
    const content = files[name];
    if (!content.byteLength || content.byteLength > MAX_TEXT_FILE) continue;
    const text = new TextDecoder("utf-8", { fatal: false }).decode(content);
    analyzed.push(name);
    for (const rule of RULES) {
      const match = rule.pattern.exec(text);
      if (!match) continue;
      const line = text.slice(0, match.index).split("\n").length;
      findings.push({ finding_id: `${rule.id}:${name}:${line}`, rule_id: rule.id, category: rule.id.split("-")[0], severity: rule.severity, confidence: rule.evidence === "correlated" ? 0.82 : 0.55, evidence_summary: rule.summary, file_refs: [`${name}:${line}`], recommendation: rule.recommendation, evidence_class: rule.evidence, score: rule.score });
    }
  }
  const lifecycle = manifest.scripts && typeof manifest.scripts === "object" ? Object.keys(manifest.scripts as object).filter((name) => /^(preinstall|install|postinstall|uninstall)$/.test(name)) : [];
  if (lifecycle.length) findings.push({ finding_id: "lifecycle-script:manifest", rule_id: "lifecycle-script", category: "supply-chain", severity: "MEDIUM", confidence: 0.95, evidence_summary: `Package defines lifecycle scripts: ${lifecycle.join(", ")}.`, file_refs: [manifestName], recommendation: "Inspect every lifecycle script before installation.", evidence_class: "capability", score: 20 });
  const correlated = findings.some((item) => item.rule_id === "download-and-execute");
  const review = findings.some((item) => ["MEDIUM", "HIGH", "CRITICAL"].includes(item.severity));
  const decision = correlated ? "review" : review ? "review" : "allow";
  const strongestByRule = new Map<string, number>();
  for (const finding of findings) strongestByRule.set(finding.rule_id, Math.max(strongestByRule.get(finding.rule_id) || 0, finding.score));
  const riskScore = Math.min(100, [...strongestByRule.values()].reduce((total, score) => total + score, 0));
  const artifactHash = createHash("sha256").update(bytes).digest("hex");
  const extension: ExtensionSummary = {
    extension_id: extensionId, name: String(manifest.displayName || name), publisher, version,
    source: `${metadata.source}-hosted-static`, severity: correlated ? "HIGH" : review ? "MEDIUM" : "INFO", verdict: review ? "review" : "clean", verdict_reason: findings.length ? `${findings.length} hosted static finding(s) require context.` : "No findings in the hosted static ruleset.", malware_score: correlated ? 45 : 0, risk_score: riskScore, finding_count: findings.length, top_findings: findings.slice(0, 8), decision, decision_reason: findings.length ? "Review the cited evidence before installation." : "Hosted static analysis completed with no review findings.", artifact_sha256: artifactHash, coverage_percent: 100
  };
  const scanId = randomUUID();
  const summary: ReportSummary = {
    summary: { total_extensions: 1, max_malware_score: extension.malware_score, max_risk_score: extension.risk_score, by_verdict: { [extension.verdict]: 1 }, by_severity: { [extension.severity]: 1 } },
    human_summary: [extension.decision_reason || extension.verdict_reason || "Hosted static analysis completed."],
    top_risk_extensions: [extension], action_counts: { clean: review ? 0 : 1, review: review ? 1 : 0, suspicious: 0, malicious: 0 },
    finding_counts: { by_rule: countBy(findings, "rule_id"), by_category: countBy(findings, "category"), by_severity: countBy(findings, "severity") }
  };
  return { scanId, summary, report: { metadata: { scan_id: scanId, scanner_version: "hosted-static-1", ruleset_version: "hosted-2026.07.11", source: metadata.source, completion_state: "complete" }, summary, extensions: [{ ...extension, findings, manifest, artifact_identity: { extension_id: extensionId, version, sha256: artifactHash, source: metadata.source }, analysis_coverage: { status: "complete", coverage_percent: 100, discovered_files: names.length, analyzed_executable_files: analyzed, providers: { hosted_static: "complete", semgrep: "not_run", yara: "not_run", dependency_intelligence: "not_run" } } }] } };
}

function countBy(items: HostedFinding[], field: "rule_id" | "category" | "severity"): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item[field]] = (counts[item[field]] || 0) + 1;
    return counts;
  }, {});
}
