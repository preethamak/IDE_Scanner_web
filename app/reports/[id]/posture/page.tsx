"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getImportedReport } from "@/lib/reportBundle";
import type { ImportedReportBundle } from "@/lib/types";

export default function ReportPosturePage({ params }: { params: Promise<{ id: string }> }) {
  const [report, setReport] = useState<ImportedReportBundle | null>(null);
  const [id, setId] = useState("");

  useEffect(() => {
    void params.then(({ id }) => {
      setId(id);
      setReport(getImportedReport(id));
    });
  }, [params]);

  const postureSummary = report?.posture.posture_summary as { status?: string; score?: number; counts?: Record<string, number>; clients?: string[]; top_findings?: Array<Record<string, unknown>> } | undefined;
  const posture = Array.isArray(report?.posture.posture) ? report?.posture.posture as Array<Record<string, unknown>> : [];

  return (
    <main className="shell">
      <section className="pageHero compactHero">
        <div>
          <p className="eyebrow">Posture</p>
          <h1>{report ? `${report.metadata.scan_id} posture` : "Posture not found"}</h1>
          <p className="heroCopy">IDE/client configuration risk as emitted by ide-scanner.</p>
        </div>
        <Link className="heroAction" href={id ? `/reports/${id}` : "/scan"}>Back to dashboard</Link>
      </section>

      <section className="statGrid">
        <Stat label="Status" value={postureSummary?.status || "skipped"} />
        <Stat label="Score" value={postureSummary?.score ?? 0} />
        <Stat label="Failures" value={postureSummary?.counts?.failure ?? 0} />
        <Stat label="Warnings" value={postureSummary?.counts?.warning ?? 0} />
        <Stat label="Clients" value={postureSummary?.clients?.length ?? 0} />
      </section>

      <section className="historyList">
        {posture.map((metric, index) => (
          <article className="historyRow" key={`${metric.client}-${metric.id}-${index}`}>
            <div>
              <strong>{String(metric.id || "metric")}</strong>
              <span>{String(metric.client || "system")}</span>
              <span>{String(metric.category || "posture")}</span>
            </div>
            <div>
              <span>{String(metric.status || "skipped")}</span>
              <span>score {Number(metric.score || 0)}</span>
            </div>
            <p>{String(metric.reason || "")}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}
