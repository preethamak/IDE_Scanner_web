import Link from "next/link";
import { ArrowLeft, BadgeCheck, Fingerprint, LockKeyhole } from "lucide-react";
import ExtensionIdentity from "@/app/ExtensionIdentity";
import ReportActions from "@/app/ReportActions";
import { decisionExplanation, decisionLabel } from "@/lib/dossierPresentation";
import type { ExtensionDossierData } from "@/lib/reportContract";
import styles from "./reportHero.module.css";

type Props = Pick<ExtensionDossierData, "id" | "version" | "extension" | "scan" | "files" | "dependencies"> & {
  decision: string;
  actionable: number;
  contextual: number;
  capabilities: number;
  coverage: number;
  coverageLabel: string;
};

export default function ReportHero({ id, version, extension, scan, files, dependencies, decision, actionable, contextual, capabilities, coverage, coverageLabel }: Props) {
  const nextAction = decision === "allow" ? "Proceed under normal extension controls" : decision === "block" ? "Do not install this version" : decision === "review" ? "Record a team decision before approval" : "Wait for complete analysis";
  return <>
    <div className={styles.utility}>
      <Link href={`/extensions/${encodeURIComponent(id)}`}><ArrowLeft/> Extension profile</Link>
      <span><LockKeyhole/> Immutable</span>
      <code>{id}@{version}</code>
      <span><Fingerprint/> sha256 {shortHash(String(scan.artifact_sha256 || "Not reported"))}</span>
      <span>scan {shortHash(String(scan.id || "Not reported"))}</span>
      <details><summary>What is immutable?</summary><p>Future scans cannot replace the artifact, findings, coverage, scanner, or ruleset shown on this URL.</p></details>
    </div>
    <header className={styles.hero}>
      <section className={styles.identity}>
        <ExtensionIdentity size="lg" eyebrow="Exact-release report" id={id} version={version} name={extension.display_name} iconUrl={extension.icon_url} publisher={extension.publisher} verified={extension.publisher_verified}/>
        <p>Evidence and conclusions apply only to this package version and artifact hash.</p>
      </section>
      <section className={`${styles.outcome} ${styles[decision]}`}>
        <span>Scan result</span>
        <h1>{decisionLabel(decision)}</h1>
        <p>{String(scan.decision_reason || decisionExplanation(decision))}</p>
        <strong>{nextAction}</strong>
      </section>
      <aside className={styles.actions}>
        <span>Keep the decision useful</span>
        <p>Monitor the release, compare a baseline, or record the team decision.</p>
        <ReportActions extensionId={id} version={version} scanId={scan.id}/>
      </aside>
    </header>
    <section className={styles.metrics} aria-label="Exact-release evidence snapshot">
      <article><strong>{actionable}</strong><span>Actionable</span><small>{contextual} contextual</small></article>
      <article><strong>{capabilities}</strong><span>Capabilities</span><small>Power, not intent</small></article>
      <article><strong>{coverage}%</strong><span>Coverage</span><small>{coverageLabel}</small></article>
      <article><strong>{files.length.toLocaleString()}</strong><span>Files</span><small>{dependencies.length} dependencies</small></article>
      <article><BadgeCheck/><span>Identity bound</span><small>{extension.registry || "Registry reported"}</small></article>
    </section>
  </>;
}

function shortHash(value: string) {
  return value.length > 20 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}
