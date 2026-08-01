"use client";

import { AlertTriangle, FileArchive, ShieldCheck, Upload } from "lucide-react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import ExtensionSearch from "@/app/ExtensionSearch";
import { parseReportBundle, saveImportedReport } from "@/lib/reportBundle";

type Mode = "marketplace" | "upload" | "report";

export default function AnalyzePage() { return <Suspense fallback={<main className="scannerPage pageWrap"><div className="message">Loading Analyze…</div></main>}><Analyze /></Suspense>; }

function Analyze() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const requestedMode = searchParams.get("mode");
  const [mode, setMode] = useState<Mode>(requestedMode === "upload" || requestedMode === "report" ? requestedMode : "marketplace");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  async function importReport(file: File | null) { if (!file) return; try { const bundle = await parseReportBundle(file); saveImportedReport(bundle); window.location.assign(`/reports/${encodeURIComponent(bundle.id)}`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Report import failed."); } }
  async function analyzeUpload() { if (!uploadFile) return; setUploading(true); setError(""); try { const data = new FormData(); data.append("file", uploadFile); const response = await fetch("/api/scans/upload", { method: "POST", body: data }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Package preflight failed."); setError("Instant Preflight completed. This is a capability preview, not a security decision; import the canonical report for a full Analysis Report."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Package preflight failed."); } finally { setUploading(false); } }
  return <main className="scannerPage pageWrap">
    <section className="scannerIntro"><div><span className="kicker">Analyze · exact artifact</span><h1>Inspect an extension before installation.</h1><p>Analyze a Marketplace extension, a VSIX, or an imported canonical report. Deep Scan is the complete evidence workflow; Instant Preflight is capability preview only.</p></div><div className="scannerAssurance"><span><ShieldCheck size={17}/> Package code is not executed</span><span><ShieldCheck size={17}/> Exact artifact identity</span><span><ShieldCheck size={17}/> Analyzer coverage is recorded</span></div></section>
    <div className="modeTabs" role="tablist" aria-label="Analyze input"><button className={mode === "marketplace" ? "active" : ""} onClick={() => setMode("marketplace")}>Marketplace extension</button><button className={mode === "upload" ? "active" : ""} onClick={() => setMode("upload")}>Upload VSIX</button><button className={mode === "report" ? "active" : ""} onClick={() => setMode("report")}>Import report</button></div>
    {error ? <div className="message errorMessage"><AlertTriangle size={17}/>{error}</div> : null}
    {mode === "marketplace" ? <section className="analysisWorkspace"><div><span className="panelNumber">01</span><span className="kicker">Find an extension</span><h2>Start with the public profile.</h2><p>Search an extension, open its free public profile and publisher documentation, then sign in only when you are ready to request a Deep Scan for an exact release.</p><ExtensionSearch initialQuery={initialQuery} submitLabel="Find extension"/></div><aside><span className="panelNumber">02</span><div className="analysisEmpty"><h2>Then choose a release</h2><p>Each public profile keeps versions, publisher context, and existing Analysis Reports in one place. Deep Scan starts from that exact release.</p></div></aside></section> : null}
    {mode === "upload" ? <section className="uploadWorkspace"><div><span className="kicker">Private artifact input</span><h2>Upload a VSIX or ZIP</h2><p>Use package analysis for a local artifact. Results remain a preflight unless the canonical scanner report is imported.</p></div><label className="uploadDrop"><Upload size={28}/><strong>{uploadFile?.name || "Choose extension package"}</strong><span>VSIX or ZIP · maximum 50 MB</span><input type="file" accept=".vsix,.zip" onChange={(event) => setUploadFile(event.target.files?.[0] || null)}/></label><button className="button buttonDark" disabled={!uploadFile || uploading} onClick={() => void analyzeUpload()}>{uploading ? "Analyzing…" : "Preview capabilities"}</button></section> : null}
    {mode === "report" ? <section className="uploadWorkspace"><div><span className="kicker">Canonical report bundle</span><h2>Import a report.zip</h2><p>Imported reports render in this browser with the original scanner schema, evidence, and coverage fields intact.</p></div><label className="uploadDrop"><FileArchive size={28}/><strong>Choose report.zip</strong><span>Scanner report bundle</span><input type="file" accept=".zip,application/zip" onChange={(event) => void importReport(event.target.files?.[0] || null)}/></label></section> : null}
  </main>;
}
