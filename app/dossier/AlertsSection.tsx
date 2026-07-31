import { ChevronRight, CircleCheck } from "lucide-react";
import DossierSectionHead from "@/app/dossier/DossierSectionHead";

export type EvidenceGroupData = { rule: string; summary: string; severity: string; count: number; locations: string[]; actionability: string; evidenceClasses: string[] };

export default function AlertsSection({ actionableGroups, lowGroups, contextualGroups }: { actionableGroups: EvidenceGroupData[]; lowGroups: EvidenceGroupData[]; contextualGroups: EvidenceGroupData[] }) {
  return <>
    <DossierSectionHead eyebrow="Evidence" title="Evidence, grouped by behavior" detail="Repeated locations are one behavior group. Expand a group to inspect every recorded location and evidence class." />
    {actionableGroups.length ? <div className="dossierRows">{actionableGroups.map((group) => <EvidenceGroup key={group.rule} group={group} />)}</div> : <Empty text="No behavior group requires review under the completed policy." />}
    {lowGroups.length ? <details className="contextEvidence"><summary>{lowGroups.length} low-severity hardening note{lowGroups.length === 1 ? "" : "s"} — visible but non-blocking</summary><div className="dossierRows">{lowGroups.map((group) => <EvidenceGroup key={group.rule} group={group} />)}</div></details> : null}
    {contextualGroups.length ? <details className="contextEvidence"><summary>{contextualGroups.length} contextual behavior group{contextualGroups.length === 1 ? "" : "s"} — not standalone security evidence</summary><div className="dossierRows">{contextualGroups.map((group) => <EvidenceGroup key={group.rule} group={group} />)}</div></details> : null}
  </>;
}

function EvidenceGroup({ group }: { group: EvidenceGroupData }) {
  return <details className="ds-evidence"><summary><span className={`ds-pill ${pillVariant(group.severity)}`}>{displaySeverity(group.severity)}</span><div className="ds-evidence-body"><strong>{group.summary}</strong><p>{group.count} observed location{group.count === 1 ? "" : "s"} · {actionabilityLabel(group.actionability)}</p><code>{group.rule} · {group.evidenceClasses.join(", ")} evidence</code></div><ChevronRight className="ds-evidence-chevron" /></summary><div className="ds-evidence-locations"><p>{group.count} observation{group.count === 1 ? "" : "s"}. Every recorded location is listed below.</p>{group.locations.length ? group.locations.map((location) => <code key={location}>{location}</code>) : <small>No file location was recorded.</small>}</div></details>;
}

function Empty({ text }: { text: string }) { return <div className="dossierEmpty"><CircleCheck/><p>{text}</p></div>; }
function displaySeverity(value: string) { return value === "INFO" ? "INFORMATIONAL" : value; }
function pillVariant(severity: string) { const rank = severityRank(severity); return rank >= 4 ? "block" : rank === 3 ? "review" : rank === 2 ? "info" : "allow"; }
function severityRank(value: string) { return ({ CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 } as Record<string, number>)[value] || 0; }
function actionabilityLabel(value: string) { return value === "block" ? "block evidence" : value === "investigate" ? "investigation evidence" : value === "review" ? "review evidence" : value === "low" ? "low hardening note" : "contextual observation"; }
