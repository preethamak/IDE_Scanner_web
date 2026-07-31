"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  FileText,
  Fingerprint,
  FolderTree,
  GitCompareArrows,
  Package,
  Radar,
  ShieldCheck,
  Terminal,
  UserRound,
  Waypoints,
} from "lucide-react";
import DossierHeader from "@/app/dossier/DossierHeader";
import DossierNavigation from "@/app/dossier/DossierNavigation";
import DependenciesSection from "@/app/dossier/DependenciesSection";
import CapabilitiesSection, { normalizeCapabilities } from "@/app/dossier/CapabilitiesSection";
import FilesSection from "@/app/dossier/FilesSection";
import PublisherSection from "@/app/dossier/PublisherSection";
import VersionsSection from "@/app/dossier/VersionsSection";
import CoverageSection from "@/app/dossier/CoverageSection";
import ReadmeSection from "@/app/dossier/ReadmeSection";
import ProvenanceSection from "@/app/dossier/ProvenanceSection";
import RawEvidenceSection from "@/app/dossier/RawEvidenceSection";
import AlertsSection from "@/app/dossier/AlertsSection";
import ChangesSection from "@/app/dossier/ChangesSection";
import OverviewSection from "@/app/dossier/OverviewSection";
import { benchmarkValidation } from "@/lib/benchmarkLookup";
import { displayedDecision, requiresReview } from "@/lib/classificationContract";
import type { ExtensionDossierData } from "@/lib/reportContract";

type RecordValue = Record<string, unknown>;
type Section =
  | "overview"
  | "readme"
  | "changes"
  | "alerts"
  | "capabilities"
  | "dependencies"
  | "files"
  | "versions"
  | "publisher"
  | "provenance"
  | "coverage"
  | "raw";
type Props = { data: ExtensionDossierData };

const sections: Array<{ id: Section; label: string; icon: typeof Radar }> = [
  { id: "overview", label: "Overview", icon: Radar },
  { id: "readme", label: "README", icon: FileText },
  { id: "changes", label: "What changed", icon: GitCompareArrows },
  { id: "alerts", label: "Evidence", icon: AlertTriangle },
  { id: "capabilities", label: "Capabilities", icon: Waypoints },
  { id: "dependencies", label: "Dependencies", icon: Package },
  { id: "files", label: "Files", icon: FolderTree },
  { id: "versions", label: "Versions", icon: GitCompareArrows },
  { id: "publisher", label: "Publisher", icon: UserRound },
  { id: "provenance", label: "Provenance", icon: Fingerprint },
  { id: "coverage", label: "Coverage", icon: ShieldCheck },
  { id: "raw", label: "Raw evidence", icon: Terminal },
];

