import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { ArrowRight, BadgeCheck, Binary, Box, Braces, Check, FileCode2, GitCompareArrows, LockKeyhole, Radar, ShieldAlert, ShieldCheck, Terminal, Users } from "lucide-react";
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
    <div className="announcement"><span>New</span><strong>Schema 2.2 preserves exact files, dependencies, analyzer coverage, and version changes.</strong><Link href="/research/reading-a-decision">See what changed <ArrowRight/></Link></div>
    <section className="productHero">
      <div className="productHeroCopy"><span className="heroEyebrow"><ShieldCheck/> Open extension intelligence</span><h1>Security intelligence for IDE extensions.</h1><p>Understand what an extension can access, what changed between releases, and whether the exact artifact deserves trust before it reaches source code, credentials, terminals, or AI agents.</p><HomeSearch/><div className="heroSecondary"><Link href="/catalog">Explore the public catalog <ArrowRight/></Link><Link href="/scan">Upload a private VSIX</Link></div></div>
      <div className="liveProductFrame" aria-label="Example IDE Scanner result">
        <div className="liveFrameBar"><span><i/><i/><i/></span><code>extension / exact-version</code><b>DEEP SCAN</b></div>
        <div className="liveFrameHeader"><div><span className="frameIcon">VY</span><div><small>tintinweb.vscode-vyper</small><strong>Vyper <code>@0.1.0</code></strong></div></div><span className="decision review">REVIEW</span></div>
        <div className="liveFrameConclusion"><ShieldAlert/><div><span>Bottom line</span><strong>Local compiler execution needs user context.</strong><p>The artifact can launch a configured Vyper compiler. That matches its purpose, but command construction and workspace input deserve review.</p></div></div>
        <div className="liveFrameSignals"><article><Terminal/><span>Process execution</span><strong>Detected</strong></article><article><FileCode2/><span>Files analyzed</span><strong>274</strong></article><article><LockKeyhole/><span>Malware evidence</span><strong>None</strong></article></div>
        <div className="liveFrameFoot"><span><Check/> Exact SHA-256</span><span><Check/> Package code not executed</span><Link href="/extensions/tintinweb.vscode-vyper">Open public record <ArrowRight/></Link></div>
      </div>
    </section>

    <section className="proofStrip"><div><strong>40+</strong><span>documented detection rules</span></div><div><strong>6</strong><span>independent trust dimensions</span></div><div><strong>5</strong><span>required Deep Scan analyzers</span></div><div><strong>148</strong><span>artifacts in published cohort 01</span></div></section>

    <section className="homeBand popularBand"><div className="homeBandHead"><div><span>Public catalog</span><h2>Start with extensions developers already trust.</h2><p>Popularity establishes context, never safety. Every version still needs its own artifact decision.</p></div><Link href="/catalog">Browse all extensions <ArrowRight/></Link></div><div className="popularExtensions">{extensions.map((item) => <Link key={item.extension_id} href={`/extensions/${encodeURIComponent(item.extension_id)}`}><span className="popularIcon">{item.icon_url ? <Image src={item.icon_url} width={46} height={46} alt="" unoptimized/> : item.publisher.slice(0, 2).toUpperCase()}</span><div><small>{item.extension_id}</small><strong>{item.display_name}{item.publisher_verified ? <BadgeCheck/> : null}</strong><p>{item.short_description}</p></div><aside><span>{formatCount(item.install_count)} installs</span><code>{item.version}</code><ArrowRight/></aside></Link>)}</div></section>

    <section className="homeBand productStory"><div className="storyIntro"><span>What IDE Scanner sees</span><h2>The extension is a privileged application, not a theme-shaped ZIP.</h2><p>Developer tools run beside source code, credentials, terminals, cloud sessions, and increasingly autonomous agents. IDE Scanner models that access directly.</p><Link href="/metrics">Inspect every metric <ArrowRight/></Link></div><div className="storyCapabilities"><article><Braces/><div><strong>Executable behavior</strong><p>AST and dataflow analysis connect workspace or webview inputs to process, code, network, and filesystem sinks.</p></div></article><article><Box/><div><strong>Supply-chain integrity</strong><p>Exact artifacts, lifecycle scripts, dependency resolution, native payloads, YARA matches, and registry history.</p></div></article><article><Binary/><div><strong>Agent and credential surface</strong><p>Model tools, MCP servers, secret storage, commands, clipboard access, and approval boundaries.</p></div></article><article><GitCompareArrows/><div><strong>Release change</strong><p>New capabilities, dependencies, entrypoints, findings, files, and hashes between immutable versions.</p></div></article></div></section>

    <section className="darkProductBand"><div><span>Decision system</span><h2>One answer first.<br/>All evidence behind it.</h2><p>The decision never comes from averaging popularity, AI opinion, and warning counts. Confirmed intelligence, correlated behavior, policy, and analysis completeness remain separate.</p></div><div className="decisionSequence"><article><b className="decision allow">ALLOW</b><strong>No evidence crossed policy.</strong><p>Applies only to the exact artifact and ruleset.</p></article><article><b className="decision review">REVIEW</b><strong>Sensitive behavior needs context.</strong><p>Powerful does not automatically mean malicious.</p></article><article><b className="decision block">BLOCK</b><strong>Do not install this artifact.</strong><p>Confirmed intelligence or rejected behavior.</p></article><article><b className="decision incomplete">INCOMPLETE</b><strong>Coverage cannot support approval.</strong><p>A required entrypoint or analyzer did not complete.</p></article></div></section>

    <section className="homeBand workflowBand"><div className="homeBandHead"><div><span>Built for adoption</span><h2>Useful alone. More valuable when the team returns.</h2></div></div><div className="adoptionPaths"><article><div><Radar/><span>Developer</span></div><h3>Check before installing.</h3><p>Search any published extension, inspect the exact release, and share a permanent result without creating an account.</p><Link href="/catalog">Search the catalog <ArrowRight/></Link></article><article><div><ShieldCheck/><span>Security</span></div><h3>Monitor what changes.</h3><p>Watch approved extensions and bring new capabilities, dependencies, or high-confidence alerts back into review.</p><Link href="/account">Continue with GitHub <ArrowRight/></Link></article><article><div><Users/><span>Engineering teams</span></div><h3>Own the decision together.</h3><p>Build a shared extension inventory, assign findings, record accepted risk, and preserve an auditable decision trail.</p><Link href="/design-partners">Become a design partner <ArrowRight/></Link></article></div></section>

    <section className="homeBand researchBand"><div className="homeBandHead"><div><span>Security research</span><h2>Explain the signal, not just the alert.</h2></div><Link href="/research">View all research <ArrowRight/></Link></div><div className="researchCards">{research.map(([title, detail, category, href], index) => <Link href={href} key={title}><span>0{index + 1} · {category}</span><h3>{title}</h3><p>{detail}</p><ArrowRight/></Link>)}</div></section>

    <section className="closingProductCta"><div><span>Public by default</span><h2>Know what enters the developer environment.</h2><p>No account required. No package execution. Every conclusion tied to an exact version and artifact.</p></div><HomeSearch compact/></section>
  </main>;
}

function formatCount(value: number) { return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0); }
