"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  CircleCheck,
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
import DecisionSummary from "@/app/dossier/DecisionSummary";
import DossierNavigation from "@/app/dossier/DossierNavigation";
import ReportIdentityPanel from "@/app/dossier/ReportIdentityPanel";
import DossierSectionHead from "@/app/dossier/DossierSectionHead";
import ScoreStat from "@/app/dossier/ScoreStat";
import DependenciesSection from "@/app/dossier/DependenciesSection";
import CapabilitiesSection, { normalizeCapabilities, type CapabilityRecord } from "@/app/dossier/CapabilitiesSection";
import FilesSection from "@/app/dossier/FilesSection";
import PublisherSection from "@/app/dossier/PublisherSection";
import VersionsSection from "@/app/dossier/VersionsSection";
import CoverageSection from "@/app/dossier/CoverageSection";
import ReadmeSection from "@/app/dossier/ReadmeSection";
import ProvenanceSection from "@/app/dossier/ProvenanceSection";
import RawEvidenceSection from "@/app/dossier/RawEvidenceSection";
import AlertsSection from "@/app/dossier/AlertsSection";
import SeverityGauge from "@/app/SeverityGauge";
import { benchmarkValidation } from "@/lib/benchmarkLookup";
import {
  coveragePresentation,
  displayedDecision,
  requiresReview,
} from "@/lib/classificationContract";
import {
  decisionExplanation,
  decisionHeadline,
  decisionLabel,
  evidenceSectionLabel,
  outcomeGroupSummary,
} from "@/lib/dossierPresentation";
import type { ExtensionDossierData, ReportScan } from "@/lib/reportContract";

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
            <Overview
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
            <Changes id={id} current={version} versions={versions} />
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

