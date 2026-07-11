"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const decisions = [
  { decision: "BLOCK", extension: "unknown.ai-helper", reason: "Known-bad artifact hash", coverage: "Complete", tone: "block" },
  { decision: "REVIEW", extension: "acme.remote-tools", reason: "Workspace input reaches shell", coverage: "12/12 entrypoints", tone: "review" },
  { decision: "INCOMPLETE", extension: "team.private-pack", reason: "Native binary not inspected", coverage: "Partial", tone: "incomplete" },
  { decision: "ALLOW", extension: "trusted.theme-kit", reason: "No blocking evidence", coverage: "Complete", tone: "allow" }
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/scan?q=${encodeURIComponent(trimmed)}` : "/scan");
  }

  return (
    <main className="productHome">
      <section className="productHero">
        <div className="heroSignal"><span>LOCAL-FIRST</span><span>STATIC BY DEFAULT</span><span>EXPLAINABLE</span></div>
        <div className="heroHeading">
          <p className="eyebrow">IDE extension security control plane</p>
          <h1>Decide what belongs inside your developer environment.</h1>
          <p>Inspect extension behavior, supply-chain provenance, agent permissions, credentials, and client posture before trust becomes access.</p>
        </div>
        <form className="productSearch" onSubmit={handleSearch}>
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search an extension or enter publisher.extension" aria-label="Search VS Code extensions" />
          <button className="primaryAction" type="submit">Analyze <span aria-hidden="true">&rarr;</span></button>
        </form>

        <div className="decisionSurface" aria-label="Example security decision queue">
          <div className="surfaceHeader"><div><span className="liveDot" /> Decision queue</div><span>Evidence policy · default</span></div>
          <div className="decisionHead"><span>Decision</span><span>Extension</span><span>Primary reason</span><span>Analysis coverage</span></div>
          {decisions.map((item) => <div className="decisionRow" key={item.extension}>
            <span><b className={`decisionBadge ${item.tone}`}>{item.decision}</b></span>
            <strong>{item.extension}</strong><span>{item.reason}</span><span>{item.coverage}</span>
          </div>)}
        </div>
      </section>

      <section className="proofBand" aria-label="Product coverage">
        <div><strong>4</strong><span>explicit decisions</span></div><div><strong>8</strong><span>evidence classes</span></div><div><strong>5</strong><span>analysis sources</span></div><div><strong>0</strong><span>package code executed</span></div>
      </section>

      <section className="productSection capabilitiesSection">
        <div className="sectionLead"><p className="eyebrow">One review surface</p><h2>More than a malware score.</h2><p>A security-first review separates confirmed intelligence from risky capability and incomplete analysis. Each signal retains its evidence, confidence, and remediation.</p><Link className="inlineLink" href="/metrics">Explore metrics and rules <span>&rarr;</span></Link></div>
        <div className="capabilityList">
          <Capability index="01" title="Behavior chains" copy="Trace workspace, webview, credential, and decoded inputs into execution or network sinks with Semgrep and native analyzers." />
          <Capability index="02" title="Artifact intelligence" copy="Hash the exact package and every file, match known-bad intelligence, and flag native or packed payloads for independent inspection." />
          <Capability index="03" title="Agent and client posture" copy="Review MCP servers, language-model tools, auto-approval, Workspace Trust, automatic tasks, and risky trust overrides." />
          <Capability index="04" title="Release changes" copy="Compare versions, decisions, findings, capabilities, and artifact hashes so a trusted update cannot quietly expand access." />
        </div>
      </section>

      <section className="methodBand">
        <div><p className="eyebrow">Explainable by construction</p><h2>Rules make findings. Policy makes decisions.</h2></div>
        <div className="methodSteps"><Method n="01" title="Acquire" copy="Fetch or accept an exact VSIX artifact."/><Method n="02" title="Inspect" copy="Parse manifests, source, dependencies, binaries, and client settings."/><Method n="03" title="Correlate" copy="Combine sources and sinks into stronger evidence chains."/><Method n="04" title="Decide" copy="Apply transparent block, review, allow, and incomplete policy."/></div>
        <div className="methodActions"><Link className="primaryAction" href="/scoring">Read the methodology</Link><Link className="secondaryAction" href="/benchmark">See benchmark results</Link></div>
      </section>

      <section className="productCta"><div><p className="eyebrow">Inspect before install</p><h2>Start with the artifact, end with a defensible decision.</h2></div><Link className="primaryAction" href="/scan">Scan an extension <span>&rarr;</span></Link></section>
    </main>
  );
}

function Capability({ index, title, copy }: { index: string; title: string; copy: string }) { return <article><span>{index}</span><div><h3>{title}</h3><p>{copy}</p></div></article>; }
function Method({ n, title, copy }: { n: string; title: string; copy: string }) { return <article><span>{n}</span><strong>{title}</strong><p>{copy}</p></article>; }
