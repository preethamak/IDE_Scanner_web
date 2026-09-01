"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getImportedReport } from "@/lib/reportBundle";
import type { BundleExtensionSummary, Decision, ImportedReportBundle } from "@/lib/types";

const decisionRank: Record<string, number> = { block: 4, incomplete: 3, review: 2, allow: 1 };
const severityRank: Record<string, number> = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };

export default function ReportDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [report, setReport] = useState<ImportedReportBundle | null>(null);
  const [reportId, setReportId] = useState("");
  const [ready, setReady] = useState(false);
  const [decision, setDecision] = useState("");
  const [severity, setSeverity] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void params.then(({ id }) => {
      setReportId(id);
      const imported = getImportedReport(id); setReport(imported);
      setReady(true);
      if (imported?.leaderboard.extensions.length === 1) router.replace(`/reports/${encodeURIComponent(id)}/extensions/${encodeURIComponent(imported.leaderboard.extensions[0].extension_id)}`);
    });
  }, [params, router]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...(report?.leaderboard.extensions || [])]
      .filter((item) => !decision || securityDecision(item) === decision)
      .filter((item) => !severity || item.severity === severity)
      .filter((item) => {
        if (!needle) return true;
        return `${item.extension_id} ${item.name} ${item.publisher} ${item.version}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => (
        (decisionRank[securityDecision(b)] || 0) - (decisionRank[securityDecision(a)] || 0) ||
        (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0) ||
        b.malware_score - a.malware_score ||
        b.risk_score - a.risk_score ||
        a.extension_id.localeCompare(b.extension_id)
      ));
  }, [report, decision, severity, query]);

  if (!ready) {
    return (
      <main className="shell" aria-busy="true">
        <section className="pageHero compactHero">
          <div>
            <p className="eyebrow">Report</p>
            <h1>Opening report…</h1>
            <p className="heroCopy">Reading the local bundle and its recorded evidence.</p>
          </div>
        </section>
      </main>
    );
  }

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
  const decisionCounts = summary.decision_counts || countDecisions(report.leaderboard.extensions);
  const outcome = reportOutcome(decisionCounts, summary.total_extensions, report.metadata.incomplete_extensions);

  return (
    <main className="shell">
      <section className="pageHero compactHero">
        <div>
          <p className="eyebrow">Report dashboard</p>
          <h1>{report.metadata.scan_id}</h1>
          <p className="heroCopy">
            Decisions from exact artifacts, recorded coverage, and grouped behavior evidence.
          </p>
        </div>
        <div className="heroActions">
          <Link className="heroAction" href={`/reports/${reportId}/posture`}>Posture</Link>
          <Link className="heroAction" href="/scan">Import another</Link>
        </div>
      </section>

      <section className="dashboardOutcome">
        <div><p className="eyebrow">Scan outcome</p><h2>{outcome.headline}</h2><p>{outcome.detail}</p></div>
        <div><span>Block<strong>{decisionCounts.block || 0}</strong></span><span>Review<strong>{decisionCounts.review || 0}</strong></span><span>Incomplete<strong>{decisionCounts.incomplete || 0}</strong></span></div>
      </section>

      <section className="actionQueue" aria-label="Security action queue">
        <DecisionCard decision="block" value={decisionCounts.block || 0} label="Block" detail="Confirmed malicious intelligence" />
        <DecisionCard decision="incomplete" value={decisionCounts.incomplete || 0} label="Incomplete" detail="Do not approve without coverage" />
        <DecisionCard decision="review" value={decisionCounts.review || 0} label="Review" detail="Evidence needs human context" />
        <DecisionCard decision="allow" value={decisionCounts.allow || 0} label="Allow" detail="No review required" />
      </section>

      <section className="reportAnalytics"><article><span>Risk distribution</span><h2>{rows.filter(item=>item.risk_score>=60).length}</h2><p>artifacts with risk priority 60 or higher</p><div className="distributionBar"><i style={{width:`${percentage(rows.filter(item=>item.risk_score>=60).length,rows.length)}%`}}/></div></article><article><span>Malware evidence</span><h2>{rows.filter(item=>item.malware_score>0).length}</h2><p>artifacts with non-zero malicious evidence</p><div className="distributionBar danger"><i style={{width:`${percentage(rows.filter(item=>item.malware_score>0).length,rows.length)}%`}}/></div></article><article><span>Analyzer completion</span><h2>{Math.round(rows.reduce((sum,item)=>sum+Number(item.coverage_percent??0),0)/Math.max(1,rows.length))}%</h2><p>average required analysis coverage</p><div className="distributionBar confidence"><i style={{width:`${Math.round(rows.reduce((sum,item)=>sum+Number(item.coverage_percent??0),0)/Math.max(1,rows.length))}%`}}/></div></article></section>

      <div className="reportContextLine">
        <span>{summary.total_extensions} exact extension artifacts</span>
        <span>{report.metadata.incomplete_extensions} incomplete</span>
        <span>IDE posture: {summary.posture_status}</span>
        <span>Ruleset {report.metadata.ruleset_version}</span>
      </div>

      <section className="reportControls">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search extensions" />
        <select value={decision} onChange={(event) => setDecision(event.target.value)}>
          <option value="">All decisions</option>
          <option value="block">Block</option>
          <option value="incomplete">Incomplete</option>
          <option value="review">Review</option>
          <option value="allow">Allow</option>
        </select>
        <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
          <option value="">All severities</option>
          {Object.keys(severityRank).map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </section>

      <section className="leaderboardTable">
        <div className="leaderboardHead">
          <span>Extension</span>
          <span>Decision</span>
          <span>Coverage</span>
          <span>Baseline</span>
          <span>Severity</span>
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
      <DecisionTag decision={securityDecision(item)} />
      <b>{item.coverage_percent ?? (item.scan_incomplete ? 0 : 100)}%</b>
      <span>{item.baseline_changed ? "Changed" : "No change"}</span>
      <span><SeverityTag severity={item.severity} /><small>{item.verdict_label || item.verdict}</small></span>
      <span className="findingTags">{stringFindings(item.top_findings).slice(0, 3).map((finding) => <code key={finding}>{finding}</code>)}</span>
      <Link className="panelLink" href={`/reports/${reportId}/extensions/${encodeURIComponent(item.extension_id)}`}>Details</Link>
    </article>
  );
}

function DecisionCard({ decision, value, label, detail }: { decision: Decision; value: number; label: string; detail: string }) {
  return (
    <article className={`decisionCard ${decision}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function DecisionTag({ decision }: { decision: Decision }) {
  return <span className={`decisionTag ${decision}`}>{decision}</span>;
}

function SeverityTag({ severity }: { severity: string }) {
  const normalized = severityRank[severity] ? severity : "INFO";
  return <span className={`severity severity-${normalized.toLowerCase()}`}>{normalized}</span>;
}

function stringFindings(findings: BundleExtensionSummary["top_findings"]): string[] {
  return (findings || []).filter(Boolean);
}

function securityDecision(item: BundleExtensionSummary): Decision {
  if (item.decision) return item.decision;
  if (item.verdict === "malicious") return "block";
  if (item.scan_incomplete) return "incomplete";
  if (item.verdict === "review" || item.verdict === "suspicious") return "review";
  return "allow";
}

function countDecisions(items: BundleExtensionSummary[]): Record<Decision, number> {
  const counts: Record<Decision, number> = { block: 0, review: 0, incomplete: 0, allow: 0 };
  for (const item of items) counts[securityDecision(item)] += 1;
  return counts;
}

function reportOutcome(counts: Record<Decision, number>, total: number, incomplete: number) {
  if (counts.block) return { headline: `${counts.block} artifact${counts.block === 1 ? "" : "s"} should be blocked.`, detail: "Authoritative malicious intelligence or policy-rejected evidence requires removal or rejection." };
  if (counts.incomplete || incomplete) return { headline: `${counts.incomplete || incomplete} artifact${(counts.incomplete || incomplete) === 1 ? "" : "s"} cannot be approved yet.`, detail: "Analysis coverage is incomplete. Restore the missing entrypoint, provider, or artifact analysis before making a trust decision." };
  if (counts.review) return { headline: `${counts.review} of ${total} artifact${total === 1 ? "" : "s"} needs human review.`, detail: "No confirmed malware decision was produced. Review the cited behavior groups against the extension’s documented purpose." };
  return { headline: `All ${total} artifact${total === 1 ? "" : "s"} passed the active review policy.`, detail: "Approval remains specific to these exact hashes, scanner builds, rulesets, and recorded analysis coverage." };
}
function percentage(value:number,total:number){return total?Math.round(value/total*100):0;}
