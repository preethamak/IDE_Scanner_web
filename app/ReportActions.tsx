"use client";

import Link from "next/link";
import { Copy, Download, Radar } from "lucide-react";
import TeamDecisionAction from "@/app/TeamDecisionAction";
import { browserDb } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

export default function ReportActions({ extensionId, version, scanId }: { extensionId: string; version: string; scanId: string }) {
  const db = useMemo(() => browserDb(), []);
  const [signedIn, setSignedIn] = useState(false);
  const exportUrl = `/api/extensions/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(version)}/export`;
  const monitorPath = `/monitor?extension=${encodeURIComponent(extensionId)}`;
  useEffect(() => {
    void db?.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, [db]);
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
  }
  return <div className="reportActions" aria-label="Report actions">
    <Link className="button buttonQuiet" href={signedIn ? monitorPath : `/account?next=${encodeURIComponent(monitorPath)}`}><Radar size={15}/>{signedIn ? "Monitor extension" : "Create workspace to monitor"}</Link>
    <a className="button buttonQuiet" href={exportUrl}><Download size={15}/> Export evidence</a>
    <button className="button buttonQuiet" type="button" onClick={() => void copyLink()}><Copy size={15}/> Copy link</button>
    <TeamDecisionAction scanId={scanId} extensionId={extensionId}/>
  </div>;
}
