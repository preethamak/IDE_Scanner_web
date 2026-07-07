"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getImportedReport } from "@/lib/reportBundle";
import type { ImportedReportBundle } from "@/lib/types";

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

  return (
    <main className="shell">
      <section className="pageHero compactHero">
        <div>
          <p className="eyebrow">Extension detail</p>
          <h1>{detail.name || detail.extension_id}</h1>
          <p className="heroCopy">{detail.verdict_reason}</p>
        </div>
        <Link className="heroAction" href={`/reports/${ids.id}`}>Back to dashboard</Link>
      </section>

      <section className="extensionDetailGrid">
        <article className="commandPanel">
          <p className="eyebrow">Verdict</p>
          <h2>{detail.verdict}</h2>
          <p>{detail.severity} severity</p>
        </article>
        <article className="commandPanel">
          <p className="eyebrow">Grade</p>
          <h2>{detail.grade}</h2>
          <p>Provided by ide-scanner.</p>
        </article>
        <article className="commandPanel">
          <p className="eyebrow">Risk score</p>
          <h2>{detail.risk_score}</h2>
          <Meter value={detail.risk_score} />
        </article>
        <article className="commandPanel">
          <p className="eyebrow">Malware score</p>
          <h2>{detail.malware_score}</h2>
          <Meter value={detail.malware_score} />
        </article>

        <article className="commandPanel span2">
          <h2>Why this score</h2>
          <ul className="plainList">
            {(detail.score_explanation || []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>

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
          <h2>Findings</h2>
          {(detail.findings || []).map((finding) => (
            <div className="evidenceRow" key={finding.finding_id}>
              <strong>{finding.rule_id}</strong>
              <small>{finding.category} · {finding.severity} · confidence {finding.confidence}</small>
              <span>{finding.evidence_summary}</span>
              {finding.file_refs?.length ? <code>{finding.file_refs.join(", ")}</code> : null}
              {(finding.evidence_refs || []).map((ref) => {
                const evidence = detail.evidence?.[ref];
                return evidence ? <p className="recommendation" key={ref}>{ref}: {evidence.summary}</p> : null;
              })}
            </div>
          ))}
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

function Meter({ value }: { value: number }) {
  return <div className="meterTrack"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <p><strong>{label}</strong><br /><code>{value}</code></p>;
}
