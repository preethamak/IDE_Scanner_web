import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { ArrowRight, BadgeCheck, Binary, Box, Braces, Check, FileCode2, GitCompareArrows, LockKeyhole, Radar, ShieldAlert, ShieldCheck, Terminal } from "lucide-react";
import HomeSearch from "@/app/HomeSearch";
import { resolveMarketplaceExtension } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

const featuredIds = ["ms-python.python", "GitHub.copilot", "ms-vscode-remote.remote-containers", "tintinweb.vscode-vyper"];
const getFeaturedExtensions = unstable_cache(async () => { const resolved = await Promise.allSettled(featuredIds.map(resolveMarketplaceExtension)); return resolved.flatMap((result) => result.status === "fulfilled" ? [result.value] : []); }, ["homepage-featured-extensions"], { revalidate: 21600 });
const research = [
  ["Capability is not malware", "Why shell, network, and filesystem findings require intent and correlation.", "Methodology", "/research/capability-is-not-malware"],
  ["The extension artifact is the boundary", "Why repository reputation cannot replace exact VSIX identity and version analysis.", "Supply chain", "/research/artifact-is-the-boundary"],
  ["Reading an IDE extension decision", "A practical guide to allow, review, block, and incomplete outcomes.", "Field guide", "/research/reading-a-decision"],
] as const;

