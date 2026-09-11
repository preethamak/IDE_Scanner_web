"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BrainCircuit, LoaderCircle, ShieldAlert } from "lucide-react";
import styles from "./evidenceReviewBrief.module.css";

type Audience = "security_lead" | "engineer" | "publisher";
type Brief = {
  headline: string;
  what_changed: string[];
  why_it_matters: string[];
  verify_next: string[];
  uncertainties: string[];
  evidence_refs: string[];
  model: string;
  deterministic_decision: string;
};

export default function EvidenceReviewBrief({
  extensionId,
  version,
  scanId,
  signedIn,
}: {
  extensionId: string;
  version: string;
  scanId: string;
  signedIn: boolean;
}) {
  const [audience, setAudience] = useState<Audience>("security_lead");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function generate() {
    setState("loading");
    setMessage("");
    try {
      const response = await fetch(`/api/extensions/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(version)}/scans/${encodeURIComponent(scanId)}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setState("error");
        setMessage(String(body.error || "The evidence brief could not be generated."));
        return;
      }
      setBrief(body as Brief);
      setState("idle");
    } catch {
      setState("error");
      setMessage("The evidence brief service is temporarily unavailable.");
    }
  }

  return (
    <section className={styles.card} aria-labelledby="evidence-brief-heading">
      <div className={styles.header}>
        <div className={styles.icon} aria-hidden="true"><BrainCircuit /></div>
        <div>
          <span className={styles.eyebrow}>Evidence review brief</span>
          <h2 id="evidence-brief-heading">Reason over the evidence, not over a generic prompt.</h2>
          <p>Uses the bounded findings for this exact release to prepare review questions. It cannot change the GuardRails decision.</p>
        </div>
      </div>
      {!signedIn ? (
        <div className={styles.signIn}>
          <ShieldAlert aria-hidden="true" />
          <p><strong>Sign in to generate a brief.</strong> This protects the Sarvam budget and keeps generation tied to a real reviewer.</p>
          <Link href="/account">Sign in <ArrowRight aria-hidden="true" /></Link>
        </div>
      ) : (
        <div className={styles.controls}>
          <label>
            <span>Review lens</span>
            <select value={audience} onChange={(event) => setAudience(event.target.value as Audience)} disabled={state === "loading"}>
              <option value="security_lead">Security lead</option>
              <option value="engineer">Engineering reviewer</option>
              <option value="publisher">Publisher response</option>
            </select>
          </label>
          <button type="button" onClick={() => void generate()} disabled={state === "loading"}>
            {state === "loading" ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <BrainCircuit aria-hidden="true" />}
            {state === "loading" ? "Preparing brief…" : brief ? "Regenerate brief" : "Generate brief"}
          </button>
        </div>
      )}
      {state === "error" ? <p className={styles.error} role="alert">{message}</p> : null}
      {brief ? <BriefResult brief={brief} /> : null}
    </section>
  );
}

function BriefResult({ brief }: { brief: Brief }) {
  return (
    <div className={styles.result}>
      <div className={styles.resultHead}>
        <strong>{brief.headline}</strong>
        <small>{brief.model} · decision remains <code>{brief.deterministic_decision}</code></small>
      </div>
      <BriefList title="What the evidence shows" items={brief.what_changed} />
      <BriefList title="Why a reviewer should care" items={brief.why_it_matters} />
      <BriefList title="Verify next" items={brief.verify_next} />
      {brief.uncertainties.length ? <BriefList title="Uncertainties" items={brief.uncertainties} quiet /> : null}
      {brief.evidence_refs.length ? <div className={styles.refs}><span>Evidence refs</span>{brief.evidence_refs.map((ref) => <code key={ref}>{ref}</code>)}</div> : null}
      <p className={styles.disclosure}>AI-generated decision support. The exact artifact, deterministic analyzers, coverage, and human decision remain authoritative.</p>
    </div>
  );
}

function BriefList({ title, items, quiet = false }: { title: string; items: string[]; quiet?: boolean }) {
  return <section className={quiet ? styles.listQuiet : styles.list}><h3>{title}</h3><ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul></section>;
}
