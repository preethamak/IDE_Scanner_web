"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getImportedReport } from "@/lib/reportBundle";
import type { BundleExtensionSummary, ImportedReportBundle, Verdict } from "@/lib/types";

const verdictRank: Record<string, number> = { malicious: 4, suspicious: 3, review: 2, clean: 1 };
const severityRank: Record<string, number> = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };

export default function ReportDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const [report, setReport] = useState<ImportedReportBundle | null>(null);
  const [reportId, setReportId] = useState("");
  const [verdict, setVerdict] = useState("");
  const [severity, setSeverity] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void params.then(({ id }) => {
      setReportId(id);
      setReport(getImportedReport(id));
    });
  }, [params]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...(report?.leaderboard.extensions || [])]
      .filter((item) => !verdict || item.verdict === verdict)
      .filter((item) => !severity || item.severity === severity)
      .filter((item) => {
        if (!needle) return true;
        return `${item.extension_id} ${item.name} ${item.publisher} ${item.version}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => (
        (verdictRank[b.verdict] || 0) - (verdictRank[a.verdict] || 0) ||
        (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0) ||
        b.malware_score - a.malware_score ||
        b.risk_score - a.risk_score ||
        a.extension_id.localeCompare(b.extension_id)
      ));
  }, [report, verdict, severity, query]);

  if (!report) {
    return (
      <main className="shell">
        <section className="pageHero compactHero">
          <div>
            <p className="eyebrow">Report</p>
            <h1>Report not found</h1>
            <p className="heroCopy">Imported reports are stored in this browser. Import a scanner report bundle to view it here.</p>
          </div>
          <Link className="heroAction" href="/scan">Import report</Link>
        </section>
      </main>
    );
  }

  const summary = report.summary.summary;

  return (
    <main className="shell">
      <section className="pageHero compactHero">
        <div>
          <p className="eyebrow">Report dashboard</p>
          <h1>{report.metadata.scan_id}</h1>
          <p className="heroCopy">
            {report.metadata.source} scan using profile {report.metadata.profile}, scanner {report.metadata.scanner_version}, ruleset {report.metadata.ruleset_version}.
          </p>
        </div>
        <div className="heroActions">
          <Link className="heroAction" href={`/reports/${reportId}/posture`}>Posture</Link>
          <Link className="heroAction" href="/scan">Import another</Link>
        </div>
      </section>

      <section className="statGrid">
        <Stat label="Extensions" value={summary.total_extensions} />
        <Stat label="Clean" value={summary.clean} />
        <Stat label="Review" value={summary.review} />
        <Stat label="Suspicious" value={summary.suspicious} />
        <Stat label="Malicious" value={summary.malicious} />
      </section>

      <section className="scoreDeck reportSummaryDeck">
        <ScoreCard label="Max risk score" value={summary.max_risk_score} />
        <ScoreCard label="Max malware score" value={summary.max_malware_score} />
        <article className="commandPanel">
          <p className="eyebrow">Posture</p>
          <h2>{summary.posture_status}</h2>
          <p>Scanner-owned IDE/client posture status from the bundle.</p>
        </article>
      </section>

      <section className="reportControls">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search extensions" />
        <select value={verdict} onChange={(event) => setVerdict(event.target.value)}>
          <option value="">All verdicts</option>
          <option value="malicious">Malicious</option>
          <option value="suspicious">Suspicious</option>
          <option value="review">Review</option>
          <option value="clean">Clean</option>
        </select>
        <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
          <option value="">All severities</option>
          {Object.keys(severityRank).map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </section>

      <section className="leaderboardTable">
        <div className="leaderboardHead">
          <span>Extension</span>
          <span>Verdict</span>
          <span>Severity</span>
          <span>Risk</span>
          <span>Malware</span>
          <span>Grade</span>
          <span>Findings</span>
          <span />
        </div>
        {rows.map((item, index) => (
          <ExtensionRow key={`${item.extension_id}-${item.version}-${item.detail_ref || index}`} item={item} reportId={reportId} rank={index + 1} />
        ))}
      </section>
    </main>
  );
}

function ExtensionRow({ item, reportId, rank }: { item: BundleExtensionSummary; reportId: string; rank: number }) {
  return (
    <article className="leaderboardRow">
      <div>
        <span className="rank">{rank}</span>
        <span>
          <strong>{item.name || item.extension_id}</strong>
          <small>{item.extension_id} · {item.publisher} · {item.version}</small>
          <small>{item.activation_summary || "activation not reported"} · {item.dependency_count || 0} dependencies</small>
        </span>
      </div>
      <Tag tone={item.verdict}>{item.verdict}</Tag>
      <Tag>{item.severity}</Tag>
      <b>{item.risk_score}</b>
      <b>{item.malware_score}</b>
      <b>{item.grade || "-"}</b>
      <span className="findingTags">{stringFindings(item.top_findings).slice(0, 3).map((finding) => <code key={finding}>{finding}</code>)}</span>
      <Link className="panelLink" href={`/reports/${reportId}/extensions/${encodeURIComponent(item.extension_id)}`}>Details</Link>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="commandPanel">
      <p className="eyebrow">{label}</p>
      <h2>{value}</h2>
      <div className="meterTrack"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
    </article>
  );
}

function Tag({ children, tone = "" }: { children: React.ReactNode; tone?: Verdict | string }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}

function stringFindings(findings: BundleExtensionSummary["top_findings"]): string[] {
  return (findings || []).filter(Boolean);
}
