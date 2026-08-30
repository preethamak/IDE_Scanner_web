"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import TeamDecisionAction from "@/app/TeamDecisionAction";
import MonitorExtensionAction from "@/app/MonitorExtensionAction";

export default function ReportActions({ extensionId, version, scanId }: { extensionId: string; version: string; scanId: string }) {
  const exportUrl = `/api/extensions/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(version)}/export`;
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return <div className="reportActions" aria-label="Report actions">
    <MonitorExtensionAction extensionId={extensionId} version={version} scanId={scanId}/>
    <a className="button buttonQuiet" href={exportUrl}><Download size={15}/> Export evidence</a>
    <button className="button buttonQuiet" type="button" onClick={() => void copyLink()}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "Copied" : "Copy link"}</button>
    <TeamDecisionAction scanId={scanId} extensionId={extensionId}/>
  </div>;
}
