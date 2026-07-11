"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { evidenceClasses, metricCatalog, ruleCatalog } from "@/lib/metrics";

export default function MetricsPage() {
  const [query, setQuery] = useState("");
  const [engine, setEngine] = useState("all");
  const engines = ["all", ...Array.from(new Set(ruleCatalog.map((item) => item.engine)))];
  const filtered = useMemo(() => ruleCatalog.filter((item) => {
    const text = `${item.id} ${item.title} ${item.category} ${item.description}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (engine === "all" || item.engine === engine);
  }), [query, engine]);

  return <main className="shell referencePage">
    <section className="pageHero referenceHero"><div><p className="eyebrow">Detection reference · ruleset 2026.07.11</p><h1>Every metric. Every rule. No hidden judgment.</h1><p className="heroCopy">The product reports {metricCatalog.length} security domains, {ruleCatalog.length} registered detection rules, eight evidence classes, client-posture controls, and explicit analysis coverage.</p></div><Link className="heroAction" href="/scan">Run a scan</Link></section>

    <section className="referenceStats"><div><strong>{ruleCatalog.length}</strong><span>registered rules</span></div><div><strong>{metricCatalog.length}</strong><span>metric domains</span></div><div><strong>8</strong><span>evidence classes</span></div><div><strong>4</strong><span>security decisions</span></div></section>

    <section className="metricDomainGrid">{metricCatalog.map((metric, index) => <article key={metric.id}><span>{String(index + 1).padStart(2, "0")}</span><h2>{metric.label}</h2><strong>{metric.short}</strong><p>{metric.detail}</p><p className="metricWhy">Why it matters: {metric.why}</p><div>{metric.outputs.map((output) => <code key={output}>{output}</code>)}</div></article>)}</section>

    <section className="evidenceSection"><div className="sectionIntro"><p className="eyebrow">Evidence taxonomy</p><h2>Strength describes evidence, not certainty.</h2><p>Evidence class controls how a finding can affect policy. Severity describes potential impact. Neither is a calibrated probability that an extension is malicious.</p></div><div className="evidenceGrid">{evidenceClasses.map(([label, text]) => <article key={label}><strong>{label}</strong><p>{text}</p></article>)}</div></section>

    <section className="ruleCatalogSection"><div className="catalogHeader"><div><p className="eyebrow">Authoritative registry</p><h2>Detection rule catalog</h2><p>{filtered.length} of {ruleCatalog.length} rules shown. Findings retain the rule id, file, line, evidence class, severity, and engine output where available.</p></div><div className="catalogFilters"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter rules" aria-label="Filter rules"/><select value={engine} onChange={(event) => setEngine(event.target.value)} aria-label="Filter by engine">{engines.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div>
      <div className="ruleTable"><div className="ruleTableHead"><span>Rule</span><span>Evidence</span><span>Severity</span><span>Engine</span></div>{filtered.map((item) => <article key={item.id}><div><code>{item.id}</code><strong>{item.title}</strong><p>{item.description}</p><small>{item.category}</small></div><span className={`evidencePill ${item.evidence}`}>{item.evidence}</span><span className={`severityText severity${item.severity}`}>{item.severity}</span><span>{item.engine}</span></article>)}</div>
    </section>
  </main>;
}
