"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Box,
  ChevronDown,
  CircleCheck,
  FileCode2,
  Package,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import IntelligenceScores from "@/app/IntelligenceScores";
import {
  canonicalAnalysisStatus,
  requiresReview,
} from "@/lib/classificationContract";
import { getImportedReport } from "@/lib/reportBundle";
import type {
  Decision,
  ExtensionDetail,
  ImportedReportBundle,
} from "@/lib/types";

export default function ReportExtensionPage({
  params,
}: {
  params: Promise<{ id: string; extensionId: string }>;
}) {
  const [report, setReport] = useState<ImportedReportBundle | null>(null);
  const [route, setRoute] = useState<{
    id: string;
    extensionId: string;
  } | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void params.then((value) => {
      const next = {
        id: value.id,
        extensionId: decodeURIComponent(value.extensionId),
      };
      setRoute(next);
      setReport(getImportedReport(value.id));
      setReady(true);
    });
  }, [params]);
  const detail = useMemo(() => {
    if (!report || !route) return null;
    const row = report.leaderboard.extensions.find(
      (x) => x.extension_id === route.extensionId,
    );
    return row?.detail_ref && report.details[row.detail_ref]
      ? report.details[row.detail_ref]
      : Object.values(report.details).find(
          (x) => x.extension_id === route.extensionId,
        ) || null;
  }, [report, route]);
  if (!ready)
    return (
      <main className="shell" aria-busy="true">
        <section className="pageHero compactHero">
          <div>
            <p className="eyebrow">Report</p>
            <h1>Opening report…</h1>
            <p className="heroCopy">Reading the exact artifact evidence.</p>
          </div>
        </section>
      </main>
    );
  if (!report || !route || !detail)
    return (
      <main className="shell">
        <section className="reportMissing">
          <ShieldAlert />
          <h1>Extension report unavailable</h1>
          <p>
            The imported browser report does not contain this extension detail.
          </p>
          <Link href="/scan">Open another report</Link>
        </section>
      </main>
    );
  const decision = securityDecision(detail),
    coverage = detail.analysis_coverage || {},
    findings = detail.findings || [],
    actionable = findings.filter((x) => requiresReview(x.actionability)),
    contextual = findings.filter((x) => !requiresReview(x.actionability)),
    groups = groupFindings(findings),
    capabilities = capabilitySummary(findings),
    identity = detail.artifact_identity || {},
    hash = String(
      identity.sha256 ||
        detail.artifact_sha256 ||
        detail.artifact_inventory?.package_hash ||
        "",
    );
  return (
    <main className="shell canonicalReport">
      <Link className="backLink" href={`/reports/${route.id}`}>
        <ArrowLeft /> Report inventory
      </Link>
      <header className="reportMast">
        <div>
          <span>Exact artifact intelligence</span>
          <h1>{detail.name || detail.extension_id}</h1>
          <code>
            {detail.extension_id}@{detail.version}
          </code>
          <p>{detail.decision_reason || detail.verdict_reason}</p>
        </div>
        <div className={`reportDecision ${decision}`}>
          <span>Install recommendation</span>
          <strong>{decisionLabel(decision)}</strong>
          <p>{decisionAction(decision)}</p>
        </div>
      </header>
      <div className="reportIdentity">
        <span>
          Publisher <strong>{detail.publisher || "Not reported"}</strong>
        </span>
        <span>
          Artifact{" "}
          <code>{hash ? `${hash.slice(0, 16)}…` : "Not recorded"}</code>
        </span>
        <span>
          Ruleset <strong>{report.metadata.ruleset_version}</strong>
        </span>
        <span>
          Coverage{" "}
          <strong>
            {coverage.coverage_percent ??
              (detail.scan_incomplete ? "Incomplete" : "Not reported")}
            {typeof coverage.coverage_percent === "number" ? "%" : ""}
          </strong>
        </span>
      </div>
      <div className="intelligenceLayout">
        <aside className="intelligenceNav">
          <strong>Extension intelligence</strong>
          {[
            ["overview", "Overview"],
            ["scores", "Security scores"],
            ["behavior", "Behavior"],
            ["alerts", "Alerts"],
            ["dependencies", "Dependencies"],
            ["coverage", "Coverage"],
            ["technical", "Technical evidence"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </aside>
        <div className="intelligenceContent">
          <section id="overview" className="reportBottomLine">
            <div>
              <span>Bottom line</span>
              <h2>{bottomLine(decision, actionable.length)}</h2>
              <p>{plainSummary(decision, actionable, contextual)}</p>
            </div>
            <div className="reportProof">
              <article>
                <strong>{detail.malware_score || 0}</strong>
                <span>malware evidence</span>
              </article>
              <article>
                <strong>{actionable.length}</strong>
                <span>actionable alerts</span>
              </article>
              <article>
                <strong>{contextual.length}</strong>
                <span>context notes</span>
              </article>
            </div>
          </section>
          <IntelligenceScores
            risk={detail.risk_score}
            malware={detail.malware_score}
            coverage={coverage.coverage_percent ?? detail.coverage_percent}
            dimensions={detail.security_dimensions || {}}
          />
          <section id="behavior" className="reportSection">
            <SectionHead
              eyebrow="Behavior"
              title="What this extension can do"
              detail="Capabilities describe access and power. They do not independently prove malicious intent."
            />
            <div className="behaviorCards">
              {capabilities.map((item) => (
                <article key={item.title}>
                  {item.icon}
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <span>
                      {item.count} supporting observation
                      {item.count === 1 ? "" : "s"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section id="alerts" className="reportSection">
            <SectionHead
              eyebrow="Evidence"
              title="What needs your attention"
              detail="Repeated locations are grouped so the behavior and reviewer action remain clear."
            />
            <div className="groupedAlertList">
              {groups.map((group) => (
                <details key={group.rule} open={group.actionable}>
                  <summary>
                    <span
                      className={`severity ${group.severity.toLowerCase()}`}
                    >
                      {group.severity}
                    </span>
                    <div>
                      <strong>{group.summary}</strong>
                      <p>
                        {group.rule.replaceAll("-", " ")} · {group.count}{" "}
                        location{group.count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ChevronDown />
                  </summary>
                  <div>
                    <p>
                      {group.actionable
                        ? "Confirm this behavior matches the extension's stated purpose before approval."
                        : "Contextual observation only. Do not treat this as standalone malware evidence."}
                    </p>
                    {group.locations.map((path) => (
                      <code key={path}>
                        <FileCode2 />
                        {path}
                      </code>
                    ))}
                  </div>
                </details>
              ))}
              {!groups.length ? (
                <div className="reportEmpty">
                  <CircleCheck />
                  <strong>No findings emitted</strong>
                  <p>
                    The recorded analyzers did not emit capability or abuse
                    evidence for this artifact.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
          <section id="dependencies" className="reportSection">
            <SectionHead
              eyebrow="Supply chain"
              title="Runtime dependencies"
              detail="Dependency presence and advisory status are tied to the scanned artifact."
            />
            <div className="dependencyReadable">
              {Object.entries(detail.dependencies || {}).map(
                ([name, version]) => (
                  <article key={name}>
                    <Package />
                    <strong>{name}</strong>
                    <code>{String(version)}</code>
                  </article>
                ),
              )}
              {!Object.keys(detail.dependencies || {}).length ? (
                <div className="reportEmpty">
                  <Package />
                  <strong>No runtime dependencies reported</strong>
                  <p>
                    This report may predate the structured dependency inventory.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
          <section id="coverage" className="reportSection">
            <SectionHead
              eyebrow="Analysis boundary"
              title="What was actually inspected"
              detail="Complete coverage means required analysis finished; it does not guarantee harmless behavior."
            />
            <div className="coverageReadable">
              <Fact
                label="Declared entrypoints"
                value={join(coverage.declared_entrypoints)}
              />
              <Fact
                label="Resolved entrypoints"
                value={join(coverage.resolved_entrypoints)}
              />
              <Fact
                label="Executable candidates"
                value={String(coverage.executable_candidates?.length ?? 0)}
              />
              <Fact
                label="Analyzed executables"
                value={String(coverage.analyzed_executable_files?.length ?? 0)}
              />
            </div>
            <div className="providerReadable">
              {Object.entries(coverage.providers || {}).map(([name, value]) => (
                <article key={name}>
                  <span>{name.replaceAll("_", " ")}</span>
                  <strong>{value.status || "unknown"}</strong>
                  <p>
                    {typeof value.finding_count === "number"
                      ? `${value.finding_count} normalized findings`
                      : "No count reported"}
                  </p>
                </article>
              ))}
            </div>
          </section>
          <section id="technical" className="reportSection technicalEvidence">
            <SectionHead
              eyebrow="For verification"
              title="Technical evidence"
              detail="Manifest and artifact inventory are available for reproducibility, not as the primary explanation."
            />
            <details>
              <summary>
                Manifest and provenance <ChevronDown />
              </summary>
              <dl>
                <dt>Publisher</dt>
                <dd>{detail.publisher || "Not reported"}</dd>
                <dt>Repository</dt>
                <dd>{detail.repository || "Not reported"}</dd>
                <dt>Source</dt>
                <dd>{detail.source || "Not reported"}</dd>
                <dt>Artifact SHA-256</dt>
                <dd>
                  <code>{hash || "Not recorded"}</code>
                </dd>
              </dl>
            </details>
            <details>
              <summary>
                Artifact inventory <ChevronDown />
              </summary>
              <pre>
                {JSON.stringify(detail.artifact_inventory || {}, null, 2)}
              </pre>
            </details>
          </section>
        </div>
      </div>
    </main>
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
    <header className="sectionLabel">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{detail}</p>
    </header>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
function join(v?: string[]) {
  return v?.length ? v.join(", ") : "None reported";
}
function securityDecision(d: ExtensionDetail): Decision {
  if (canonicalAnalysisStatus(d as unknown as Record<string, unknown>) !== "complete") return "incomplete";
  if (d.decision) return d.decision;
  if (d.verdict === "malicious") return "block";
  if (d.scan_incomplete) return "incomplete";
  if (d.verdict === "review" || d.verdict === "suspicious") return "review";
  return "allow";
}
function decisionLabel(d: Decision) {
  return d === "allow"
    ? "Analyzed · capabilities documented"
    : d === "review"
      ? "Attention · see findings"
      : d === "block"
        ? "Flagged by policy"
        : "Analysis pending";
}
function decisionAction(d: Decision) {
  return d === "allow"
    ? "No evidence crossed the active review policy."
    : d === "review"
      ? "Verify flagged behavior against publisher intent."
      : d === "block"
        ? "Your team's policy decides the outcome for this exact artifact."
        : "Restore required analyzer coverage before approval.";
}
function bottomLine(d: Decision, n: number) {
  return d === "allow"
    ? "No evidence currently requires review."
    : d === "review"
      ? `${n} behavior group${n === 1 ? "" : "s"} needs context before installation.`
      : d === "block"
        ? "This exact artifact should be blocked."
        : "The available analysis cannot support approval.";
}
function plainSummary(
  d: Decision,
  a: ExtensionDetail["findings"],
  c: ExtensionDetail["findings"],
) {
  if (d === "allow")
    return c.length
      ? `No actionable abuse evidence was emitted. ${c.length} contextual observation${c.length === 1 ? "" : "s"} describe capabilities or trust posture without changing the decision.`
      : "Required analysis completed without actionable evidence.";
  return a.length
    ? `${a.length} decision-relevant finding${a.length === 1 ? "" : "s"} should be verified against the extension's documented purpose.`
    : "Required analysis did not complete.";
}
function groupFindings(items: ExtensionDetail["findings"]) {
  const map = new Map<
    string,
    {
      rule: string;
      summary: string;
      severity: string;
      count: number;
      locations: string[];
      actionable: boolean;
    }
  >();
  for (const f of items) {
    const key = f.rule_id,
      current = map.get(key);
    if (current) {
      current.count++;
      for (const p of f.file_refs || [])
        if (!current.locations.includes(p)) current.locations.push(p);
      current.actionable ||= requiresReview(f.actionability);
      current.severity =
        severity(f.effective_severity || f.severity) > severity(current.severity)
          ? f.effective_severity || f.severity
          : current.severity;
    } else
      map.set(key, {
        rule: key,
        summary: f.evidence_summary,
        severity: f.effective_severity || f.severity,
        count: 1,
        locations: [...(f.file_refs || [])],
        actionable: requiresReview(f.actionability),
      });
  }
  return [...map.values()].sort(
    (a, b) =>
      Number(b.actionable) - Number(a.actionable) ||
      severity(b.severity) - severity(a.severity),
  );
}
function severity(s: string) {
  return (
    (
      { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 } as Record<
        string,
        number
      >
    )[s] || 0
  );
}
function capabilitySummary(items: ExtensionDetail["findings"]) {
  const rules = items.map((x) => x.rule_id);
  const values: Array<{
    title: string;
    detail: string;
    count: number;
    icon: React.ReactNode;
  }> = [];
  const add = (
    match: (r: string) => boolean,
    title: string,
    detail: string,
    icon: React.ReactNode,
  ) => {
    const count = rules.filter(match).length;
    if (count) values.push({ title, detail, count, icon });
  };
  add(
    (r) => r.includes("process") || r.includes("shell"),
    "Local process execution",
    "Can start configured tools with the developer account's operating-system permissions.",
    <Terminal />,
  );
  add(
    (r) => r.includes("filesystem") || r.includes("file-operation"),
    "Filesystem access",
    "Can read or modify workspace and local files required by its workflow.",
    <FileCode2 />,
  );
  add(
    (r) =>
      r.includes("secret") || r.includes("credential") || r.includes("env"),
    "Credential-related surfaces",
    "References configuration or files that may contain API keys or credentials.",
    <ShieldAlert />,
  );
  add(
    (r) => r.includes("network") || r.includes("url"),
    "Network communication",
    "Contains code paths or destinations associated with outbound requests.",
    <Box />,
  );
  if (!values.length)
    values.push({
      title: "No high-power capability family identified",
      detail:
        "The available evidence did not map to process, filesystem, credential or network access.",
      count: 0,
      icon: <ShieldCheck />,
    });
  return values;
}
