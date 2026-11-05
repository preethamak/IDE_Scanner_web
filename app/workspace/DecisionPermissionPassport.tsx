"use client";

import { useEffect, useMemo, useState } from "react";
import PermissionPassport from "@/app/extensions/PermissionPassport";
import { buildPermissionPassport } from "@/lib/permissionPassport";
import { browserDb } from "@/lib/supabase";
import { browserAuthHeaders } from "@/lib/browserAuth";
import type { QueueDecision } from "@/lib/teamDecisionQueue";

export default function DecisionPermissionPassport({ teamId, decision }: { teamId: string; decision: QueueDecision }) {
  const db = useMemo(() => browserDb(), []);
  const [state, setState] = useState<{ scan?: Record<string, unknown>; error?: string }>({});
  useEffect(() => {
    let cancelled = false;
    void browserAuthHeaders(db).then((headers) => fetch(`/api/teams/${encodeURIComponent(teamId)}/decisions/${encodeURIComponent(decision.id)}/evidence`, { headers, cache: "no-store" }))
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.scan?.id) throw new Error(body.error || "Decision evidence could not be loaded.");
        if (!cancelled) setState({ scan: body.scan });
      })
      .catch(() => { if (!cancelled) setState({ error: "Decision evidence could not be loaded. Open the exact report to inspect it." }); });
    return () => { cancelled = true; };
  }, [db, teamId, decision.id]);
  const reportHref = `/extensions/${encodeURIComponent(decision.extension_id)}/versions/${encodeURIComponent(decision.version)}/scans/${encodeURIComponent(decision.scan_id)}`;
  if (state.error) return <p role="alert">{state.error} <a href={reportHref}>Open exact report</a></p>;
  if (!state.scan) return <p role="status">Loading exact-release permissions…</p>;
  return <PermissionPassport compact passport={buildPermissionPassport({ extensionId: decision.extension_id, version: decision.version, latestVersion: decision.version, scan: state.scan })} reportHref={reportHref} />;
}
