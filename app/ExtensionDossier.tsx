"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  Boxes,
  ChevronRight,
  CircleCheck,
  FileCode2,
  FileText,
  Fingerprint,
  FolderTree,
  GitCompareArrows,
  Network,
  Package,
  Radar,
  ShieldCheck,
  Terminal,
  UserRound,
  Waypoints,
} from "lucide-react";
import DossierHeader from "@/app/dossier/DossierHeader";
import SeverityGauge from "@/app/SeverityGauge";
import Markdown from "@/app/Markdown";
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
  selectPackagedReadme,
} from "@/lib/dossierPresentation";
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
        <aside
          className="dossierRail"
          aria-label="Extension intelligence sections"
        >
          <strong>Extension intelligence</strong>
          {sections.map(({ id: section, label, icon: Icon }) => (
            <a
              key={section}
              href={`#${section}`}
              className={active === section ? "active" : ""}
              aria-current={active === section ? "page" : undefined}
              title={label}
              onClick={() => setActive(section)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
              {badgeCount(section) ? <b>{badgeCount(section)}</b> : null}
            </a>
          ))}
        </aside>
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
            <Readme
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
            <Alerts
              actionableGroups={actionableGroups}
              lowGroups={lowGroups}
              contextualGroups={contextualGroups}
            />
          ) : null}
          {active === "capabilities" ? (
            <Capabilities capabilities={capabilities} />
          ) : null}
          {active === "dependencies" ? (
            <Dependencies dependencies={dependencies} />
          ) : null}
          {active === "files" ? (
            <Files
              id={id}
              version={version}
              scanId={String(scan.id || "")}
              files={files}
            />
          ) : null}
          {active === "versions" ? (
            <Versions versions={versions} current={version} />
          ) : null}
          {active === "publisher" ? (
            <Publisher extension={extension} files={files} />
          ) : null}
          {active === "provenance" ? <Provenance scan={scan} /> : null}
          {active === "coverage" ? <Coverage scan={scan} /> : null}
          {active === "raw" ? <Raw scan={scan} findings={findings} /> : null}
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
  scan: RecordValue;
  actionableGroups: Group[];
  noteGroups: Group[];
  capabilities: Record<string, RecordValue>;
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
        <article className="identityCard">
          <Fingerprint />
          <span>Exact artifact</span>
          <code>{String(scan.artifact_sha256 || "unavailable")}</code>
          <p>
            Build {String(scan.scanner_build || "not recorded").slice(0, 12)} ·
            ruleset {String(scan.ruleset_version || "not recorded")}
          </p>
        </article>
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
function Alerts({
  actionableGroups,
  lowGroups,
  contextualGroups,
}: {
  actionableGroups: Group[];
  lowGroups: Group[];
  contextualGroups: Group[];
}) {
  return (
    <>
      <SectionHead
        eyebrow="Evidence"
        title="Evidence, grouped by behavior"
        detail="Repeated locations are one behavior group. Expand a group to inspect every recorded location and evidence class."
      />
      {actionableGroups.length ? (
        <div className="dossierRows">
          {actionableGroups.map((group) => (
            <EvidenceGroup key={group.rule} group={group} />
          ))}
        </div>
      ) : (
        <Empty text="No behavior group requires review under the completed policy." />
      )}
      {lowGroups.length ? (
        <details className="contextEvidence">
          <summary>
            {lowGroups.length} low-severity hardening note
            {lowGroups.length === 1 ? "" : "s"} — visible but non-blocking
          </summary>
          <div className="dossierRows">
            {lowGroups.map((group) => (
              <EvidenceGroup key={group.rule} group={group} />
            ))}
          </div>
        </details>
      ) : null}
      {contextualGroups.length ? (
        <details className="contextEvidence">
          <summary>
            {contextualGroups.length} contextual behavior group
            {contextualGroups.length === 1 ? "" : "s"} — not standalone security
            evidence
          </summary>
          <div className="dossierRows">
            {contextualGroups.map((group) => (
              <EvidenceGroup key={group.rule} group={group} />
            ))}
          </div>
        </details>
      ) : null}
    </>
  );
}
function EvidenceGroup({
  group,
  open = false,
}: {
  group: Group;
  open?: boolean;
}) {
  return (
    <details className="ds-evidence" open={open}>
      <summary>
        <span className={`ds-pill ${pillVariant(group.severity)}`}>
          {displaySeverity(group.severity)}
        </span>
        <div className="ds-evidence-body">
          <strong>{group.summary}</strong>
          <p>
            {group.count} observed location{group.count === 1 ? "" : "s"} ·{" "}
            {actionabilityLabel(group.actionability)}
          </p>
          <code>
            {group.rule} · {group.evidenceClasses.join(", ")} evidence
          </code>
        </div>
        <ChevronRight className="ds-evidence-chevron" />
      </summary>
      <div className="ds-evidence-locations">
        <p>
          {group.count} observation{group.count === 1 ? "" : "s"}. Every
          recorded location is listed below.
        </p>
        {group.locations.length ? (
          group.locations.map((location) => (
            <code key={location}>{location}</code>
          ))
        ) : (
          <small>No file location was recorded.</small>
        )}
      </div>
    </details>
  );
}
function Capabilities({
  capabilities,
}: {
  capabilities: Record<string, RecordValue>;
}) {
  const entries = Object.entries(capabilities);
  return (
    <>
      <SectionHead
        eyebrow="Capability map"
        title="What this extension can access"
        detail="Capabilities describe power, not malicious intent. Compare each one to the extension's stated purpose."
      />
      {entries.length ? (
        <div className="dossierCapabilityGrid">
          {entries.map(([key, value]) => (
            <article key={key}>
              {capabilityIcon(key)}
              <div>
                <strong>{key.replaceAll("_", " ")}</strong>
                <p>
                  {Array.isArray(value.evidence)
                    ? `${value.evidence.length} evidence location(s)`
                    : "Declared or detected capability"}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty text="No capability families were recorded by this scan." />
      )}
    </>
  );
}
function Dependencies({ dependencies }: { dependencies: RecordValue[] }) {
  return (
    <>
      <SectionHead
        eyebrow="Supply chain"
        title="Runtime dependencies"
        detail="Packages are tied to this exact artifact, not to the repository in general."
      />
      {dependencies.length ? (
        <div className="dossierTable">
          <div>
            <span>Package</span>
            <span>Version</span>
            <span>Relationship</span>
            <span>Advisories</span>
          </div>
          {dependencies.map((item) => (
            <article key={`${item.name}@${item.version}`}>
              <strong>{String(item.name)}</strong>
              <code>{String(item.version)}</code>
              <span>{String(item.relationship || "runtime")}</span>
              <span>
                {Array.isArray(item.advisories) ? item.advisories.length : 0}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <Empty text="No runtime dependencies were reported for this artifact." />
      )}
    </>
  );
}
function Files({
  id,
  version,
  scanId,
  files,
}: {
  id: string;
  version: string;
  scanId: string;
  files: RecordValue[];
}) {
  const [preview, setPreview] = useState<{
    path: string;
    content: string;
    sha256?: string;
    truncated?: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  async function open(path: string) {
    setLoading(path);
    setError("");
    try {
      const response = await fetch(
        `/api/extensions/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/source?path=${encodeURIComponent(path)}&scan=${encodeURIComponent(scanId)}`,
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        return setError(String(body.error || "Preview is unavailable."));
      setPreview({
        path,
        content: String(body.content || ""),
        sha256: String(body.content_sha256 || ""),
        truncated: Boolean(body.truncated),
      });
    } catch {
      setError("Preview could not be loaded. Try again.");
    } finally {
      setLoading("");
    }
  }
  return (
    <>
      <SectionHead
        eyebrow="Artifact files"
        title="Files captured in this exact artifact"
        detail="Preview is available only when this report retained a verified text snapshot."
      />
      {files.length ? (
        <div className="dossierFiles">
          <div>
            <span>/</span>
            <span>{files.length} files</span>
          </div>
          {files.slice(0, 500).map((item) => {
            const path = String(item.path);
            const available = item.preview_available === true;
            return (
              <Fragment key={path}>
                <article
                  className={preview?.path === path ? "previewOpen" : ""}
                >
                  <FileCode2 />
                  <code>{path}</code>
                  <span>{formatBytes(Number(item.size_bytes || 0))}</span>
                  <small>{String(item.sha256 || "").slice(0, 12)}</small>
                  {available ? (
                    <button
                      type="button"
                      onClick={() => void open(path)}
                      disabled={loading === path}
                    >
                      {loading === path
                        ? "Loading…"
                        : preview?.path === path
                          ? "Refresh"
                          : "Preview"}
                    </button>
                  ) : (
                    <em>Not captured</em>
                  )}
                </article>
                {preview?.path === path ? (
                  <section className="sourcePreview inlineSourcePreview">
                    <header>
                      <strong>{preview.path}</strong>
                      <span>
                        {preview.truncated
                          ? "Truncated snapshot"
                          : "Verified snapshot"}{" "}
                        · {preview.sha256?.slice(0, 12)}
                      </span>
                      <button type="button" onClick={() => setPreview(null)}>
                        Close
                      </button>
                    </header>
                    <pre>{preview.content}</pre>
                  </section>
                ) : null}
              </Fragment>
            );
          })}
        </div>
      ) : (
        <Empty text="The file inventory was not emitted by this scan." />
      )}
      {error ? <p className="previewError">{error}</p> : null}
    </>
  );
}
function Versions({
  versions,
  current,
}: {
  versions: RecordValue[];
  current: string;
}) {
  return (
    <>
      <SectionHead
        eyebrow="Release history"
        title="Published versions"
        detail="Each decision belongs to an immutable version and exact artifact hash."
      />
      <div className="dossierTable versionTable">
        <div>
          <span>Version</span>
          <span>Artifact scope</span>
          <span>Decision</span>
          <span />
        </div>
        {versions.map((item) => {
          const decision = versionDecision(item.decision);
          return (
            <article
              key={String(item.version)}
              className={String(item.version) === current ? "current" : ""}
            >
              <strong>{String(item.version)}</strong>
              <span>Exact version</span>
              <span
                className={`decisionTechnical ${decision.toLowerCase().replaceAll(" ", "-")}`}
              >
                {decision}
              </span>
              <span>
                {String(item.version) === current ? "Current" : "Recorded"}
              </span>
            </article>
          );
        })}
      </div>
    </>
  );
}
function Publisher({
  extension,
  files,
}: {
  extension: RecordValue;
  files: RecordValue[];
}) {
  const readme = selectPackagedReadme(files);
  return (
    <>
      <SectionHead
        eyebrow="Package information"
        title="Publisher and package context"
        detail="Identity and popularity establish context. They do not override artifact evidence."
      />
      <div className="publisherGrid">
        <article>
          <UserRound />
          <span>Publisher</span>
          <strong>{String(extension.publisher || "Not reported")}</strong>
          <p>
            {extension.publisher_verified
              ? "Registry reports a verified publisher."
              : "Registry does not report publisher verification."}
          </p>
        </article>
        <article>
          <Package />
          <span>Package</span>
          <strong>{String(extension.id || "Not reported")}</strong>
          <p>{String(extension.registry || "Registry not reported")}</p>
        </article>
        <article>
          <BadgeCheck />
          <span>Marketplace context</span>
          <strong>
            {Number(extension.installs || 0).toLocaleString()} installs
          </strong>
          <p>Rating {String(extension.rating || "not reported")}</p>
        </article>
        <article>
          <FileCode2 />
          <span>Documentation</span>
          <strong>{readme ? "README packaged" : "README not packaged"}</strong>
          <p>
            {String(
              extension.description ||
                "No Marketplace description was reported.",
            )}
          </p>
        </article>
      </div>
    </>
  );
}
function Provenance({ scan }: { scan: RecordValue }) {
  return (
    <>
      <SectionHead
        eyebrow="Provenance"
        title="Exact artifact identity"
        detail="This is the evidence boundary for the report. A publisher name or repository cannot substitute for it."
      />
      <div className="provenanceList">
        <Fact
          label="Artifact SHA-256"
          value={String(scan.artifact_sha256 || "Not recorded")}
        />
        <Fact
          label="Scanner build"
          value={String(scan.scanner_build || "Not recorded")}
        />
        <Fact
          label="Ruleset"
          value={String(scan.ruleset_version || "Not recorded")}
        />
        <Fact label="Scanner profile" value={String(scan.profile || "deep")} />
        <Fact
          label="VSIX signature"
          value={String(
            (scan.artifacts as RecordValue | undefined)?.vsix_signature
              ? "Recorded in artifact evidence"
              : "Not reported",
          )}
        />
      </div>
    </>
  );
}
function Coverage({ scan }: { scan: RecordValue }) {
  const providers = (scan.provider_coverage || {}) as Record<
    string,
    RecordValue
  >;
  const coverage = (scan.analysis_coverage || {}) as RecordValue;
  const inventory = (scan.artifact_inventory || {}) as RecordValue;
  const declared = arrayLength(coverage.declared_entrypoints);
  const resolved = arrayLength(coverage.resolved_entrypoints);
  const executable = arrayLength(coverage.executable_candidates);
  const files = arrayLength(inventory.files);
  const presentation = coveragePresentation(scan);
  return (
    <>
      <SectionHead
        eyebrow="Analysis boundary"
        title="What was actually assessed"
        detail="Coverage shows the artifact scope behind this report. It is not a claim that the extension is safe."
      />
      <div className="coverageGrid coverageExplained">
        <Fact
          label={presentation.label}
          value={`${presentation.percent}%`}
          detail={presentation.providerDetail}
        />
        <Fact
          label="Declared entrypoints"
          value={String(declared)}
          detail={
            declared
              ? "Declared by the extension manifest"
              : "No launch entrypoints were declared"
          }
        />
        <Fact
          label="Resolved entrypoints"
          value={String(resolved)}
          detail={
            resolved
              ? "Entrypoints found in this exact artifact"
              : "No declared entrypoint resolved to a file"
          }
        />
        <Fact
          label="Executable candidates"
          value={String(executable)}
          detail={
            executable
              ? "Files selected for executable analysis"
              : files
                ? "No executable candidate was recorded by this scanner"
                : "Artifact file inventory was not emitted"
          }
        />
      </div>
      <div className="providerGrid coverageProviders">
        {Object.entries(providers).map(([name, value]) => (
          <article key={name}>
            <span>{name.replaceAll("_", " ")}</span>
            <strong>{String(value.status || "not assessed")}</strong>
            <p>
              {Number(value.finding_count || 0)} normalized finding
              {Number(value.finding_count || 0) === 1 ? "" : "s"}
            </p>
          </article>
        ))}
      </div>
      {!Object.keys(providers).length ? (
        <div className="coverageNoProviders">
          No analyzer-provider records were supplied with this report.
        </div>
      ) : null}
    </>
  );
}
function Raw({
  scan,
  findings,
}: {
  scan: RecordValue;
  findings: RecordValue[];
}) {
  return (
    <>
      <SectionHead
        eyebrow="Technical evidence"
        title="Raw scanner fields"
        detail="Manifests, hashes, and normalized JSON are available here so they do not compete with the decision summary."
      />
      <pre className="rawEvidence">
        {JSON.stringify({ scan, findings }, null, 2)}
      </pre>
    </>
  );
}
function Readme({
  id,
  version,
  scanId,
  files,
}: {
  id: string;
  version: string;
  scanId: string;
  files: RecordValue[];
}) {
  const readme = selectPackagedReadme(files);
  const readmePath = readme ? String(readme.path) : "";
  const previewable = Boolean(readme && readme.preview_available === true);
  const [source, setSource] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  useEffect(() => {
    if (!previewable || !readmePath) return;
    const timer = window.setTimeout(() => {
      setState("loading");
      void fetch(
        `/api/extensions/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/source?path=${encodeURIComponent(readmePath)}&scan=${encodeURIComponent(scanId)}`,
      )
        .then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (!response.ok)
            throw new Error(String(body.error || "README unavailable."));
          setSource(String(body.content || ""));
          setState("idle");
        })
        .catch(() => setState("error"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, version, scanId, readmePath, previewable]);
  return (
    <>
      <SectionHead
        eyebrow="Documentation"
        title="Publisher README"
        detail="Rendered from the README packaged inside this exact artifact — not fetched live from the Marketplace."
      />
      {!readme ? (
        <Empty text="No README was packaged inside this exact artifact." />
      ) : !previewable ? (
        <div className="ds-readme-empty">
          <FileText />
          <strong>README packaged but not captured</strong>
          <p>This scan did not retain a verified text snapshot of the packaged README.</p>
        </div>
      ) : state === "loading" ? (
        <div className="dossierEmpty">
          <p>Loading README…</p>
        </div>
      ) : state === "error" ? (
        <p className="previewError">The README could not be loaded.</p>
      ) : source ? (
        <article className="ds-card ds-readme">
          <Markdown source={source} />
        </article>
      ) : (
        <Empty text="The README snapshot was empty." />
      )}
    </>
  );
}
function SectionHead({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <header className="dossierHead">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{detail}</p>
    </header>
  );
}
function ScoreStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  const score = Math.max(0, Math.min(100, value));
  return (
    <article className="scoreStat">
      <span>{label}</span>
      <div className="scoreRing">
        <svg viewBox="0 0 42 42" aria-hidden="true">
          <circle cx="21" cy="21" r="17" />
          <circle
            className="scoreRingValue"
            cx="21"
            cy="21"
            r="17"
            pathLength="100"
            strokeDasharray={`${score} 100`}
          />
        </svg>
        <strong>{score}</strong>
      </div>
      <p>{detail}</p>
    </article>
  );
}
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
function versionDecision(value: unknown) {
  const decision = String(value || "").toLowerCase();
  return decision === "allow"
    ? "ALLOW"
    : decision === "review"
      ? "REVIEW"
      : decision === "block"
        ? "BLOCK"
        : decision === "incomplete"
          ? "INCOMPLETE"
          : "NOT ANALYZED";
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
function capabilityIcon(key: string) {
  if (key.includes("network")) return <Network />;
  if (key.includes("shell") || key.includes("process")) return <Terminal />;
  if (key.includes("dependency")) return <Package />;
  return <Boxes />;
}
function formatBytes(value: number) {
  return value < 1024
    ? `${value} B`
    : value < 1024 ** 2
      ? `${(value / 1024).toFixed(1)} KB`
      : `${(value / 1024 ** 2).toFixed(1)} MB`;
}
function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}
function normalizeCapabilities(value: unknown): Record<string, RecordValue> {
  if (Array.isArray(value))
    return Object.fromEntries(
      value
        .filter(
          (item): item is RecordValue =>
            Boolean(item) && typeof item === "object" && !Array.isArray(item),
        )
        .map((item, index) => [String(item.id || `capability-${index}`), item]),
    );
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, RecordValue>)
    : {};
}
