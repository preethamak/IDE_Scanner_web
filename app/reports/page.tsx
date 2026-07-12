"use client";

import Link from "next/link";
import { ArrowRight, FileArchive, FolderOpen, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteImportedReport, listImportedReports } from "@/lib/reportBundle";

const bundleFiles = [
  ["metadata.json", "Scan identity, schema, scanner and ruleset versions."],
  ["summary.json", "Decisions, finding counts and review priorities."],
  ["leaderboard.json", "Compact extension rows with coverage and detail references."],
  ["extensions/*.json", "Full evidence, findings, artifacts and recommendations."],
  ["rules.json", "The exact rule metadata used by the scanner."],
  ["posture.json", "Separate IDE client configuration posture."],
];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReturnType<typeof listImportedReports>>([]);
  useEffect(() => { queueMicrotask(() => setReports(listImportedReports())); }, []);
  function remove(id: string) { deleteImportedReport(id); setReports(listImportedReports()); }

  return <main className="reportsPage pageWrap">
    <section className="reportsHero"><div><span className="kicker">Evidence workspace</span><h1>Reports belong to exact artifacts.</h1><p>Hosted results and imported Python bundles remain in this browser. Decisions are scanner-owned and every detail is tied to a ruleset and artifact identity.</p></div><Link className="button buttonDark" href="/scan">Open scanner <ArrowRight size={16}/></Link></section>

    <section className="reportInventory"><div className="resultHeader"><div><span className="kicker">Browser storage</span><h2>{reports.length ? `${reports.length} saved report${reports.length === 1 ? "" : "s"}` : "No saved reports"}</h2></div><span>Local to this browser</span></div>{reports.length ? <div className="reportRows">{reports.map((report) => { const totals = report.summary.summary; const primary = report.leaderboard.extensions[0]; return <article key={report.id}><div className="reportIcon"><ShieldCheck size={19}/></div><div><strong>{primary?.name || primary?.extension_id || report.name}</strong><code>{primary ? `${primary.extension_id}@${primary.version}` : report.metadata.scan_id}</code><p>{report.metadata.scanner_version} · ruleset {report.metadata.ruleset_version}</p></div><span><b className={`decision ${primary?.decision || "incomplete"}`}>{(primary?.decision || "incomplete").toUpperCase()}</b></span><div className="reportNumbers"><span>Risk <strong>{totals.max_risk_score}</strong></span><span>Malware <strong>{totals.max_malware_score}</strong></span></div><Link className="rowAction" href={`/reports/${encodeURIComponent(report.id)}`} aria-label="Open report"><ArrowRight size={17}/></Link><button className="deleteButton" onClick={() => remove(report.id)} aria-label="Delete report" title="Delete report"><Trash2 size={15}/></button></article>; })}</div> : <div className="emptyReports"><FolderOpen size={32}/><h3>Your analysis history starts here.</h3><p>Analyze a Marketplace extension, upload a VSIX, or open a canonical `report.zip` bundle.</p><Link className="button buttonDark" href="/scan">Analyze extension</Link></div>}</section>

    <section className="bundleContract"><div className="sectionTitle"><span className="kicker">Portable by design</span><h2>The report bundle contract.</h2><p>The website renders scanner output. It does not reconstruct findings, decisions, diagnostic indexes, or coverage in the browser.</p></div><div className="bundleFiles">{bundleFiles.map(([name, detail]) => <article key={name}><FileArchive size={17}/><div><code>{name}</code><p>{detail}</p></div></article>)}</div></section>
  </main>;
}
