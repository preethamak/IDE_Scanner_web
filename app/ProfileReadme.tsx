"use client";

import { useEffect, useState } from "react";
import Markdown from "@/app/Markdown";
import { selectPackagedReadme } from "@/lib/dossierPresentation";
import type { ReportFile } from "@/lib/reportContract";

type Props = {
  extensionId: string;
  version: string;
  scanId: string;
  files: ReportFile[];
  documentationUrl: string;
};

export default function ProfileReadme({ extensionId, version, scanId, files, documentationUrl }: Props) {
  const readme = selectPackagedReadme(files);
  const [source, setSource] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">(readme?.preview_available ? "loading" : "unavailable");

  useEffect(() => {
    if (!readme?.preview_available || !scanId) return;
    const controller = new AbortController();
    void fetch(`/api/extensions/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(version)}/source?path=${encodeURIComponent(String(readme.path))}&scan=${encodeURIComponent(scanId)}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.content) throw new Error("README unavailable");
        setSource(String(body.content));
        setState("ready");
      })
      .catch(() => { if (!controller.signal.aborted) setState("unavailable"); });
    return () => controller.abort();
  }, [extensionId, readme?.path, readme?.preview_available, scanId, version]);

  return <section id="readme" className="profileSection profileReadme">
    <header><span>README</span><h2>About this extension</h2></header>
    {state === "loading" ? <p>Loading README…</p> : source ? <Markdown source={source} /> : <p>Read the publisher’s <a href={documentationUrl} target="_blank" rel="noreferrer">documentation</a>.</p>}
  </section>;
}
