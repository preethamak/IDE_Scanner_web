"use client";

import Link from "next/link";
import { Copy, Download, Radar } from "lucide-react";

export default function ReportActions({ extensionId, version }: { extensionId: string; version: string }) {
  const exportUrl = `/api/extensions/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(version)}/export`;
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
  }
  return <div className="reportActions" aria-label="Report actions">
    <Link className="button buttonQuiet" href={`/monitor?extension=${encodeURIComponent(extensionId)}`}><Radar size={15}/> Monitor release</Link>
    <a className="button buttonQuiet" href={exportUrl}><Download size={15}/> Export evidence</a>
    <button className="button buttonQuiet" type="button" onClick={() => void copyLink()}><Copy size={15}/> Copy link</button>
  </div>;
}
