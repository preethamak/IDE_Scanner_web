import Link from "next/link";

const decisions = [
  ["BLOCK", "Authoritative malicious intelligence matched, or the selected policy explicitly rejects high-confidence abuse evidence.", "Do not install; remove and investigate existing exposure."],
  ["REVIEW", "Sensitive capability, correlated behavior, vulnerable dependencies, or provenance concerns need human context.", "Inspect the cited source, intended behavior, and remediation before approval."],
  ["INCOMPLETE", "Required providers, declared entrypoints, archives, or artifacts could not be analyzed sufficiently.", "Restore coverage or independently inspect unsupported content. Never interpret this as clean."],
  ["ALLOW", "Required analysis completed and no evidence crossed the active block or review policy.", "Approval applies to this exact artifact hash and policy version, not every future release."]
];

export default function ScoringPage() {
  return <main className="shell methodologyPage">
    <section className="pageHero referenceHero"><div><p className="eyebrow">Decision methodology</p><h1>A decision is policy over evidence and coverage.</h1><p className="heroCopy">IDE Scanner does not ask a language model whether code “looks malicious.” Deterministic analyzers create findings, analysis coverage limits what can be concluded, and a versioned policy creates the final decision.</p></div><Link className="heroAction" href="/metrics">Inspect the rules</Link></section>

    <section className="decisionFormula"><span>Artifact</span><b>+</b><span>Evidence</span><b>+</b><span>Coverage</span><b>+</b><span>Policy</span><b>=</b><strong>Decision</strong></section>

    <section className="decisionDocs"><div className="sectionIntro"><p className="eyebrow">Primary output</p><h2>Four decisions with operational meaning</h2></div>{decisions.map(([label, meaning, action]) => <article key={label}><strong className={`decisionBadge ${label.toLowerCase()}`}>{label}</strong><p>{meaning}</p><span>{action}</span></article>)}</section>

    <section className="methodologyGrid"><article><p className="eyebrow">Diagnostic index</p><h2>Risk score · 0-100</h2><p>Prioritizes sensitive capability, supply-chain exposure, provenance, weak indicators, and correlated abuse potential. It is for review ordering, not a probability.</p></article><article><p className="eyebrow">Diagnostic index</p><h2>Malware score · 0-100</h2><p>Summarizes confirmed and strongly correlated malicious evidence. It is not statistically calibrated and should always be read with evidence class.</p></article><article><p className="eyebrow">Compatibility field</p><h2>Grade · A-F</h2><p>A legacy human-readable rollup retained in report bundles. It is secondary to decision, completion state, and exact evidence.</p></article></section>

    <section className="policySection"><div><p className="eyebrow">Guardrails</p><h2>What the scanner refuses to claim</h2></div><div><article><strong>No findings ≠ safe</strong><p>Unsupported files, missing providers, parse failures, and uninspected entrypoints must remain visible in coverage.</p></article><article><strong>Capability ≠ malware</strong><p>Shell, network, filesystem, and agent APIs are common in legitimate developer tools. Context and correlation matter.</p></article><article><strong>Reputation ≠ code truth</strong><p>Install count, age, publisher status, and repository health inform provenance but cannot prove artifact behavior.</p></article><article><strong>AI ≠ detection authority</strong><p>AI may summarize evidence for a reviewer, but it must not invent findings or silently change the deterministic decision.</p></article></div></section>
  </main>;
}
