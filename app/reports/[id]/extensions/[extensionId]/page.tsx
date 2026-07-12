"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getImportedReport } from "@/lib/reportBundle";
import type { Decision, ExtensionDetail, ImportedReportBundle } from "@/lib/types";
import IntelligenceScores from "@/app/IntelligenceScores";

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
  const interpretation = interpretExtension(detail, actionable, contextual);
  const artifactHash = String(identity.sha256 || detail.artifact_sha256 || detail.artifact_inventory?.vsix_hash || detail.artifact_inventory?.package_hash || "");

  return (
    <main className="shell reportIntelligence">
      <section className="pageHero compactHero">
        <div>
          <p className="eyebrow">{decision} decision</p>
          <h1>{detail.name || detail.extension_id}</h1>
          <p className="heroCopy">{detail.decision_reason || detail.verdict_reason}</p>
        </div>
        <Link className="heroAction" href={`/reports/${ids.id}`}>Back to dashboard</Link>
      </section>

      <div className="intelligenceLayout"><aside className="intelligenceNav"><strong>Extension intelligence</strong>{[["overview","Overview"],["scores","Security scores"],["alerts","Alerts"],["capabilities","Capabilities"],["dependencies","Dependencies"],["coverage","Analyzer coverage"],["provenance","Provenance"],["evidence","Raw evidence"]].map(([id,label])=><a key={id} href={`#${id}`}>{label}</a>)}</aside><div className="intelligenceContent">

      <section id="overview" className="reportInterpretation">
        <div className="interpretationLead">
          <p className="eyebrow">Bottom line</p>
          <h2>{interpretation.headline}</h2>
          <p>{interpretation.summary}</p>
          <div className="interpretationMeta"><span>Malware evidence <strong>{detail.malware_score ? `${detail.malware_score}/100` : "none confirmed"}</strong></span><span>Review evidence <strong>{actionable.length} finding{actionable.length === 1 ? "" : "s"}</strong></span><span>Artifact identity <strong>{artifactHash ? `${artifactHash.slice(0, 12)}…` : "not recorded"}</strong></span></div>
        </div>
        <div className="interpretationColumns">
          <article><h3>What this extension can do</h3>{interpretation.capabilities.map((item) => <p key={item}>{item}</p>)}</article>
          <article><h3>Why it needs attention</h3>{interpretation.concerns.map((item) => <p key={item}>{item}</p>)}</article>
          <article><h3>Verify before installing</h3>{interpretation.verifications.map((item) => <p key={item}>{item}</p>)}</article>
        </div>
      </section>

      <IntelligenceScores risk={detail.risk_score} malware={detail.malware_score} coverage={coverage.coverage_percent ?? detail.coverage_percent} dimensions={detail.security_dimensions || {}}/>

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
          <code className="hashValue">{artifactHash || "Artifact hash was not recorded by this report version"}</code>
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

        <article id="coverage" className="commandPanel span2">
          <h2>Decision basis</h2>
          <ul className="plainList">
            {(detail.score_explanation || []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article className="commandPanel span2">
          <h2>Executable coverage</h2>
          <p className="sectionExplanation">Coverage describes what the scanner actually inspected. A complete result does not mean the extension is harmless; it means the required analysis finished without an unreported gap.</p>
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

        <article id="alerts" className="commandPanel span2 evidencePanel">
          <h2>Findings that affect the decision</h2>
          <p className="sectionExplanation">These findings represent sensitive capability or connected behavior that should change the install decision. They are not automatically proof of malware.</p>
          {actionable.map((finding) => <FindingRow key={finding.finding_id} finding={finding} detail={detail} />)}
          {!actionable.length ? <p>No actionable findings were emitted for this extension.</p> : null}
        </article>

        <article id="capabilities" className="commandPanel span2 evidencePanel">
          <h2>Context, not accusations</h2>
          <p className="sectionExplanation">These observations describe ordinary package behavior or trust context. They do not independently justify blocking an extension.</p>
          {contextual.map((finding) => <FindingRow key={finding.finding_id} finding={finding} detail={detail} />)}
          {!contextual.length ? <p>No contextual notes were emitted for this extension.</p> : null}
        </article>

        <article id="provenance" className="commandPanel">
          <h2>Manifest</h2>
          <Fact label="Publisher" value={detail.publisher} />
          <Fact label="Version" value={detail.version} />
          <Fact label="Source" value={detail.source} />
          <Fact label="Repository" value={detail.repository || "not reported"} />
        </article>

        <article id="dependencies" className="commandPanel">
          <h2>Dependencies</h2>
          {Object.entries(detail.dependencies || {}).slice(0, 20).map(([name, version]) => <p key={name}>{name}@{version}</p>)}
          {!Object.keys(detail.dependencies || {}).length ? <p>No runtime dependencies were reported.</p> : null}
        </article>

        <article id="evidence" className="commandPanel span2">
          <h2>Artifacts</h2>
          <pre className="jsonPreview compactJson">{JSON.stringify(detail.artifact_inventory || {}, null, 2)}</pre>
        </article>
      </section>
      </div></div>
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

function interpretExtension(detail: ExtensionDetail, actionable: ExtensionDetail["findings"], contextual: ExtensionDetail["findings"]) {
  const rules = new Set((detail.findings || []).map((finding) => finding.rule_id));
  const capabilities: string[] = [];
  if ([...rules].some((rule) => rule.includes("webview"))) capabilities.push("Creates an IDE webview, which introduces a browser-to-extension message and content boundary.");
  if ([...rules].some((rule) => rule.includes("network"))) capabilities.push("Can communicate over the network. Review destinations and the data transmitted.");
  if ([...rules].some((rule) => rule.includes("filesystem"))) capabilities.push("Reads or writes local files, a normal capability that becomes sensitive around credentials and workspace content.");
  if ([...rules].some((rule) => rule.includes("process") || rule.includes("shell"))) capabilities.push("Can invoke local processes or shell commands with the developer's operating-system permissions.");
  if ([...rules].some((rule) => rule.includes("credential") || rule.includes("secret"))) capabilities.push("Touches credential-related input, storage, configuration, or file surfaces.");
  if ([...rules].some((rule) => rule.includes("obfuscation") || rule.includes("dynamic"))) capabilities.push("Contains code patterns that make behavior harder to inspect statically.");
  if (!capabilities.length) capabilities.push("No high-power capability family was identified in the available scanner evidence.");

  const concerns = actionable.slice(0, 4).map((finding) => finding.evidence_summary);
  if (!concerns.length) concerns.push("No actionable abuse evidence was emitted. Contextual observations remain available below.");
  const verifications = (detail.recommendations || []).slice(0, 3).map((item) => item.action || item.description).filter(Boolean);
  if (!verifications.length && rules.has("webview-csp-missing")) verifications.push("Confirm every generated webview document sets a restrictive Content-Security-Policy and validates incoming messages.");
  if (!verifications.length) verifications.push("Confirm the requested capabilities match the extension's documented purpose and expected user actions.");
  if (contextual.length) verifications.push(`Treat the ${contextual.length} contextual observation${contextual.length === 1 ? "" : "s"} below as review clues, not standalone malware evidence.`);

  const decision = securityDecision(detail);
  const headline = decision === "block" ? "Do not install this artifact." : decision === "incomplete" ? "Do not approve until analysis coverage is restored." : decision === "review" ? "Install only after verifying the sensitive behavior." : "No evidence currently requires review.";
  const summary = decision === "review"
    ? `The scanner found ${actionable.length} decision-relevant finding${actionable.length === 1 ? "" : "s"}, but no confirmed malicious artifact intelligence. This is a capability review, not a malware conviction.`
    : detail.decision_reason || detail.verdict_reason;
  return { headline, summary, capabilities, concerns, verifications };
}
