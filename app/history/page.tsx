"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteImportedReport, listImportedReports } from "@/lib/reportBundle";
import type { ImportedReportBundle } from "@/lib/types";

export default function HistoryPage() {
  const [reports, setReports] = useState<ImportedReportBundle[]>([]);

  useEffect(() => {
    queueMicrotask(() => setReports(listImportedReports()));
  }, []);

  function remove(id: string) {
    deleteImportedReport(id);
    setReports(listImportedReports());
  }

  return (
    <main className="shell">
      <section className="pageHero compactHero">
        <div>
          <p className="eyebrow">History</p>
          <h1>Imported reports</h1>
          <p className="heroCopy">Report bundles are stored in this browser after explicit import.</p>
        </div>
        <Link className="heroAction" href="/analyze?mode=report">Import report</Link>
      </section>

      <section className="historyList">
        {reports.length === 0 ? <p>No imported reports yet.</p> : null}
        {reports.map((report) => (
          <article className="historyRow" key={report.id}>
            <div>
              <strong>{report.metadata.scan_id}</strong>
              <span>{new Date(report.metadata.created_at).toLocaleString()}</span>
              <span>{report.metadata.source}</span>
              <span>{report.metadata.profile}</span>
            </div>
            <div>
              <span>{report.summary.summary.total_extensions} extensions</span>
              <span>risk {report.summary.summary.max_risk_score}</span>
              <span>malware {report.summary.summary.max_malware_score}</span>
              <span>scanner {report.metadata.scanner_version}</span>
            </div>
            <div className="historyActions">
              <Link href={`/reports/${report.id}`}>Open</Link>
              <button type="button" onClick={() => remove(report.id)}>Delete</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
