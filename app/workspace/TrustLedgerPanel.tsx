"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Fingerprint, LoaderCircle, RefreshCw, RotateCcw, ShieldAlert } from "lucide-react";
import styles from "./trustLedger.module.css";

type TrustRecord = {
  id: string;
  extension_id: string;
  version: string;
  registry: string;
  artifact_sha256: string;
  scan_id: string;
  status: "approved" | "revoked" | string;
  rationale: string;
  capability_delta?: { added?: string[]; removed?: string[]; changed?: Array<unknown>; material?: boolean };
  approved_at?: string;
  revoked_at?: string | null;
};
type Recall = {
  id: string;
  extension_id: string;
  version: string;
  artifact_sha256: string;
  reason: string;
  state: string;
  affected_installations?: { exact_matches?: number; version_only_matches?: number; affected_devices?: string[] };
  created_at: string;
};
type LedgerPayload = { records: TrustRecord[]; recalls: Recall[] };

export default function TrustLedgerPanel({ teamId, role, getAuthHeaders }: { teamId: string; role: string; getAuthHeaders: () => Promise<Record<string, string>> }) {
  const [data, setData] = useState<LedgerPayload>({ records: [], recalls: [] });
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [scanId, setScanId] = useState("");
  const [registry, setRegistry] = useState("unknown");
  const [rationale, setRationale] = useState("");
  const [saving, setSaving] = useState(false);
  const [recallTarget, setRecallTarget] = useState<TrustRecord | null>(null);
  const [recallReason, setRecallReason] = useState("");
  const canManage = ["owner", "admin", "analyst"].includes(role);

  const load = useCallback(async () => {
    setState("loading"); setError("");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/trust`, { headers });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(body.error || "The trust ledger could not be loaded."));
      setData({ records: Array.isArray(body.records) ? body.records : [], recalls: Array.isArray(body.recalls) ? body.recalls : [] });
      setState("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The trust ledger could not be loaded.");
      setState("error");
    }
  }, [getAuthHeaders, teamId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function approve(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/trust`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve", scan_id: scanId, registry, rationale }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(body.error || "The exact release could not be approved."));
      setNotice(`${body.record?.extension_id || "Release"}@${body.record?.version || ""} is now approved for this exact artifact.`);
      setScanId(""); setRationale(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The exact release could not be approved."); }
    finally { setSaving(false); }
  }

  async function recall() {
    if (!recallTarget || !recallReason.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/trust`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ action: "recall", trust_record_id: recallTarget.id, reason: recallReason.trim() }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(body.error || "The artifact could not be recalled."));
      const impact = body.impact || {};
      setNotice(`Recall opened. ${Number(impact.exact_matches || 0)} exact installation(s) and ${Number(impact.version_only_matches || 0)} version-only installation(s) need action.`);
      setRecallTarget(null); setRecallReason(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The artifact could not be recalled."); }
    finally { setSaving(false); }
  }

  async function updateRecall(recall: Recall, nextState: "acknowledged" | "closed") {
    setSaving(true); setError(""); setNotice("");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/trust`, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ recall_id: recall.id, state: nextState }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(body.error || "The recall event could not be updated."));
      setNotice(`Recall marked ${nextState}.`); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The recall event could not be updated."); }
    finally { setSaving(false); }
  }

  const approved = data.records.filter((record) => record.status === "approved");
  const openRecalls = data.recalls.filter((recall) => recall.state === "open");
  const exactImpact = openRecalls.reduce((sum, recall) => sum + Number(recall.affected_installations?.exact_matches || 0), 0);
  const uncertainImpact = openRecalls.reduce((sum, recall) => sum + Number(recall.affected_installations?.version_only_matches || 0), 0);

  return <section className={styles.ledger}>
    <header className={styles.title}><div><span>Artifact control</span><h1>Approve once. Recall precisely.</h1><p>GuardRails binds approval to a completed scan and an immutable artifact hash. A recall shows exact installations separately from inventory that has not reported its hash.</p></div><button className={styles.refresh} onClick={() => void load()}><RefreshCw /> Refresh</button></header>
    {error ? <div className={styles.error}><AlertTriangle /><span>{error}</span>{state === "error" ? <button onClick={() => void load()}>Try again</button> : null}</div> : null}
    {notice ? <div className={styles.notice}><CheckCircle2 /><span>{notice}</span></div> : null}
    <div className={styles.metrics}><article><span>Approved artifacts</span><strong>{approved.length}</strong><small>Hash-bound releases</small></article><article><span>Open recalls</span><strong>{openRecalls.length}</strong><small>Require containment</small></article><article><span>Exact impact</span><strong>{exactImpact}</strong><small>Inventory hash matched</small></article><article><span>Identity uncertain</span><strong>{uncertainImpact}</strong><small>Version matched, hash missing</small></article></div>
    {canManage ? <form className={styles.approve} onSubmit={approve}><div><span>Record an approval</span><h2>Approve from a completed scan</h2><p>The server derives extension, version, and SHA-256 from the scan. A pasted hash cannot create an approval.</p></div><label>Completed scan ID<input required value={scanId} onChange={(event) => setScanId(event.target.value)} placeholder="Scan id from the exact report" /></label><label>Registry<select value={registry} onChange={(event) => setRegistry(event.target.value)}><option value="unknown">Unknown</option><option value="vs-marketplace">Visual Studio Marketplace</option><option value="openvsx">Open VSX</option></select></label><label className={styles.wide}>Approval rationale<textarea required minLength={1} maxLength={4000} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Why is this exact release allowed?" /></label><button className={styles.primary} disabled={saving}>{saving ? <LoaderCircle className={styles.spin} /> : <Fingerprint />} {saving ? "Saving…" : "Approve exact artifact"}</button></form> : null}
    {state === "loading" && !data.records.length ? <div className={styles.loading}><LoaderCircle className={styles.spin} /> Loading trust records…</div> : null}
    <section className={styles.records}><header><span>Exact release</span><span>Decision</span><span>Capability delta</span><span>Action</span></header>{data.records.map((record) => { const delta = record.capability_delta || {}; return <article key={record.id}><div><strong>{record.extension_id}</strong><code>@{record.version}</code><small>{record.artifact_sha256}</small></div><span className={record.status === "approved" ? styles.approved : styles.revoked}>{record.status === "approved" ? "Approved" : "Recalled"}</span><span className={delta.material ? styles.warning : styles.quiet}>{delta.material ? `${(delta.added || []).length + (delta.changed || []).length} added/changed` : "No prior delta"}</span><div>{record.status === "approved" && canManage ? <button className={styles.recallButton} onClick={() => { setRecallTarget(record); setRecallReason(""); }}><ShieldAlert /> Recall</button> : <small>{record.revoked_at ? `Recalled ${new Date(record.revoked_at).toLocaleDateString()}` : "Historical record"}</small>}</div></article>; })}{!data.records.length && state !== "loading" ? <div className={styles.empty}><Fingerprint /><h2>No approved artifacts yet.</h2><p>Approve a completed scan to create the first hash-bound release decision.</p></div> : null}</section>
    {data.recalls.length ? <section className={styles.recalls}><header><div><span>Containment history</span><h2>Recall events</h2></div><small>Open events remain visible until an owner confirms containment.</small></header>{data.recalls.map((recall) => <article key={recall.id}><div><strong>{recall.extension_id}@{recall.version}</strong><code>{recall.artifact_sha256}</code><p>{recall.reason}</p></div><span className={recall.state === "closed" ? styles.approved : styles.revoked}>{recall.state}</span><small>{Number(recall.affected_installations?.exact_matches || 0)} exact · {Number(recall.affected_installations?.version_only_matches || 0)} uncertain</small>{canManage && recall.state !== "closed" ? <div className={styles.recallActions}>{recall.state === "open" ? <button disabled={saving} onClick={() => void updateRecall(recall, "acknowledged")}>Acknowledge</button> : null}<button disabled={saving} onClick={() => void updateRecall(recall, "closed")}>Close recall</button></div> : null}</article>)}</section> : null}
    {recallTarget ? <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRecallTarget(null); }}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="recall-title"><span className={styles.dialogIcon}><ShieldAlert /></span><h2 id="recall-title">Recall {recallTarget.extension_id}@{recallTarget.version}?</h2><p>This revokes approval for SHA-256 <code>{recallTarget.artifact_sha256}</code> and creates a containment event for affected inventory.</p><label>Reason<textarea required autoFocus value={recallReason} onChange={(event) => setRecallReason(event.target.value)} placeholder="Advisory, incident, or verification reason" /></label><footer><button onClick={() => setRecallTarget(null)}>Cancel</button><button className={styles.danger} disabled={saving || !recallReason.trim()} onClick={() => void recall()}>{saving ? <LoaderCircle className={styles.spin} /> : <RotateCcw />} Open recall</button></footer></section></div> : null}
  </section>;
}
