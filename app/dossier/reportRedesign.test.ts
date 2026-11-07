import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import OverviewSection from "./OverviewSection";
import type { ReportScan } from "@/lib/reportContract";
import type { EvidenceGroupData } from "./AlertsSection";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const scan: ReportScan = { id: "scan-1", extension_id: "publisher.extension", version: "1.2.3", artifact_sha256: "a".repeat(64), analysis_status: "complete", decision: "review", coverage_percent: 100 };
const group: EvidenceGroupData = { rule: "process-chain", summary: "A startup command executes a process", severity: "HIGH", count: 2, occurrences: 3, locations: ["dist/main.js:14", "dist/main.js:25"], actionability: "review", evidenceClasses: ["strong"] };
const render = (overrides = {}) => renderToStaticMarkup(createElement(OverviewSection, { decision: "review", scan, actionableGroups: [group], noteGroups: [], capabilities: { network_access: { evidence: ["dist/main.js:42"] } }, onOpenAlerts() {}, onOpenCapabilities() {}, ...overrides }));

describe("task-first exact-release report", () => {
  it("shows real findings and their recorded locations before capability context", () => {
    const html = render();
    expect(html).toContain("A startup command executes a process");
    expect(html).toContain("dist/main.js:14");
    expect(html).toContain("dist/main.js:25");
    expect(html).toContain("3 occurrences");
    expect(html.indexOf("A startup command")).toBeLessThan(html.indexOf("Capabilities in this package"));
    expect(html).toContain("network access");
    expect(html).toContain("1 recorded evidence location");
    expect(html).not.toContain("SeverityGauge");
  });

  it("does not reassure users that an incomplete empty scan passed review", () => {
    const html = render({ scan: { ...scan, analysis_status: "incomplete" }, actionableGroups: [], capabilities: {} });
    expect(html).toContain("Analysis is not complete.");
    expect(html).toContain("An empty findings list does not establish");
    expect(html).not.toContain("No actionable findings were recorded.");
    expect(html).toContain("This scan did not record any capability families.");
  });

  it("keeps contextual evidence separate from actionable groups", () => {
    const html = render({ actionableGroups: [], noteGroups: [{ ...group, rule: "normal-activation", summary: "Expected activation event", actionability: "contextual" }] });
    expect(html).toContain("No actionable findings were recorded.");
    expect(html).toContain("1 contextual or hardening note");
    expect(html).toContain("Expected activation event");
    expect(html).toContain("not probabilities or safety ratings");
  });

  it("keeps immutable identifiers, utility exports and workflow actions available without repeated summaries", () => {
    const dossier = read("../ExtensionDossier.tsx");
    expect(dossier).toContain("Scan identity & analysis limits");
    expect(dossier).toContain("scan.artifact_sha256");
    expect(dossier).toContain('mode="workflow"');
    expect(dossier.indexOf("dossierLayout")).toBeLessThan(dossier.indexOf('id="report-workflow"'));
    expect(read("./DossierHeader.tsx")).not.toContain("One release. One defensible decision.");
    expect(read("./DossierHeader.tsx")).toContain("Compare releases");
    expect(read("../ReportActions.tsx")).toContain("scanId=${encodeURIComponent(scanId)}");
    expect(read("../TeamDecisionAction.tsx")).toContain("rationale: rationale.trim()");
  });
});
