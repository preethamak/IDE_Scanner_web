"use client";

import { useEffect, useState } from "react";
import { CircleCheck, FileText } from "lucide-react";
import DossierSectionHead from "@/app/dossier/DossierSectionHead";
import Markdown from "@/app/Markdown";
import { selectPackagedReadme } from "@/lib/dossierPresentation";
import type { ReportFile } from "@/lib/reportContract";

export default function ReadmeSection({ id, version, scanId, files }: { id: string; version: string; scanId: string; files: ReportFile[] }) {
  const readme = selectPackagedReadme(files);
  const readmePath = readme ? String(readme.path) : "";
  const previewable = Boolean(readme && readme.preview_available === true);
  const [source, setSource] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  useEffect(() => {
    if (!previewable || !readmePath) return;
    const timer = window.setTimeout(() => {
      setState("loading");
      void fetch(`/api/extensions/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/source?path=${encodeURIComponent(readmePath)}&scan=${encodeURIComponent(scanId)}`)
        .then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(String(body.error || "README unavailable."));
          setSource(String(body.content || "")); setState("idle");
        }).catch(() => setState("error"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, version, scanId, readmePath, previewable]);
  return <>
    <DossierSectionHead eyebrow="Documentation" title="Publisher README" detail="Rendered from the README packaged inside this exact artifact — not fetched live from the Marketplace." />
    {!readme ? <Empty text="No README was packaged inside this exact artifact." /> : !previewable ? <div className="ds-readme-empty"><FileText/><strong>README packaged but not captured</strong><p>This scan did not retain a verified text snapshot of the packaged README.</p></div> : state === "loading" ? <div className="dossierEmpty"><p>Loading README…</p></div> : state === "error" ? <p className="previewError">The README could not be loaded.</p> : source ? <article className="ds-card ds-readme"><Markdown source={source} /></article> : <Empty text="The README snapshot was empty." />}
  </>;
}

function Empty({ text }: { text: string }) { return <div className="dossierEmpty"><CircleCheck/><p>{text}</p></div>; }