export default function ExtensionDossier({ data }: Props) {
  const { id, version, extension, versions, scan, findings, files, dependencies } = data;
  const [active, setActive] = useState<Section>("overview");
  const decision = displayedDecision(scan);
  const capabilities = normalizeCapabilities(scan.capabilities);
  const grouped = useMemo(() => groupFindings(findings), [findings]);
  const actionableGroups = grouped.filter((group) =>
    requiresReview(group.actionability),
  );
  const lowGroups = grouped.filter((group) => group.actionability === "low");
  const contextualGroups = grouped.filter(
    (group) => group.actionability === "contextual",
  );
  const validation =
    scan.scan_purpose === "benchmark"
      ? benchmarkValidation(id, version, String(scan.artifact_sha256 || ""))
      : null;
  const badgeCount = (section: Section) =>
    section === "alerts"
      ? actionableGroups.length + lowGroups.length
      : section === "capabilities"
        ? Object.keys(capabilities).length
        : section === "dependencies"
          ? dependencies.length
          : section === "files"
            ? files.length
            : section === "versions"
              ? versions.length
              : 0;
  useEffect(() => {
    const selectHash = () => {
      const section = window.location.hash.slice(1) as Section;
      if (sections.some((item) => item.id === section)) setActive(section);
    };
    selectHash();
    window.addEventListener("hashchange", selectHash);
    return () => window.removeEventListener("hashchange", selectHash);
  }, []);
  return (
    <main className="dossierPage">
      <DossierHeader id={id} version={version} extension={extension} scan={scan} />
      {validation ? (
        <Link className="dossierValidated" href="/benchmark">
          <span className="dossierValidatedMark">
            <BadgeCheck aria-hidden="true" />
          </span>
          <div>
            <span>Frozen regression fixture</span>
            <strong>
              This exact artifact is in the GuardRails regression corpus.
            </strong>
            <p>
              Hash-pinned as a {validation.classification.replaceAll("-", " ")}{" "}
              case. The exact artifact identity matches the frozen cohort; the
              current decision above comes only from this scan&apos;s evidence.
            </p>
          </div>
          <ChevronRight aria-hidden="true" />
        </Link>
      ) : null}
      <div className="dossierMeta">
        <span>{String(extension.publisher || "Not reported")}</span>
        <span>{String(extension.registry || "Registry not reported")}</span>
        <span>
          Artifact{" "}
          <code>
            {String(scan.artifact_sha256 || "unavailable").slice(0, 16)}
          </code>
        </span>
      </div>
      <div className="dossierLayout">
        <DossierNavigation items={sections} active={active} count={badgeCount} onSelect={setActive} />
        <section className="dossierContent">
          {active === "overview" ? (
            <OverviewSection
              decision={decision}
              scan={scan}
              actionableGroups={actionableGroups}
              noteGroups={[...lowGroups, ...contextualGroups]}
              capabilities={capabilities}
              onOpenAlerts={() => {
                setActive("alerts");
                window.history.pushState(null, "", "#alerts");
              }}
            />
          ) : null}
          {active === "readme" ? (
            <ReadmeSection
              id={id}
              version={version}
              scanId={String(scan.id || "")}
              files={files}
            />
          ) : null}
          {active === "changes" ? (
            <ChangesSection id={id} current={version} versions={versions} />
          ) : null}
          {active === "alerts" ? (
            <AlertsSection
              actionableGroups={actionableGroups}
              lowGroups={lowGroups}
              contextualGroups={contextualGroups}
            />
          ) : null}
          {active === "capabilities" ? (
            <CapabilitiesSection capabilities={capabilities} />
          ) : null}
          {active === "dependencies" ? <DependenciesSection dependencies={dependencies} /> : null}
          {active === "files" ? (
            <FilesSection
              id={id}
              version={version}
              scanId={String(scan.id || "")}
              files={files}
            />
          ) : null}
          {active === "versions" ? (
            <VersionsSection versions={versions} current={version} />
          ) : null}
          {active === "publisher" ? (
            <PublisherSection extension={extension} files={files} />
          ) : null}
          {active === "provenance" ? <ProvenanceSection scan={scan} /> : null}
          {active === "coverage" ? <CoverageSection scan={scan} /> : null}
          {active === "raw" ? <RawEvidenceSection scan={scan} findings={findings} /> : null}
        </section>
      </div>
    </main>
  );
}

type Group = {
  rule: string;
  summary: string;
  severity: string;
  count: number;
  locations: string[];
  actionability: string;
  evidenceClasses: string[];
};
function groupFindings(findings: RecordValue[]): Group[] {
  const groups = new Map<string, Group>();
  for (const item of findings) {
    const rule = String(item.rule_id || "observed-capability");
    const current = groups.get(rule);
    const findingSeverity = normalizedSeverity(
      String(item.effective_severity || item.severity || "INFO"),
    );
    const actionability = String(item.actionability || "contextual");
    const evidenceClass = String(
      item.evidence_class ||
        (item.evidence as RecordValue | undefined)?.evidence_class ||
        "weak",
    );
    const locations = Array.isArray(item.file_refs)
      ? item.file_refs.map(String)
      : [];
    if (current) {
      current.count += 1;
      current.severity =
        severityRank(findingSeverity) > severityRank(current.severity)
          ? findingSeverity
          : current.severity;
      current.actionability =
        actionabilityRank(actionability) >
        actionabilityRank(current.actionability)
          ? actionability
          : current.actionability;
      for (const location of locations)
        if (!current.locations.includes(location))
          current.locations.push(location);
      if (!current.evidenceClasses.includes(evidenceClass))
        current.evidenceClasses.push(evidenceClass);
    } else
      groups.set(rule, {
        rule,
        summary: String(
          item.summary || item.evidence_summary || rule.replaceAll("-", " "),
        ),
        severity: findingSeverity,
        count: 1,
        locations,
        actionability,
        evidenceClasses: [evidenceClass],
      });
  }
  return [...groups.values()].sort(
    (a, b) =>
      actionabilityRank(b.actionability) - actionabilityRank(a.actionability) ||
      severityRank(b.severity) - severityRank(a.severity) ||
      b.count - a.count,
  );
}
function normalizedSeverity(value: string) {
  return ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].includes(
    value.toUpperCase(),
  )
    ? value.toUpperCase()
    : "INFO";
}
function severityRank(value: string) {
  return (
    (
      { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 } as Record<
        string,
        number
      >
    )[value] || 0
  );
}
function actionabilityRank(value: string) {
  return (
    (
      { block: 5, investigate: 4, review: 3, low: 2, contextual: 1 } as Record<
        string,
        number
      >
    )[value] || 1
  );
}
