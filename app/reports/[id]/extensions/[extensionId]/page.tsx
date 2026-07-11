"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getImportedReport } from "@/lib/reportBundle";
import type { Decision, ExtensionDetail, ImportedReportBundle } from "@/lib/types";

export default function ReportExtensionDetailPage({ params }: { params: Promise<{ id: string; extensionId: string }> }) {
  const [report, setReport] = useState<ImportedReportBundle | null>(null);
  const [ids, setIds] = useState<{ id: string; extensionId: string } | null>(null);

  useEffect(() => {
    void params.then(({ id, extensionId }) => {
      setIds({ id, extensionId: decodeURIComponent(extensionId) });
      setReport(getImportedReport(id));
    });
  }, [params]);

  const detail = useMemo(() => {
    if (!report || !ids) return null;
    const row = report.leaderboard.extensions.find((item) => item.extension_id === ids.extensionId);
    if (row?.detail_ref && report.details[row.detail_ref]) return report.details[row.detail_ref];
    return Object.values(report.details).find((item) => item.extension_id === ids.extensionId) || null;
  }, [report, ids]);

  if (!report || !ids || !detail) {
    return (
      <main className="shell">
        <section className="pageHero compactHero">
          <div>
            <p className="eyebrow">Extension detail</p>
            <h1>Extension not found</h1>
            <p className="heroCopy">The imported report does not contain this extension detail file.</p>
          </div>
          <Link className="heroAction" href={ids ? `/reports/${ids.id}` : "/scan"}>Back to report</Link>
        </section>
      </main>
    );
  }

  const contextual = (detail.findings || []).filter((finding) => finding.actionability === "contextual");
  const actionable = (detail.findings || []).filter((finding) => finding.actionability !== "contextual");
  const decision = securityDecision(detail);
  const coverage = detail.analysis_coverage || {};
  const identity = detail.artifact_identity || {};
  const baseline = detail.baseline_diff || {};

  return (
    <main className="shell">
      <section className="pageHero compactHero">
        <div>
          <p className="eyebrow">{decision} decision</p>
          <h1>{detail.name || detail.extension_id}</h1>
          <p className="heroCopy">{detail.decision_reason || detail.verdict_reason}</p>
        </div>
        <Link className="heroAction" href={`/reports/${ids.id}`}>Back to dashboard</Link>
      </section>

      <section className="extensionDetailGrid">
        <article className={`commandPanel decisionPanel ${decision}`}>
          <p className="eyebrow">Decision</p>
          <h2>{decision}</h2>
          <p>{detail.decision_reason || detail.verdict_reason}</p>
        </article>
        <article className="commandPanel">
          <p className="eyebrow">Analysis coverage</p>
          <h2>{coverage.coverage_percent ?? detail.coverage_percent ?? (detail.scan_incomplete ? 0 : 100)}%</h2>
          <p>{coverage.status || (detail.scan_incomplete ? "incomplete" : "complete")}</p>
        </article>
        <article className="commandPanel">
          <p className="eyebrow">Artifact</p>
          <h2>{detail.version}</h2>
          <code className="hashValue">{identity.sha256 || detail.artifact_sha256 || "hash unavailable"}</code>
        </article>
        <article className="commandPanel">
          <p className="eyebrow">Baseline</p>
          <h2>{baseline.baseline_changed || detail.baseline_changed ? "Changed" : "No change"}</h2>
          <p>{baseline.previous_version ? `${baseline.previous_version} → ${baseline.current_version || detail.version}` : "No earlier artifact supplied"}</p>
        </article>
        <article className="commandPanel">
          <p className="eyebrow">Evidence verdict</p>
          <h2>{detail.verdict_label || detail.verdict}</h2>
          <p>{detail.severity} severity · risk {detail.risk_score} · malware {detail.malware_score}</p>
        </article>

        <article className="commandPanel span2">
          <h2>Decision basis</h2>
          <ul className="plainList">
            {(detail.score_explanation || []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article className="commandPanel span2">
          <h2>Executable coverage</h2>
          <div className="coverageFacts">
            <Fact label="Declared entrypoints" value={joinValues(coverage.declared_entrypoints)} />
            <Fact label="Resolved entrypoints" value={joinValues(coverage.resolved_entrypoints)} />
            <Fact label="Executable candidates" value={String(coverage.executable_candidates?.length ?? 0)} />
            <Fact label="Analyzed executables" value={String(coverage.analyzed_executable_files?.length ?? 0)} />
          </div>
          {(coverage.limitations || []).map((item) => <div className="errorBand" key={item}>{item}</div>)}
          <div className="providerStrip">
            {Object.entries(coverage.providers || {}).map(([name, provider]) => (
              <span key={name}><strong>{name}</strong>{provider.status || "unknown"}{typeof provider.finding_count === "number" ? ` · ${provider.finding_count} findings` : ""}</span>
            ))}
          </div>
        </article>

        {baseline.baseline_changed ? (
          <article className="commandPanel span2">
            <h2>Baseline changes</h2>
            <ChangeSet label="New capabilities" values={baseline.added_capabilities} />
            <ChangeSet label="New findings" values={baseline.added_findings} />
            <ChangeSet label="New dependencies" values={baseline.added_dependencies} />
            <ChangeSet label="New risky artifacts" values={baseline.added_risky_artifacts} />
          </article>
        ) : null}

        <article className="commandPanel span2">
          <h2>Recommendations</h2>
          {(detail.recommendations || []).map((item) => (
            <div className="recommendationBlock" key={`${item.priority}-${item.title}`}>
              <strong>{item.title}</strong>
              <span>{item.priority}</span>
              <p>{item.description}</p>
              <code>{item.action}</code>
            </div>
          ))}
          {!detail.recommendations?.length ? <p>No recommendations were emitted for this extension.</p> : null}
        </article>

        <article className="commandPanel span2 evidencePanel">
          <h2>Actionable findings</h2>
          {actionable.map((finding) => <FindingRow key={finding.finding_id} finding={finding} detail={detail} />)}
          {!actionable.length ? <p>No actionable findings were emitted for this extension.</p> : null}
        </article>

        <article className="commandPanel span2 evidencePanel">
          <h2>Contextual notes</h2>
          {contextual.map((finding) => <FindingRow key={finding.finding_id} finding={finding} detail={detail} />)}
          {!contextual.length ? <p>No contextual notes were emitted for this extension.</p> : null}
        </article>

        <article className="commandPanel">
          <h2>Manifest</h2>
          <Fact label="Publisher" value={detail.publisher} />
          <Fact label="Version" value={detail.version} />
          <Fact label="Source" value={detail.source} />
          <Fact label="Repository" value={detail.repository || "not reported"} />
        </article>

        <article className="commandPanel">
          <h2>Dependencies</h2>
          {Object.entries(detail.dependencies || {}).slice(0, 20).map(([name, version]) => <p key={name}>{name}@{version}</p>)}
          {!Object.keys(detail.dependencies || {}).length ? <p>No runtime dependencies were reported.</p> : null}
        </article>

        <article className="commandPanel span2">
          <h2>Artifacts</h2>
          <pre className="jsonPreview compactJson">{JSON.stringify(detail.artifact_inventory || {}, null, 2)}</pre>
        </article>
      </section>
    </main>
  );
}

function FindingRow({ finding, detail }: { finding: ExtensionDetail["findings"][number]; detail: ExtensionDetail }) {
  return (
    <div className="evidenceRow">
      <strong>{finding.rule_id}</strong>
      <small>{finding.category} · {finding.severity} · {finding.evidence_class || "weak"} · {finding.actionability || "contextual"} · confidence {finding.confidence}</small>
      <span>{finding.evidence_summary}</span>
      {finding.file_refs?.length ? <code>{finding.file_refs.join(", ")}</code> : null}
      {(finding.evidence_refs || []).map((ref) => {
        const evidence = detail.evidence?.[ref];
        return evidence ? <p className="recommendation" key={ref}>{ref}: {evidence.summary}</p> : null;
      })}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <p><strong>{label}</strong><br /><code>{value}</code></p>;
}

function ChangeSet({ label, values }: { label: string; values?: string[] }) {
  if (!values?.length) return null;
  return <div className="changeSet"><strong>{label}</strong><span className="findingTags">{values.map((value) => <code key={value}>{value}</code>)}</span></div>;
}

function joinValues(values?: string[]): string {
  return values?.length ? values.join(", ") : "none";
}

function securityDecision(detail: ExtensionDetail): Decision {
  if (detail.decision) return detail.decision;
  if (detail.verdict === "malicious") return "block";
  if (detail.scan_incomplete) return "incomplete";
  if (detail.verdict === "review" || detail.verdict === "suspicious") return "review";
  return "allow";
}
