"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { extensionGrade, extensionGradeReason } from "@/lib/metrics";
import type { ExtensionSummary, FindingSummary } from "@/lib/types";

type FullExtension = ExtensionSummary & {
  findings?: FindingSummary[];
  capabilities?: { id: string; evidence: unknown[] }[];
  dependencies?: Record<string, string>;
  artifact_inventory?: {
    risky_artifacts?: Array<{ path?: string; kind?: string; size_bytes?: number }>;
    known_bad_matches?: unknown[];
  };
};

export default function ExtensionPage({ params }: { params: Promise<{ id: string }> }) {
  const [extension, setExtension] = useState<FullExtension | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void params.then(({ id }) => {
      fetch(`/api/extensions/${id}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data: { extension?: FullExtension; error?: string }) => {
          if (data.error) setError(data.error);
          else setExtension(data.extension || null);
        });
    });
  }, [params]);

  return (
    <main className="shell">
      <section className="pageHero compactHero">
        <div>
          <p className="eyebrow">Extension detail</p>
          <h1>{extension?.extension_id || "Extension"}</h1>
          <p className="heroCopy">{extension ? extension.verdict_reason : error || "Loading latest report evidence."}</p>
        </div>
        <Link className="heroAction" href="/scan">Back to scanner</Link>
      </section>

      {extension ? (
        <section className="extensionDetailGrid">
          <article className="commandPanel">
            <p className="eyebrow">Grade</p>
            <h2>{extensionGrade(extension)}</h2>
            <p>{extensionGradeReason(extension)}</p>
          </article>
          <article className="commandPanel">
            <p className="eyebrow">Scores</p>
            <h2>{extension.risk_score} / {extension.malware_score}</h2>
            <p>Risk score / malware score.</p>
          </article>
          <article className="commandPanel span2">
            <p className="eyebrow">Why this score</p>
            <ScoreBreakdown extension={extension} />
          </article>
          <article className="commandPanel span2">
            <p className="eyebrow">Path</p>
            <code>{extension.install_path}</code>
          </article>
          <article className="commandPanel span2 evidencePanel">
            <h2>Findings</h2>
            {(extension.findings || extension.top_findings || []).map((finding) => (
              <div className="evidenceRow" key={finding.finding_id}>
                <strong>{finding.rule_id}</strong>
                <small>{finding.category} · {finding.severity} · confidence {finding.confidence}</small>
                <span>{finding.evidence_summary}</span>
                {finding.file_refs?.length ? <code>{finding.file_refs.join(", ")}</code> : null}
                {finding.recommendation ? <p className="recommendation">{finding.recommendation}</p> : null}
              </div>
            ))}
          </article>
          <article className="commandPanel">
            <h2>Capabilities</h2>
            {(extension.capabilities || []).map((capability) => (
              <p key={capability.id}>{capability.id} <strong>{capability.evidence?.length || 0}</strong></p>
            ))}
            {!(extension.capabilities || []).length ? <p>No declared sensitive capabilities in the report.</p> : null}
          </article>
          <article className="commandPanel">
            <h2>Dependencies</h2>
            {Object.entries(extension.dependencies || {}).slice(0, 20).map(([name, version]) => <p key={name}>{name}@{version}</p>)}
            {!Object.keys(extension.dependencies || {}).length ? <p>No runtime dependencies were reported.</p> : null}
          </article>
          <article className="commandPanel span2">
            <h2>Artifacts</h2>
            {(extension.artifact_inventory?.risky_artifacts || []).slice(0, 12).map((artifact, index) => (
              <div className="evidenceRow" key={`${artifact.path}-${index}`}>
                <strong>{artifact.kind || "artifact"}</strong>
                <span>{artifact.path || "package artifact"} {artifact.size_bytes ? `· ${artifact.size_bytes} bytes` : ""}</span>
              </div>
            ))}
            {!(extension.artifact_inventory?.risky_artifacts || []).length ? <p>No risky native or packed artifacts were reported.</p> : null}
          </article>
        </section>
      ) : null}
    </main>
  );
}

function ScoreBreakdown({ extension }: { extension: FullExtension }) {
  const components = extension.score_details?.components || {};
  const entries = Object.entries(components)
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  return (
    <section className="scoreBreakdown embedded">
      <div className="scoreBreakdownHead">
        <span>{extension.score_details?.basis || "none"}</span>
        <strong>{extension.score_details?.confidence || "high"} confidence</strong>
      </div>
      {entries.length ? entries.map(([name, value]) => (
        <div className="componentBar" key={name}>
          <span>{name.replaceAll("_", " ")}</span>
          <i><em style={{ width: `${Math.max(0, Math.min(100, Number(value)))}%` }} /></i>
          <b>{value}</b>
        </div>
      )) : <p>No score-driving components. Findings are contextual or non-actionable.</p>}
      {(extension.score_details?.suppressors || []).length ? (
        <div className="suppressors">
          {(extension.score_details?.suppressors || []).map((item) => (
            <span key={item.id}>{item.id}: {item.reason}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
