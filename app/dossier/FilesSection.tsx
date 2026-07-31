"use client";

import { Fragment, useState } from "react";
import { FileCode2 } from "lucide-react";
import DossierSectionHead from "@/app/dossier/DossierSectionHead";
import type { ReportFile } from "@/lib/reportContract";

export default function FilesSection({ id, version, scanId, files }: { id: string; version: string; scanId: string; files: ReportFile[] }) {
  const [preview, setPreview] = useState<{ path: string; content: string; sha256?: string; truncated?: boolean } | null>(null);
  const [error, setError] = useState(""); const [loading, setLoading] = useState("");
  async function open(path: string) { setLoading(path); setError(""); try { const response = await fetch(`/api/extensions/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/source?path=${encodeURIComponent(path)}&scan=${encodeURIComponent(scanId)}`); const body = await response.json().catch(() => ({})); if (!response.ok) return setError(String(body.error || "Preview is unavailable.")); setPreview({ path, content: String(body.content || ""), sha256: String(body.content_sha256 || ""), truncated: Boolean(body.truncated) }); } catch { setError("Preview could not be loaded. Try again."); } finally { setLoading(""); } }
  return <><DossierSectionHead eyebrow="Artifact files" title="Files captured in this exact artifact" detail="Preview is available only when this report retained a verified text snapshot." />
    {files.length ? <div className="dossierFiles"><div><span>/</span><span>{files.length} files</span></div>{files.slice(0, 500).map((item) => { const path = String(item.path); const available = item.preview_available === true; return <Fragment key={path}><article className={preview?.path === path ? "previewOpen" : ""}><FileCode2/><code>{path}</code><span>{formatBytes(Number(item.size_bytes || 0))}</span><small>{String(item.sha256 || "").slice(0, 12)}</small>{available ? <button type="button" onClick={() => void open(path)} disabled={loading === path}>{loading === path ? "Loading…" : preview?.path === path ? "Refresh" : "Preview"}</button> : <em>Not captured</em>}</article>{preview?.path === path ? <section className="sourcePreview inlineSourcePreview"><header><strong>{preview.path}</strong><span>{preview.truncated ? "Truncated snapshot" : "Verified snapshot"} · {preview.sha256?.slice(0, 12)}</span><button type="button" onClick={() => setPreview(null)}>Close</button></header><pre>{preview.content}</pre></section> : null}</Fragment>; })}</div> : <div className="dossierEmpty"><p>The file inventory was not emitted by this scan.</p></div>}
    {error ? <p className="previewError">{error}</p> : null}</>;
}

function formatBytes(value: number) { return value < 1024 ? `${value} B` : value < 1024 ** 2 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 ** 2).toFixed(1)} MB`; }
