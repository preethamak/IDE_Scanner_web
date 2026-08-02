"use client";

import { AlertTriangle, FileArchive, ShieldCheck, Upload } from "lucide-react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { parseReportBundle, saveImportedReport } from "@/lib/reportBundle";

type Mode = "upload" | "report";

export default function AnalyzePage() { return <Suspense fallback={<main className="scannerPage pageWrap"><div className="message">Loading Analyze…</div></main>}><Analyze /></Suspense>; }

function Analyze() {
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const [mode, setMode] = useState<Mode>(requestedMode === "report" ? "report" : "upload");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  async function importReport(file: File | null) { if (!file) return; try { const bundle = await parseReportBundle(file); saveImportedReport(bundle); window.location.assign(`/reports/${encodeURIComponent(bundle.id)}`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Report import failed."); } }
  async function analyzeUpload() { if (!uploadFile) return; setUploading(true); setError(""); try { const data = new FormData(); data.append("file", uploadFile); const response = await fetch("/api/scans/upload", { method: "POST", body: data }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Package preview failed."); setError("Your package preview is ready. Import a scanner report when you need the full security assessment."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Package preview failed."); } finally { setUploading(false); } }
  return <main className="scannerPage pageWrap">
    <section className="scannerIntro"><div><span className="kicker">Analyze a file</span><h1>Check a file you already have.</h1><p>Upload a VSIX for a quick capability preview or open a scanner report you received. To find a Marketplace extension, use the Extension Registry.</p></div><div className="scannerAssurance"><span><ShieldCheck size={17}/> Package code is not executed</span><span><ShieldCheck size={17}/> Your file stays private</span></div></section>
    <div className="modeTabs" role="tablist" aria-label="Analyze input"><button className={mode === "upload" ? "active" : ""} onClick={() => setMode("upload")}>Upload VSIX</button><button className={mode === "report" ? "active" : ""} onClick={() => setMode("report")}>Import report</button></div>
    {error ? <div className="message errorMessage"><AlertTriangle size={17}/>{error}</div> : null}
    {mode === "upload" ? <section className="uploadWorkspace"><div><span className="kicker">Private file</span><h2>Upload a VSIX or ZIP</h2><p>Use this for an extension file on your computer. The preview checks what it can do; a full report provides the security assessment.</p></div><label className="uploadDrop"><Upload size={28}/><strong>{uploadFile?.name || "Choose extension package"}</strong><span>VSIX or ZIP · maximum 50 MB</span><input type="file" accept=".vsix,.zip" onChange={(event) => setUploadFile(event.target.files?.[0] || null)}/></label><button className="button buttonDark" disabled={!uploadFile || uploading} onClick={() => void analyzeUpload()}>{uploading ? "Analyzing…" : "Preview capabilities"}</button></section> : null}
    {mode === "report" ? <section className="uploadWorkspace"><div><span className="kicker">Scanner report</span><h2>Import a report.zip</h2><p>Open a report you received in this browser, including its findings and coverage details.</p></div><label className="uploadDrop"><FileArchive size={28}/><strong>Choose report.zip</strong><span>Scanner report bundle</span><input type="file" accept=".zip,application/zip" onChange={(event) => void importReport(event.target.files?.[0] || null)}/></label></section> : null}
  </main>;
}