export default async function HomePage() {
  const extensions = await getFeaturedExtensions();
  return <main className="productHome">
    <div className="announcement"><span>Private beta</span><strong>Public extension intelligence is available without an account. Monitoring requires sign-in.</strong><Link href="/research/reading-a-decision">How to read a result <ArrowRight/></Link></div>
    <section className="productHero">
      <div className="productHeroCopy"><span className="heroEyebrow"><ShieldCheck/> Extension intelligence, before install</span><h1>Know what enters the developer environment.</h1><p>Search a published extension, choose the exact release, and inspect its capabilities, evidence, provenance, and scan coverage before it reaches source code, credentials, terminals, or AI agents.</p><HomeSearch/><div className="heroSecondary"><Link href="/catalog">Explore extensions <ArrowRight/></Link><Link href="/scan">Analyze a private VSIX</Link></div></div>
      <div className="liveProductFrame" aria-label="Example IDE Scanner result">
        <div className="liveFrameBar"><span><i/><i/><i/></span><code>extension / exact-version</code><b>DEEP SCAN</b></div>
        <div className="liveFrameHeader"><div><span className="frameIcon">VY</span><div><small>tintinweb.vscode-vyper</small><strong>Vyper <code>@0.1.0</code></strong></div></div><span className="decision review">REVIEW</span></div>
        <div className="liveFrameConclusion"><ShieldAlert/><div><span>Bottom line</span><strong>Local compiler execution needs user context.</strong><p>The artifact can launch a configured Vyper compiler. That matches its purpose, but command construction and workspace input deserve review.</p></div></div>
        <div className="liveFrameSignals"><article><Terminal/><span>Process execution</span><strong>Detected</strong></article><article><FileCode2/><span>Files analyzed</span><strong>274</strong></article><article><LockKeyhole/><span>Malware evidence</span><strong>None</strong></article></div>
        <div className="liveFrameFoot"><span><Check/> Exact SHA-256</span><span><Check/> Package code not executed</span><Link href="/extensions/tintinweb.vscode-vyper">Open public record <ArrowRight/></Link></div>
      </div>
    </section>

    <section className="proofStrip" aria-label="Public intelligence boundaries"><div><strong>EXACT</strong><span>artifact and version boundary</span></div><div><strong>SEVERITY</strong><span>first, evidence-led triage</span></div><div><strong>STATIC</strong><span>package code is not executed</span></div><div><strong>PUBLIC</strong><span>reports are free to inspect</span></div></section>
    <p className="publicMetricNote">Public discovery is free. Sign in only to save watchlists, receive private release alerts, and maintain your decision history.</p>

    <section className="homeBand popularBand"><div className="homeBandHead"><div><span>Explore</span><h2>Start from the extension you need to understand.</h2><p>Registry identity and adoption give context. Exact artifact analysis provides the evidence.</p></div><Link href="/catalog">Explore all extensions <ArrowRight/></Link></div><div className="popularExtensions">{extensions.map((item) => <Link key={item.extension_id} href={`/extensions/${encodeURIComponent(item.extension_id)}`}><span className="popularIcon">{item.icon_url ? <Image src={item.icon_url} width={46} height={46} alt="" unoptimized/> : item.publisher.slice(0, 2).toUpperCase()}</span><div><small>{item.extension_id}</small><strong>{item.display_name}{item.publisher_verified ? <BadgeCheck/> : null}</strong><p>{item.short_description}</p></div><aside><span>{formatCount(item.install_count)} installs</span><code>{item.version}</code><ArrowRight/></aside></Link>)}</div></section>

    <section className="homeBand productStory"><div className="storyIntro"><span>What IDE Scanner sees</span><h2>The extension is a privileged application, not a theme-shaped ZIP.</h2><p>Developer tools run beside source code, credentials, terminals, cloud sessions, and increasingly autonomous agents. IDE Scanner models that access directly.</p><Link href="/metrics">Inspect every metric <ArrowRight/></Link></div><div className="storyCapabilities"><article><Braces/><div><strong>Executable behavior</strong><p>AST and dataflow analysis connect workspace or webview inputs to process, code, network, and filesystem sinks.</p></div></article><article><Box/><div><strong>Supply-chain integrity</strong><p>Exact artifacts, lifecycle scripts, dependency resolution, native payloads, YARA matches, and registry history.</p></div></article><article><Binary/><div><strong>Agent and credential surface</strong><p>Model tools, MCP servers, secret storage, commands, clipboard access, and approval boundaries.</p></div></article><article><GitCompareArrows/><div><strong>Release change</strong><p>New capabilities, dependencies, entrypoints, findings, files, and hashes between immutable versions.</p></div></article></div></section>

    <section className="darkProductBand"><div><span>Severity system</span><h2>Severity first.<br/>Evidence always visible.</h2><p>CRITICAL through INFORMATIONAL classifies the evidence a reviewer should triage. The scanner action remains separate, and never turns a capability into a vulnerability claim.</p></div><div className="decisionSequence"><article><b className="decision block">CRITICAL</b><strong>Urgent, corroborated evidence.</strong><p>May result in a block only when policy and evidence support it.</p></article><article><b className="decision review">HIGH</b><strong>Prioritize human review.</strong><p>High severity is review evidence, not a public vulnerability label.</p></article><article><b className="decision incomplete">MEDIUM / LOW</b><strong>Context changes the meaning.</strong><p>Read the cited behavior and intended purpose.</p></article><article><b className="decision allow">INFORMATIONAL</b><strong>Visible, not alarming.</strong><p>Useful context that does not independently drive a decision.</p></article></div></section>

    <section className="homeBand workflowBand"><div className="homeBandHead"><div><span>Product loop</span><h2>Useful before install. Useful again at the next release.</h2></div></div><div className="adoptionPaths"><article><div><Radar/><span>01 · Explore</span></div><h3>Find the extension.</h3><p>Search any published extension, then choose the exact release you want to inspect.</p><Link href="/catalog">Explore extensions <ArrowRight/></Link></article><article><div><ShieldCheck/><span>02 · Analyze</span></div><h3>Read the evidence.</h3><p>Open a version-specific dossier with capabilities, findings, files, dependencies, provenance, and coverage.</p><Link href="/scan">Analyze extension <ArrowRight/></Link></article><article><div><GitCompareArrows/><span>03 · Monitor</span></div><h3>Return when it changes.</h3><p>Sign in only when you want personal watchlists, scan history, and release-change monitoring.</p><Link href="/workspace">Open Monitor <ArrowRight/></Link></article></div></section>

    <section className="homeBand researchBand"><div className="homeBandHead"><div><span>Security research</span><h2>Explain the signal, not just the alert.</h2></div><Link href="/research">View all research <ArrowRight/></Link></div><div className="researchCards">{research.map(([title, detail, category, href], index) => <Link href={href} key={title}><span>0{index + 1} · {category}</span><h3>{title}</h3><p>{detail}</p><ArrowRight/></Link>)}</div></section>

  </main>;
}

function formatCount(value: number) { return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0); }
