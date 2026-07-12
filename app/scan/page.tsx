"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Box, Check, ChevronRight, FileArchive, LoaderCircle, Search, ShieldCheck, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { parseReportBundle, saveHostedScanReport, saveImportedReport } from "@/lib/reportBundle";
import type { MarketplaceSearchResult } from "@/lib/types";

type Mode = "marketplace" | "upload" | "report";
type ScanState = { id: string; status: string; stage?: string; error?: string | null; analysis_level?: "deep" | "preliminary"; summary?: unknown; report?: unknown };
type DisplayResult = { extensionId: string; name: string; version: string; publisher: string; decision: string; reason: string; risk: number; malware: number; severity: string; hash: string; coverage: number; findings: Array<{ rule_id?: string; severity?: string; evidence_class?: string; evidence_summary?: string; file_refs?: string[] }>; providers: Record<string, string> };

export default function ScanPage() { return <Suspense fallback={<main className="scannerPage pageWrap"><div className="message">Loading scanner…</div></main>}><Scanner /></Suspense>; }

function Scanner() {
  const initial = useSearchParams().get("q")?.trim() || "";
  const [mode, setMode] = useState<Mode>("marketplace");
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<MarketplaceSearchResult[]>([]);
  const [selected, setSelected] = useState(initial);
  const [searching, setSearching] = useState(Boolean(initial));
  const [scan, setScan] = useState<ScanState | null>(null);
  const [report, setReport] = useState<unknown>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initial) return;
    fetch(`/api/marketplace/search?q=${encodeURIComponent(initial)}`).then(async (response) => ({ response, body: await response.json() })).then(({ response, body }) => { if (!response.ok) throw new Error(body.error); setResults(body.results || []); setSearching(false); }).catch((cause) => { setError(cause instanceof Error ? cause.message : "Search failed"); setSearching(false); });
  }, [initial]);

  useEffect(() => {
    if (!scan?.id || scan.status === "complete" || scan.status === "failed") return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/scans/${encodeURIComponent(scan.id)}`, { cache: "no-store" });
      const next = await response.json();
      if (!response.ok) { setScan((current) => current ? { ...current, status: "failed", error: next.error || "Scan status failed" } : current); return; }
      setScan(next);
      if (next.status === "complete") {
        const reportResponse = await fetch(`/api/scans/${encodeURIComponent(scan.id)}/report`, { cache: "no-store" });
        const reportBody = await reportResponse.json();
        if (reportResponse.ok) { setReport(reportBody); saveHostedScanReport({ report: reportBody }); }
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [scan?.id, scan?.status]);

  const display = useMemo(() => extractResult(report || scan?.report || scan?.summary), [report, scan]);

  async function searchMarketplace() { const value = query.trim(); if (!value) return; setSearching(true); setError(""); try { const response = await fetch(`/api/marketplace/search?q=${encodeURIComponent(value)}`); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Marketplace search failed"); setResults(body.results || []); } catch (cause) { setError(cause instanceof Error ? cause.message : "Marketplace search failed"); } finally { setSearching(false); } }
  async function scanMarketplace(extensionId = selected) { if (!extensionId) { setError("Select an extension first."); return; } setSelected(extensionId); setError(""); setReport(null); setScan({ id: "pending", status: "submitting", stage: "submitting" }); try { const response = await fetch("/api/scans/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: extensionId }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Scan failed to start"); setScan(body); if (body.report) { setReport(body.report); saveHostedScanReport(body); } } catch (cause) { setScan(null); setError(cause instanceof Error ? cause.message : "Scan failed"); } }
  async function scanUpload() { if (!uploadFile) return; setError(""); setReport(null); setScan({ id: "pending", status: "submitting", stage: "uploading" }); try { const form = new FormData(); form.append("file", uploadFile); const response = await fetch("/api/scans/upload", { method: "POST", body: form }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Upload scan failed"); setScan(body); if (body.report) { setReport(body.report); saveHostedScanReport(body); } } catch (cause) { setScan(null); setError(cause instanceof Error ? cause.message : "Upload scan failed"); } }
  async function importReport(file: File | null) { if (!file) return; try { const bundle = await parseReportBundle(file); saveImportedReport(bundle); window.location.href = `/reports/${encodeURIComponent(bundle.id)}`; } catch (cause) { setError(cause instanceof Error ? cause.message : "Report import failed"); } }

  return <main className="scannerPage pageWrap">
    <section className="scannerIntro"><div><span className="kicker">Artifact scanner</span><h1>Inspect an extension before installation.</h1><p>Analyze a Marketplace release or uploaded VSIX without executing package code. The result states whether it came from the full Python service or the preliminary hosted ruleset.</p></div><div className="scannerAssurance"><span><ShieldCheck size={17}/> Static-only execution policy</span><span><Check size={17}/> Exact artifact SHA-256</span><span><Check size={17}/> Explicit provider coverage</span></div></section>

    <div className="modeTabs" role="tablist" aria-label="Scanner input"><button className={mode === "marketplace" ? "active" : ""} onClick={() => setMode("marketplace")}><Search size={16}/> Marketplace</button><button className={mode === "upload" ? "active" : ""} onClick={() => setMode("upload")}><Upload size={16}/> Upload VSIX</button><button className={mode === "report" ? "active" : ""} onClick={() => setMode("report")}><FileArchive size={16}/> Open report</button></div>

    {error ? <div className="message errorMessage"><AlertTriangle size={17}/>{error}</div> : null}

    {mode === "marketplace" ? <section className="scanWorkspace"><div className="scanInputPanel"><span className="panelNumber">01</span><div><span className="kicker">Find exact release</span><h2>Marketplace extension</h2><p>Search by product name, publisher identifier, or Marketplace URL.</p></div><form onSubmit={(event) => { event.preventDefault(); void searchMarketplace(); }}><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="solidity or publisher.extension"/><button className="button buttonDark" disabled={searching}>{searching ? "Searching…" : "Search"}</button></form>{results.length ? <div className="scanSearchResults">{results.slice(0, 8).map((item) => <button key={item.extension_id} className={selected === item.extension_id ? "selected" : ""} onClick={() => setSelected(item.extension_id)}><span>{item.publisher.slice(0, 2).toUpperCase()}</span><div><strong>{item.display_name}</strong><code>{item.extension_id} · {item.version}</code></div><small>{formatCompact(item.install_count)} installs</small><ChevronRight size={17}/></button>)}</div> : null}</div><div className="scanActionPanel"><span className="panelNumber">02</span><div><span className="kicker">Analyze artifact</span><h2>{selected || "Select an extension"}</h2><p>The exact published VSIX is downloaded, bounded, hashed, extracted, and inspected. Package code is never run.</p></div><button className="button buttonDark scanNow" disabled={!selected || isRunning(scan)} onClick={() => void scanMarketplace()}>{isRunning(scan) ? <><LoaderCircle className="spin" size={17}/> {stageLabel(scan)}</> : <>Run analysis <ArrowRight size={17}/></>}</button><CoverageModes /></div></section> : null}

    {mode === "upload" ? <section className="uploadWorkspace"><div><span className="kicker">Private artifact input</span><h2>Upload a VSIX or ZIP</h2><p>The public deployment performs preliminary static analysis in memory. For the complete Python ruleset, run the local scanner service or import its report bundle.</p></div><label className="uploadDrop"><Box size={28}/><strong>{uploadFile?.name || "Choose extension package"}</strong><span>VSIX or ZIP · maximum 50 MB</span><input type="file" accept=".vsix,.zip" onChange={(event) => setUploadFile(event.target.files?.[0] || null)}/></label><button className="button buttonDark" disabled={!uploadFile || isRunning(scan)} onClick={() => void scanUpload()}>{isRunning(scan) ? "Analyzing…" : "Analyze package"}</button></section> : null}

    {mode === "report" ? <section className="uploadWorkspace"><div><span className="kicker">Canonical report bundle</span><h2>Open report.zip</h2><p>Report bundles are parsed and stored in this browser. No report upload is required for local review.</p></div><label className="uploadDrop"><FileArchive size={28}/><strong>Choose report.zip</strong><span>Scanner schema 2.1</span><input type="file" accept=".zip,application/zip" onChange={(event) => void importReport(event.target.files?.[0] || null)}/></label></section> : null}

    {scan?.status === "failed" ? <div className="message errorMessage"><AlertTriangle size={17}/>{scan.error || "Analysis failed."}</div> : null}
    {display ? <ResultPanel result={display} level={scan?.analysis_level || "preliminary"}/> : null}
  </main>;
}

function ResultPanel({ result, level }: { result: DisplayResult; level: string }) { return <section className="scanResult"><div className="resultMast"><div><span className="kicker">{level === "deep" ? "Deep Python analysis" : "Preliminary hosted analysis"}</span><h2>{result.name}</h2><code>{result.extensionId}@{result.version}</code></div><b className={`decision ${result.decision}`}>{result.decision.toUpperCase()}</b></div><div className="resultReason"><ShieldCheck size={22}/><div><strong>{result.reason}</strong><span>Decision applies to artifact <code>{result.hash ? result.hash.slice(0, 16) : "hash unavailable"}</code></span></div></div><div className="resultMetrics"><Metric label="Risk index" value={result.risk}/><Metric label="Malware index" value={result.malware}/><Metric label="Coverage" value={`${result.coverage}%`}/><Metric label="Findings" value={result.findings.length}/></div><div className="resultColumns"><div><div className="subhead"><h3>Primary evidence</h3><span>{result.findings.length} findings</span></div><div className="findingList">{result.findings.slice(0, 8).map((finding, index) => <article key={`${finding.rule_id}-${index}`}><span>{finding.severity || "INFO"}</span><div><strong>{finding.rule_id || "finding"}</strong><p>{finding.evidence_summary || "Scanner evidence"}</p><small>{finding.evidence_class || "context"}{finding.file_refs?.[0] ? ` · ${finding.file_refs[0]}` : ""}</small></div></article>)}</div></div><div><div className="subhead"><h3>Provider coverage</h3><span>Not inferred</span></div><div className="providerList">{Object.entries(result.providers).map(([provider, status]) => <div key={provider}><span>{provider.replaceAll("_", " ")}</span><b className={status === "complete" || status === "available" ? "ready" : "notRun"}>{status}</b></div>)}</div><div className="reportLinkBox"><strong>Report saved in this browser</strong><p>Review full evidence, recommendations, and artifact metadata.</p><Link href="/reports">Open reports <ArrowRight size={15}/></Link></div></div></div></section>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function CoverageModes() { return <div className="coverageModes"><div><strong>Deep service</strong><span>Native + AST + optional Semgrep/YARA + dependency intelligence</span></div><div><strong>Hosted fallback</strong><span>Manifest + bounded text rules + artifact identity</span></div></div>; }
function isRunning(scan: ScanState | null) { return Boolean(scan && !["complete", "failed"].includes(scan.status)); }
function stageLabel(scan: ScanState | null) { return scan?.stage ? scan.stage.replaceAll("_", " ") : "Analyzing"; }
function formatCompact(value: number) { return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0); }

function extractResult(payload: unknown): DisplayResult | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const leaderboard = root.leaderboard as { extensions?: Array<Record<string, unknown>> } | undefined;
  const summary = root.summary as Record<string, unknown> | undefined;
  const top = summary?.top_risk_extensions as Array<Record<string, unknown>> | undefined;
  const row = leaderboard?.extensions?.[0] || top?.[0] || (root.top_risk_extensions as Array<Record<string, unknown>> | undefined)?.[0];
  if (!row) return null;
  const extensionMap = root.extensions as Record<string, Record<string, unknown>> | Array<Record<string, unknown>> | undefined;
  const detail = Array.isArray(extensionMap) ? extensionMap[0] : extensionMap && typeof row.detail_ref === "string" ? extensionMap[row.detail_ref] : undefined;
  const source = detail || row;
  const coverage = source.analysis_coverage as Record<string, unknown> | undefined;
  return {
    extensionId: String(row.extension_id || "unknown.extension"), name: String(row.name || row.display_name || row.extension_id || "Extension"), version: String(row.version || "unknown"), publisher: String(row.publisher || "unknown"), decision: String(row.decision || (row.scan_incomplete ? "incomplete" : "review")), reason: String(row.decision_reason || row.verdict_reason || "Review scanner evidence."), risk: Number(row.risk_score || 0), malware: Number(row.malware_score || 0), severity: String(row.severity || "INFO"), hash: String(row.artifact_sha256 || (source.artifact_identity as Record<string, unknown> | undefined)?.sha256 || ""), coverage: Number(row.coverage_percent || coverage?.coverage_percent || 0), findings: (source.findings || row.top_findings || []) as DisplayResult["findings"], providers: (coverage?.providers || { hosted_static: "complete", semgrep: "not_run", yara: "not_run", dependency_intelligence: "not_run" }) as Record<string, string>
  };
}
