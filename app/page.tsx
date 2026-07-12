"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Binary, Box, Braces, Check, GitCompareArrows, Search, ShieldAlert, Waves } from "lucide-react";
import { useState } from "react";

const signals = [
  { icon: Braces, label: "Code behavior", value: "AST + dataflow", detail: "Dynamic execution, process, network, filesystem, and source-to-sink chains." },
  { icon: Box, label: "Supply chain", value: "Artifact exact", detail: "Dependencies, lifecycle scripts, packed content, native binaries, and file hashes." },
  { icon: Binary, label: "Agent surface", value: "IDE aware", detail: "MCP servers, model tools, command surfaces, secret storage, and approval boundaries." },
  { icon: GitCompareArrows, label: "Release change", value: "Version specific", detail: "New capabilities, findings, entrypoints, dependencies, and artifact changes." },
];

const exampleRows = [
  ["REQUIRED", "Executable behavior", "AST + Semgrep", "Source-to-sink and sensitive capability evidence", "neutral"],
  ["REQUIRED", "Artifact intelligence", "YARA + SHA-256", "Byte indicators, files, signatures and provenance", "neutral"],
  ["REQUIRED", "Runtime supply chain", "OSV + lockfile", "Resolved dependencies and vulnerability intelligence", "neutral"],
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  function submit(event: React.FormEvent) { event.preventDefault(); router.push(query.trim() ? `/catalog?q=${encodeURIComponent(query.trim())}` : "/catalog"); }

  return <main>
    <section className="homeHero">
      <div className="heroGridMark" aria-hidden="true" />
      <div className="heroCopyBlock">
        <div className="statusLine"><span className="statusDot" /> Public extension intelligence</div>
        <h1>Know the extension.<br/><em>Trust the evidence.</em></h1>
        <p>Analyze exact IDE extension artifacts before installation. See behavior, provenance, dependencies, agent capabilities, and version changes behind every decision.</p>
        <form className="heroSearch" onSubmit={submit}><Search size={20} aria-hidden="true"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search an extension or publisher.extension" aria-label="Search extension catalog"/><button type="submit">Search catalog <ArrowRight size={17}/></button></form>
        <div className="heroLinks"><Link href="/scan">Upload a VSIX</Link><Link href="/scoring">How decisions work</Link><Link href="/metrics">Explore 40 rules</Link></div>
      </div>
      <div className="heroProductWindow">
        <div className="windowBar"><div><span/><span/><span/></div><strong>Extension intelligence</strong><span>Exact artifacts</span></div>
        <div className="windowToolbar"><div><Waves size={16}/><span>Deep Scan contract</span></div><small>SCHEMA 2.2</small></div>
        <div className="signalTable"><div className="signalHead"><span>Status</span><span>Surface</span><span>Analyzer</span><span>Recorded output</span></div>{exampleRows.map(([decision, extension, version, reason, tone]) => <div className="signalRow" key={extension}><span><b className={`decision ${tone}`}>{decision}</b></span><strong>{extension}</strong><code>{version}</code><span>{reason}</span></div>)}</div>
        <div className="windowFoot"><span><Check size={14}/> Artifact hashes recorded</span><span><Check size={14}/> Coverage is explicit</span><span><Check size={14}/> Package code not executed</span></div>
      </div>
    </section>

    <section className="trustRibbon"><span>DETERMINISTIC RULES</span><span>EXACT SHA-256</span><span>SEMGREP + YARA READY</span><span>VERSION-AWARE</span><span>NO OPAQUE AI VERDICTS</span></section>

    <section className="section sectionSplit">
      <div className="sectionTitle"><span className="kicker">Security model</span><h2>One extension.<br/>Four angles of trust.</h2><p>Risk is not a popularity score. IDE Scanner separates what an artifact can do, where it came from, what changed, and how completely it was analyzed.</p><Link className="textLink" href="/metrics">View the intelligence model <ArrowRight size={16}/></Link></div>
      <div className="signalList">{signals.map(({ icon: Icon, label, value, detail }, index) => <article key={label}><span className="signalIndex">0{index + 1}</span><Icon size={21}/><div><small>{label}</small><h3>{value}</h3><p>{detail}</p></div></article>)}</div>
    </section>

    <section className="darkSection">
      <div className="darkSectionHead"><div><span className="kicker kickerLight">Decision, not decoration</span><h2>A result you can defend.</h2></div><p>Every decision preserves the exact artifact, ruleset, evidence strength, provider coverage, and remediation. Missing analysis produces <strong>INCOMPLETE</strong>, never a quiet pass.</p></div>
      <div className="decisionGrid"><Decision name="BLOCK" tone="block" number="01" copy="Authoritative malicious intelligence or policy-rejected abuse evidence."/><Decision name="REVIEW" tone="review" number="02" copy="Sensitive capability or correlated behavior requires human context."/><Decision name="INCOMPLETE" tone="incomplete" number="03" copy="Required entrypoints, providers, or artifacts were not fully analyzed."/><Decision name="ALLOW" tone="allow" number="04" copy="Required analysis completed without crossing review or block policy."/></div>
    </section>

    <section className="section workflowSection"><div className="sectionTitle"><span className="kicker">From search to evidence</span><h2>Inspect before access becomes trust.</h2></div><div className="workflow"><article><span>01</span><Search/><h3>Find</h3><p>Resolve the exact Marketplace extension and published version.</p></article><article><span>02</span><ShieldAlert/><h3>Analyze</h3><p>Inspect manifest, source, dependencies, artifacts, and behavior chains.</p></article><article><span>03</span><GitCompareArrows/><h3>Compare</h3><p>Measure new capabilities and findings against the previous release.</p></article><article><span>04</span><Check/><h3>Decide</h3><p>Apply an explainable security decision with explicit coverage.</p></article></div></section>

    <section className="homeCta"><div><span className="kicker">Start with an exact artifact</span><h2>Search the extension catalog.</h2><p>No account. No local script. No package execution.</p></div><Link className="button buttonLight" href="/catalog">Explore extensions <ArrowRight size={17}/></Link></section>
  </main>;
}

function Decision({ name, tone, number, copy }: { name: string; tone: string; number: string; copy: string }) { return <article><span>{number}</span><b className={`decision ${tone}`}>{name}</b><p>{copy}</p></article>; }
