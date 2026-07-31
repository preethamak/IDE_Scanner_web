"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CircleCheck, GitCompareArrows } from "lucide-react";
import DossierSectionHead from "@/app/dossier/DossierSectionHead";
import type { ReportObject, ReportVersion } from "@/lib/reportContract";

type WhyLine = { text: string; tone: "up" | "down" | "flat" };
type CompareResult = ReportObject & {
  comparable?: boolean;
  reason?: string;
  changes?: ReportObject;
  to?: ReportObject;
  attribution?: ReportObject;
};

export default function ChangesSection({ id, current, versions }: { id: string; current: string; versions: ReportVersion[] }) {
  const candidates = versions.map((item) => item.version).filter((item) => item && item !== current);
  const [baseline, setBaseline] = useState(candidates[0] || "");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (!baseline) return;
    const timer = window.setTimeout(() => {
      setState("loading");
      void fetch(`/api/extensions/${encodeURIComponent(id)}/compare?from=${encodeURIComponent(baseline)}&to=${encodeURIComponent(current)}`)
        .then(async (response) => {
          const body = (await response.json()) as CompareResult;
          if (!response.ok) throw new Error(String(body.error || "Comparison failed."));
          setResult(body);
          setState("idle");
        })
        .catch(() => setState("error"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [baseline, current, id]);

  if (!candidates.length) return <>
    <DossierSectionHead eyebrow="Release changes" title="No second analyzed version yet" detail="A comparison appears only after two exact versions have normalized Deep Scan evidence." />
    <Empty text="Monitor this extension to analyze and compare its next release." />
  </>;

  const changes = object(result?.changes);
  const side = object(result?.to);
  const attribution = object(result?.attribution);
  const evidenceComparable = Boolean(attribution.evidence_changes);
  const story = result?.comparable ? whyChanged(changes, evidenceComparable) : [];
  return <>
    <DossierSectionHead eyebrow="Why this changed" title={`What changed in ${current}`} detail="Plain-language summary of the difference from the last reviewed release, computed from two stored scan records — not inferred from version numbers or marketing copy." />
    <label className="comparisonPicker"><span>Compare against last reviewed</span><select value={baseline} onChange={(event) => setBaseline(event.target.value)}>{candidates.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
    {state === "loading" ? <div className="dossierEmpty"><p>Computing normalized evidence changes…</p></div> : null}
    {state === "error" ? <div className="previewError">The comparison could not be generated.</div> : null}
    {result && result.comparable === false ? <Unavailable detail={String(result.reason || "Both versions require completed Deep Scan evidence.")} /> : null}
    {result?.comparable ? <div className="changeDashboard">
      <ChangeStory story={story} baseline={baseline} current={current} />
      {!evidenceComparable ? <Unavailable title="Mixed analysis baseline" detail={String(attribution.note || "Comparable evidence is unavailable for one release.")} /> : null}
      <div className="changeSummary"><Fact label="Current outcome" value={String(side.decision || "unknown").toUpperCase()} /><Fact label="Coverage" value={`${Number(side.coverage_percent || 0)}%`} /><Fact label="Findings" value={String(side.findings || 0)} /><Fact label="Files" value={String(side.files || 0)} /></div>
      {evidenceComparable ? <><ChangeGroup title="Findings" value={changes.findings} /><ChangeGroup title="Capabilities" value={changes.capabilities} /></> : null}
      <ChangeGroup title="Dependencies" value={changes.dependencies} /><ChangeGroup title="Files" value={changes.files} />
    </div> : null}
  </>;
}

function ChangeStory({ story, baseline, current }: { story: WhyLine[]; baseline: string; current: string }) {
  if (!story.length) return <div className="whyStory whyStoryQuiet"><span className="whyStoryEyebrow"><CircleCheck /> {baseline} → {current}</span><p>No decision-relevant differences were detected between these two analyzed releases.</p></div>;
  return <div className="whyStory"><span className="whyStoryEyebrow"><GitCompareArrows /> {baseline} → {current}</span><ul>{story.map((line, index) => <li key={index} className={`whyLine ${line.tone}`}><span className="whyLineIcon">{line.tone === "up" ? <AlertTriangle /> : line.tone === "down" ? <CircleCheck /> : <GitCompareArrows />}</span><p>{line.text}</p></li>)}</ul><p className="whyStoryFoot">Expand any group below to see the exact files and evidence behind each line.</p></div>;
}

function Unavailable({ title = "Not comparable yet", detail }: { title?: string; detail: string }) { return <div className="comparisonUnavailable"><AlertTriangle /><strong>{title}</strong><p>{detail}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="dossierEmpty"><CircleCheck /><p>{text}</p></div>; }
function Fact({ label, value }: { label: string; value: string }) { return <article><span>{label}</span><strong>{value}</strong></article>; }

function ChangeGroup({ title, value }: { title: string; value: unknown }) {
  const entries = Object.entries(object(value)).filter(([, items]) => Array.isArray(items) && items.length);
  return <section className="changeGroup"><header><strong>{title}</strong><span>{entries.reduce((count, [, items]) => count + (items as unknown[]).length, 0)} changes</span></header>{entries.length ? entries.map(([kind, items]) => <details key={kind}><summary>{kind} · {(items as unknown[]).length}</summary><div>{(items as unknown[]).slice(0, 50).map((item, index) => <code key={`${kind}-${index}`}>{itemLabel(item)}</code>)}</div></details>) : <p>No normalized {title.toLowerCase()} changes.</p>}</section>;
}

function whyChanged(changes: ReportObject, evidenceComparable: boolean): WhyLine[] {
  const lines: WhyLine[] = [];
  const decision = object(object(changes.outcome).decision);
  if (decision.changed) {
    const from = String(decision.from || "unknown").toUpperCase();
    const to = String(decision.to || "unknown").toUpperCase();
    lines.push({ text: `The security decision moved from ${from} to ${to}.`, tone: severityRank(to) >= severityRank(from) ? "up" : "down" });
  }
  if (evidenceComparable) addEvidenceLines(lines, changes);
  addDependencyAndFileLines(lines, changes);
  return lines;
}

function addEvidenceLines(lines: WhyLine[], changes: ReportObject) {
  const caps = object(changes.capabilities);
  const addedCaps = array(caps.added).map((value) => capabilityPhrase(String(value)));
  const removedCaps = array(caps.removed).map((value) => capabilityPhrase(String(value)));
  if (addedCaps.length) lines.push({ text: `The new version added ${humanList(addedCaps)}.`, tone: "up" });
  if (removedCaps.length) lines.push({ text: `The new version no longer requests ${humanList(removedCaps)}.`, tone: "down" });
  const findings = object(changes.findings);
  const added = array(findings.added);
  const removed = array(findings.removed);
  if (added.length) lines.push({ text: `${added.length} new behavior finding${added.length === 1 ? "" : "s"} appeared, including "${String(object(added[0]).summary || object(added[0]).rule_id)}".`, tone: "up" });
  if (removed.length) lines.push({ text: `${removed.length} previously flagged finding${removed.length === 1 ? " was" : "s were"} resolved.`, tone: "down" });
}

function addDependencyAndFileLines(lines: WhyLine[], changes: ReportObject) {
  const dependencies = object(changes.dependencies);
  const added = array(dependencies.added);
  const removed = array(dependencies.removed);
  if (added.length) lines.push({ text: `${added.length} runtime ${added.length === 1 ? "dependency was" : "dependencies were"} added (${humanList(added.slice(0, 3).map((item) => String(object(item).name || item)))}${added.length > 3 ? ", …" : ""}).`, tone: "up" });
  if (removed.length) lines.push({ text: `${removed.length} runtime ${removed.length === 1 ? "dependency was" : "dependencies were"} removed.`, tone: "down" });
  const files = object(changes.files);
  const counts = ["added", "removed", "changed"].map((kind) => [kind, array(files[kind]).length] as const).filter(([, count]) => count);
  if (counts.length) {
    const total = counts.reduce((sum, [, count]) => sum + count, 0);
    lines.push({ text: `The packaged artifact differs: ${humanList(counts.map(([kind, count]) => `${count} ${kind}`))} file${total === 1 ? "" : "s"}.`, tone: "flat" });
  }
}

function object(value: unknown): ReportObject { return value && typeof value === "object" && !Array.isArray(value) ? value as ReportObject : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function itemLabel(value: unknown) { const item = object(value); return String(item.rule_id || item.path || item.name || value); }
function humanList(items: string[]) { return items.length === 1 ? items[0] : items.length === 2 ? `${items[0]} and ${items[1]}` : `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`; }
function capabilityPhrase(key: string) { return CAPABILITY_PHRASES[key.toLowerCase()] || key.replaceAll("_", " "); }
function severityRank(value: string) { return ({ CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 } as Record<string, number>)[value] || 0; }
const CAPABILITY_PHRASES: Record<string, string> = { network: "network access", outbound_network: "outbound network access", filesystem: "filesystem access", file_write: "the ability to write files", shell: "shell or command execution", process: "process spawning", process_exec: "process execution", child_process: "child-process execution", environment: "access to environment variables", clipboard: "clipboard access", credentials: "access to stored credentials", activation: "its activation behavior" };