function Overview({
  decision,
  scan,
  actionableGroups,
  noteGroups,
  capabilities,
  onOpenAlerts,
}: {
  decision: string;
  scan: ReportScan;
  actionableGroups: Group[];
  noteGroups: Group[];
  capabilities: Record<string, CapabilityRecord>;
  onOpenAlerts: () => void;
}) {
  const malware = Number(scan.malware_score || 0);
  const risk = Number(scan.risk_score || 0);
  const legacyScore = String(scan.score_schema_version || "1") === "1";
  const coverage = coveragePresentation(scan);
  const canonicalReason = String(scan.decision_reason || decisionExplanation(decision));
  const gaugeValue = Math.max(malware, risk);
  const gaugeBand =
    decision === "block"
      ? "high"
      : decision === "review"
        ? "mid"
        : decision === "allow"
          ? "low"
          : "info";
  return (
    <>
      <SectionHead
        eyebrow="Security brief"
        title={decisionHeadline(decision)}
        detail={
          decision === "allow"
            ? "Required analysis completed without evidence that crosses the active review policy."
            : decision === "block"
              ? "Inspect the evidence that supports this do-not-install policy decision."
            : decision === "incomplete" || decision === "failed"
              ? canonicalReason
              : "Review the grouped evidence, affected locations, and whether each behavior matches the extension’s purpose."
        }
      />
      <DecisionSummary decision={decision} scan={scan} />
      <div className="overviewLede">
        <div className="overviewGauge">
          <SeverityGauge
            value={gaugeValue}
            label={decisionLabel(decision)}
            band={gaugeBand}
            caption="Diagnostic risk index for this exact artifact — not a probability of malice."
          />
        </div>
        <div className="reportSnapshot reportSnapshotExpanded">
          <article>
            <span>Outcome</span>
            <strong>{decisionLabel(decision)}</strong>
            <p>Policy result for this exact artifact</p>
          </article>
          <ScoreStat
            label={coverage.label}
            value={coverage.percent}
            detail={coverage.providerDetail}
          />
          <ScoreStat
            label={legacyScore ? "Legacy malware signal" : "Malware signal"}
            value={malware}
            detail={
              legacyScore
                ? "Static correlation; not confirmed malware"
                : "Diagnostic index, not probability"
            }
          />
          <article>
            <span>Evidence groups</span>
            <strong>{actionableGroups.length}</strong>
            <p>{noteGroups.length} contextual notes kept separate</p>
          </article>
          <article>
            <span>Capabilities</span>
            <strong>{Object.keys(capabilities).length}</strong>
            <p>Power describes access, not intent</p>
          </article>
        </div>
      </div>
      <div className="overviewGrid">
        <article className="whyCard">
          <span>Why this outcome</span>
          <h3>{outcomeGroupSummary(decision, actionableGroups.length)}</h3>
          <p>
            {canonicalReason}
          </p>
          <button type="button" onClick={onOpenAlerts}>
            Inspect all evidence <ChevronRight />
          </button>
        </article>
        <ReportIdentityPanel scan={scan} />
      </div>
      <section className="evidencePreview">
        <div>
          <span>{evidenceSectionLabel(decision)}</span>
          <button type="button" onClick={onOpenAlerts}>
            Open evidence <ChevronRight />
          </button>
        </div>
        {actionableGroups.slice(0, 3).map((group) => (
          <article key={group.rule} className="ds-evidence-preview">
            <span className={`ds-pill ${pillVariant(group.severity)}`}>
              {displaySeverity(group.severity)}
            </span>
            <div>
              <strong>{group.summary}</strong>
              <p>
                {group.count} observed location{group.count === 1 ? "" : "s"} ·{" "}
                {actionabilityLabel(group.actionability)}
              </p>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
function Changes({
  id,
  current,
  versions,
}: {
  id: string;
  current: string;
  versions: RecordValue[];
}) {
  const candidates = versions
    .map((item) => String(item.version || ""))
    .filter((item) => item && item !== current);
  const [baseline, setBaseline] = useState(candidates[0] || "");
  const [result, setResult] = useState<RecordValue | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  useEffect(() => {
    if (!baseline) return;
    const timer = window.setTimeout(() => {
      setState("loading");
      void fetch(
        `/api/extensions/${encodeURIComponent(id)}/compare?from=${encodeURIComponent(baseline)}&to=${encodeURIComponent(current)}`,
      )
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok)
            throw new Error(String(body.error || "Comparison failed."));
          setResult(body);
          setState("idle");
        })
        .catch(() => setState("error"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [baseline, current, id]);
  const changes = (result?.changes || {}) as RecordValue;
  const side = (result?.to || {}) as RecordValue;
  const attribution = (result?.attribution || {}) as RecordValue;
  if (!candidates.length)
    return (
      <>
        <SectionHead
          eyebrow="Release changes"
          title="No second analyzed version yet"
          detail="A comparison appears only after two exact versions have normalized Deep Scan evidence."
        />
        <Empty text="Monitor this extension to analyze and compare its next release." />
      </>
    );
  const story = result?.comparable
    ? whyChanged(
        changes,
        baseline,
        current,
        Boolean(attribution.evidence_changes),
      )
    : [];
  return (
    <>
      <SectionHead
        eyebrow="Why this changed"
        title={`What changed in ${current}`}
        detail="Plain-language summary of the difference from the last reviewed release, computed from two stored scan records — not inferred from version numbers or marketing copy."
      />
      <label className="comparisonPicker">
        <span>Compare against last reviewed</span>
        <select
          value={baseline}
          onChange={(event) => setBaseline(event.target.value)}
        >
          {candidates.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      {state === "loading" ? (
        <div className="dossierEmpty">
          <p>Computing normalized evidence changes…</p>
        </div>
      ) : null}
      {state === "error" ? (
        <div className="previewError">
          The comparison could not be generated.
        </div>
      ) : null}
      {result && result.comparable === false ? (
        <div className="comparisonUnavailable">
          <AlertTriangle />
          <strong>Not comparable yet</strong>
          <p>
            {String(
              result.reason ||
                "Both versions require completed Deep Scan evidence.",
            )}
          </p>
        </div>
      ) : null}
      {result?.comparable ? (
        <div className="changeDashboard">
          {story.length ? (
            <div className="whyStory">
              <span className="whyStoryEyebrow">
                <GitCompareArrows /> {baseline} → {current}
              </span>
              <ul>
                {story.map((line, index) => (
                  <li key={index} className={`whyLine ${line.tone}`}>
                    <span className="whyLineIcon">
                      {line.tone === "up" ? (
                        <AlertTriangle />
                      ) : line.tone === "down" ? (
                        <CircleCheck />
                      ) : (
                        <GitCompareArrows />
                      )}
                    </span>
                    <p>{line.text}</p>
                  </li>
                ))}
              </ul>
              <p className="whyStoryFoot">
                Expand any group below to see the exact files and evidence
                behind each line.
              </p>
            </div>
          ) : (
            <div className="whyStory whyStoryQuiet">
              <span className="whyStoryEyebrow">
                <CircleCheck /> {baseline} → {current}
              </span>
              <p>
                No decision-relevant differences were detected between these two
                analyzed releases.
              </p>
            </div>
          )}
          {!attribution.evidence_changes ? (
            <div className="comparisonUnavailable">
              <AlertTriangle />
              <strong>Mixed analysis baseline</strong>
              <p>{String(attribution.note)}</p>
            </div>
          ) : null}
          <div className="changeSummary">
            <Fact
              label="Current outcome"
              value={String(side.decision || "unknown").toUpperCase()}
            />
            <Fact
              label="Coverage"
              value={`${Number(side.coverage_percent || 0)}%`}
            />
            <Fact label="Findings" value={String(side.findings || 0)} />
            <Fact label="Files" value={String(side.files || 0)} />
          </div>
          {attribution.evidence_changes ? (
            <>
              <ChangeGroup title="Findings" value={changes.findings} />
              <ChangeGroup title="Capabilities" value={changes.capabilities} />
            </>
          ) : null}
          <ChangeGroup title="Dependencies" value={changes.dependencies} />
          <ChangeGroup title="Files" value={changes.files} />
        </div>
      ) : null}
    </>
  );
}
function ChangeGroup({ title, value }: { title: string; value: unknown }) {
  const data = (value || {}) as RecordValue;
  const entries = Object.entries(data).filter(
    ([, items]) => Array.isArray(items) && items.length,
  );
  return (
    <section className="changeGroup">
      <header>
        <strong>{title}</strong>
        <span>
          {entries.reduce(
            (count, [, items]) => count + (items as unknown[]).length,
            0,
          )}{" "}
          changes
        </span>
      </header>
      {entries.length ? (
        entries.map(([kind, items]) => (
          <details key={kind}>
            <summary>
              {kind} · {(items as unknown[]).length}
            </summary>
            <div>
              {(items as RecordValue[]).slice(0, 50).map((item, index) => (
                <code key={`${kind}-${index}`}>
                  {String(item.rule_id || item.path || item.name || item)}
                </code>
              ))}
            </div>
          </details>
        ))
      ) : (
        <p>No normalized {title.toLowerCase()} changes.</p>
      )}
    </section>
  );
}
const SectionHead = DossierSectionHead;
function Fact({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="dossierEmpty">
      <CircleCheck />
      <p>{text}</p>
    </div>
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
function displaySeverity(value: string) {
  return value === "INFO" ? "INFORMATIONAL" : value;
}
function pillVariant(severity: string) {
  const rank = severityRank(severity);
  return rank >= 4
    ? "block"
    : rank === 3
      ? "review"
      : rank === 2
        ? "info"
        : "allow";
}
type WhyLine = { text: string; tone: "up" | "down" | "flat" };
const CAPABILITY_PHRASES: Record<string, string> = {
  network: "network access",
  outbound_network: "outbound network access",
  filesystem: "filesystem access",
  file_write: "the ability to write files",
  shell: "shell or command execution",
  process: "process spawning",
  process_exec: "process execution",
  child_process: "child-process execution",
  environment: "access to environment variables",
  clipboard: "clipboard access",
  credentials: "access to stored credentials",
  activation: "its activation behavior",
};
function capabilityPhrase(key: string) {
  const normalized = key.toLowerCase();
  return CAPABILITY_PHRASES[normalized] || key.replaceAll("_", " ");
}
function humanList(items: string[]) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
function whyChanged(
  changes: RecordValue,
  from: string,
  to: string,
  evidenceComparable: boolean,
): WhyLine[] {
  const lines: WhyLine[] = [];
  const outcome = (changes.outcome || {}) as RecordValue;
  const decision = (outcome.decision || {}) as RecordValue;
  if (decision.changed) {
    const worse =
      severityRank(String(decision.to || "").toUpperCase()) >=
      severityRank(String(decision.from || "").toUpperCase());
    lines.push({
      text: `The security decision moved from ${String(decision.from || "unknown").toUpperCase()} to ${String(decision.to || "unknown").toUpperCase()}.`,
      tone: worse ? "up" : "down",
    });
  }
  if (evidenceComparable) {
    const caps = (changes.capabilities || {}) as RecordValue;
    const addedCaps = (Array.isArray(caps.added) ? caps.added : []).map((c) =>
      capabilityPhrase(String(c)),
    );
    const removedCaps = (Array.isArray(caps.removed) ? caps.removed : []).map(
      (c) => capabilityPhrase(String(c)),
    );
    if (addedCaps.length)
      lines.push({
        text: `The new version added ${humanList(addedCaps)}.`,
        tone: "up",
      });
    if (removedCaps.length)
      lines.push({
        text: `The new version no longer requests ${humanList(removedCaps)}.`,
        tone: "down",
      });
    const findings = (changes.findings || {}) as RecordValue;
    const addedFindings = Array.isArray(findings.added) ? findings.added : [];
    const removedFindings = Array.isArray(findings.removed)
      ? findings.removed
      : [];
    if (addedFindings.length)
      lines.push({
        text: `${addedFindings.length} new behavior finding${addedFindings.length === 1 ? "" : "s"} appeared, including "${String((addedFindings[0] as RecordValue).summary || (addedFindings[0] as RecordValue).rule_id)}".`,
        tone: "up",
      });
    if (removedFindings.length)
      lines.push({
        text: `${removedFindings.length} previously flagged finding${removedFindings.length === 1 ? " was" : "s were"} resolved.`,
        tone: "down",
      });
  }
  const deps = (changes.dependencies || {}) as RecordValue;
  const addedDeps = Array.isArray(deps.added) ? deps.added : [];
  const removedDeps = Array.isArray(deps.removed) ? deps.removed : [];
  if (addedDeps.length)
    lines.push({
      text: `${addedDeps.length} runtime ${addedDeps.length === 1 ? "dependency was" : "dependencies were"} added${addedDeps.length ? ` (${humanList(addedDeps.slice(0, 3).map((d) => String((d as RecordValue).name)))}${addedDeps.length > 3 ? ", …" : ""})` : ""}.`,
      tone: "up",
    });
  if (removedDeps.length)
    lines.push({
      text: `${removedDeps.length} runtime ${removedDeps.length === 1 ? "dependency was" : "dependencies were"} removed.`,
      tone: "down",
    });
  const files = (changes.files || {}) as RecordValue;
  const addedFiles = Array.isArray(files.added) ? files.added.length : 0;
  const removedFiles = Array.isArray(files.removed) ? files.removed.length : 0;
  const changedFiles = Array.isArray(files.changed) ? files.changed.length : 0;
  const fileBits: string[] = [];
  if (addedFiles) fileBits.push(`${addedFiles} added`);
  if (removedFiles) fileBits.push(`${removedFiles} removed`);
  if (changedFiles) fileBits.push(`${changedFiles} changed`);
  if (fileBits.length)
    lines.push({
      text: `The packaged artifact differs: ${humanList(fileBits)} file${addedFiles + removedFiles + changedFiles === 1 ? "" : "s"}.`,
      tone: "flat",
    });
  return lines;
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
function actionabilityLabel(value: string) {
  return value === "block"
    ? "block evidence"
    : value === "investigate"
      ? "investigation evidence"
      : value === "review"
        ? "review evidence"
        : value === "low"
          ? "low hardening note"
          : "contextual observation";
}
