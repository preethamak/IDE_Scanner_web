"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { evidenceClasses, metricCatalog } from "@/lib/metrics";
import type { ActiveRuleCatalog } from "@/lib/rules";

const dimensions = [
  ["Behavior safety", "Process, network, filesystem, credential, webview and agent behavior deductions."],
  ["Supply-chain integrity", "Lifecycle, mutable sources, registry intelligence and release provenance."],
  ["Dependency health", "Resolved direct and transitive runtime packages plus known advisories."],
  ["Artifact integrity", "Exact hashes, signatures, native payloads, packed content and evasion indicators."],
  ["Publisher & project", "Verification, maintenance, repository and security-policy context."],
  ["Analysis confidence", "Executable coverage and successful completion of required analyzers."],
];

export default function MetricsCatalog({ catalog }: { catalog: ActiveRuleCatalog | null }) {
  const [query, setQuery] = useState("");
  const [engine, setEngine] = useState("all");
  const rules = catalog?.rules || [];
  const engines = ["all", ...Array.from(new Set(rules.map((item) => item.engine)))];
  const filtered = useMemo(() => rules.filter((item) => {
    const text = `${item.id} ${item.title} ${item.category} ${item.description}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (engine === "all" || item.engine === engine);
  }), [rules, query, engine]);
  const versionLabel = catalog?.rulesetVersion || "Unavailable";

  return <main className="shell referencePage">
    <section className="pageHero referenceHero"><div><p className="eyebrow">Detection catalog · ruleset {versionLabel}</p><h1>Inspect what the scanner can actually detect.</h1><p className="heroCopy">Search the deterministic rules behind report evidence, see which analyzer emits each signal, and understand the artifact surface it covers. A rule match remains evidence—not an automatic vulnerability claim.</p></div><Link className="heroAction" href="/analyze">Analyze an artifact</Link></section>
    <section className="referenceStats"><div><strong>{rules.length || "—"}</strong><span>registered rules</span></div><div><strong>{rules.length ? engines.length - 1 : "—"}</strong><span>detection engines</span></div><div><strong>{evidenceClasses.length}</strong><span>evidence classes</span></div><div><strong>{versionLabel}</strong><span>active ruleset</span></div></section>
    <section className="dimensionReference"><div className="sectionIntro"><p className="eyebrow">Analysis surfaces</p><h2>Where report evidence comes from.</h2><p>These are inspection boundaries, not grades. The report groups their output into reviewable behavior and keeps missing analyzer coverage visible.</p></div><div>{dimensions.map(([name, detail]) => <article key={name}><strong>{name}</strong><p>{detail}</p><span>Recorded with source and analyzer provenance</span></article>)}</div></section>
    <section className="metricDomainGrid">{metricCatalog.map((metric, index) => <article key={metric.id}><span>{String(index + 1).padStart(2, "0")}</span><h2>{metric.label}</h2><strong>{metric.short}</strong><p>{metric.detail}</p><p className="metricWhy">Reviewer use: {metric.why}</p><div>{metric.outputs.map((output) => <code key={output}>{output}</code>)}</div></article>)}</section>
    <section className="evidenceSection"><div className="sectionIntro"><p className="eyebrow">Evidence taxonomy</p><h2>Strength describes evidence, not certainty.</h2><p>Evidence class controls how a finding can affect policy. Severity describes potential impact. Neither is a calibrated probability that an extension is malicious.</p></div><div className="evidenceGrid">{evidenceClasses.map(([label, text]) => <article key={label}><strong>{label}</strong><p>{text}</p></article>)}</div></section>
    <section className="ruleCatalogSection"><div className="catalogHeader"><div><p className="eyebrow">Authoritative registry</p><h2>Detection rule catalog</h2><p>{catalog ? `${filtered.length} of ${rules.length} rules shown. Findings retain the rule id, file, line, evidence class, severity, and engine output where available.` : "No active immutable scanner release is available, so the website deliberately does not show a copied or stale rule catalog."}</p></div>{catalog && <div className="catalogFilters"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter rules" aria-label="Filter rules"/><select value={engine} onChange={(event) => setEngine(event.target.value)} aria-label="Filter by engine">{engines.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>}</div>
      {catalog && <div className="ruleTable"><div className="ruleTableHead"><span>Rule</span><span>Evidence</span><span>Severity</span><span>Engine</span></div>{filtered.map((item) => <article key={item.id}><div><Link href={`/alerts/${encodeURIComponent(item.id)}`}><code>{item.id}</code><strong>{item.title}</strong></Link><p>{item.description}</p><small>{item.category}</small></div><span className={`evidencePill ${item.evidence}`}>{item.evidence}</span><span className={`severityText severity${item.severity}`}>{item.severity}</span><span>{item.engine}</span></article>)}</div>}
    </section>
  </main>;
}
