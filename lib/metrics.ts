import type { ExtensionSummary, Verdict } from "@/lib/types";

export const metricCatalog = [
  {
    id: "manifest-capability",
    label: "Manifest capability",
    short: "What the extension asks the IDE to let it do.",
    detail: "Activation events, debuggers, terminal hooks, language model tools, MCP servers, commands, and high-power IDE contributions.",
    why: "A powerful extension is not automatically malicious, but broad activation and agent-facing tools increase the blast radius if the extension is compromised."
  },
  {
    id: "executable-behavior",
    label: "Executable behavior",
    short: "Signals that code can run, fetch, modify, or delete.",
    detail: "Process spawning, filesystem reads and writes, network calls, dynamic code loading, download execution, and destructive file operation patterns.",
    why: "These features are common in real developer tools, so the scanner looks for combinations and context instead of treating one API call as malware."
  },
  {
    id: "supply-chain",
    label: "Supply chain",
    short: "Install-time and dependency risk.",
    detail: "Lifecycle scripts, unpinned dependencies, mutable dependency sources, vulnerable packages, packed archives, and native artifacts.",
    why: "Extension risk often comes through package installation, dependency drift, bundled binaries, or release workflows rather than the main extension code."
  },
  {
    id: "credential-exposure",
    label: "Credential exposure",
    short: "Secret access and exfiltration paths.",
    detail: "Environment files, token references, known credential paths, secret reads, network sinks, and correlated exfiltration chains.",
    why: "Credential reads are high signal only when they connect to file access and outbound transfer behavior."
  },
  {
    id: "provenance-posture",
    label: "Provenance posture",
    short: "Whether the package can be traced and trusted.",
    detail: "Marketplace status, removed package lists, repository metadata, security policy presence, stale projects, risky workflows, and source/package mismatch evidence.",
    why: "Provenance does not prove malware by itself, but it changes how much trust you should place in the package."
  },
  {
    id: "observed-behavior",
    label: "Observed behavior",
    short: "Runtime evidence from sandbox observations.",
    detail: "Secret exfiltration, persistence, process execution, filesystem writes, destructive behavior, and download-execute behavior observed in a controlled run.",
    why: "Runtime observations can raise confidence because they show what the package actually attempted to do."
  }
];

export const ruleFamilies = [
  "startup-activation",
  "sensitive-activation",
  "broad-activation",
  "powerful-ide-contribution",
  "agentic-tooling",
  "agent-shell-tool",
  "agent-filesystem-tool",
  "agent-network-tool",
  "agent-prompt-injection-sink",
  "mcp-server-command",
  "lifecycle-script",
  "install-download-execute",
  "install-secret-access",
  "install-shell-obfuscation",
  "install-network-telemetry",
  "mutable-dependency-source",
  "unpinned-dependency",
  "vulnerable-npm-dependency",
  "native-or-packed-artifact",
  "packed-artifact",
  "dynamic-code-loading",
  "process-execution",
  "filesystem-access",
  "network-access",
  "destructive-file-pattern",
  "credential-exfiltration-chain",
  "download-and-execute",
  "obfuscation-execution-network",
  "persistence-chain",
  "observed-secret-exfil",
  "observed-download-execute",
  "observed-persistence",
  "known-bad-artifact",
  "trusted-threat-feed-hit",
  "marketplace-removed-package",
  "marketplace-name-impersonation",
  "dangerous-github-workflow",
  "security-policy-missing"
];

export function gradeFromScores(maxRisk: number, maxMalware: number, counts: Record<Verdict, number>): string {
  if (counts.malicious > 0 || maxMalware >= 90) return "F";
  if (counts.suspicious > 0 || maxRisk >= 80 || maxMalware >= 60) return "D";
  if (counts.review > 0 || maxRisk >= 40) return "B";
  if (maxRisk > 0 || maxMalware > 0) return "A-";
  return "A";
}

export function gradeReason(maxRisk: number, maxMalware: number, counts: Record<Verdict, number>): string {
  if (counts.malicious > 0 || maxMalware >= 90) return "Confirmed or authoritative malware evidence exists.";
  if (counts.suspicious > 0 || maxRisk >= 80 || maxMalware >= 60) return "Suspicious chains or high-confidence behavior need immediate review.";
  if (counts.review > 0 || maxRisk >= 40) return "No confirmed malware, but one or more extensions expose review-worthy capability or supply-chain risk.";
  return "No actionable malware, abuse-chain, or sensitive-capability evidence was identified.";
}

export function extensionGrade(extension: ExtensionSummary): string {
  if (extension.verdict === "malicious" || extension.malware_score >= 90) return "Grade F";
  if (extension.verdict === "suspicious" || extension.risk_score >= 80 || extension.malware_score >= 60) return "Grade D";
  if (extension.verdict === "review" || extension.risk_score >= 40) return "Grade B";
  if (extension.risk_score > 0 || extension.malware_score > 0) return "Grade A-";
  return "Grade A";
}

export function extensionGradeReason(extension: ExtensionSummary): string {
  if (extension.verdict === "malicious") return "Authoritative or confirmed malware evidence.";
  if (extension.verdict === "suspicious") return "Correlated behavior or strong non-authoritative evidence.";
  if (extension.verdict === "review") return "Review-worthy risk without confirmed malware.";
  return "Context findings only; no actionable malicious signal.";
}
