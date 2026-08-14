import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Bell, Boxes, Check, ChevronRight, CircleCheck, FileCode2,
  Fingerprint, GitCompareArrows, History, LayoutDashboard, MonitorCog, Network,
  Search, ShieldCheck, TerminalSquare, UsersRound,
} from "lucide-react";
import HomeSearch from "@/app/HomeSearch";
import styles from "./landing.module.css";

const popular = [
  ["GitHub Copilot", "GitHub.copilot"], ["Python", "ms-python.python"],
  ["ESLint", "dbaeumer.vscode-eslint"], ["Docker", "ms-azuretools.vscode-docker"],
] as const;

export default function HomeHero() {
  return (
    <section className={styles.productHero}>
      <Link href="/research/artifact-is-the-boundary" className={styles.updateRail}>
        <span>New</span><b>Decision Receipts</b><em>Artifact, reviewer, and rationale now travel together.</em><ArrowRight />
      </Link>
      <div className={styles.heroLead}>
        <div className={styles.heroStatement}>
          <span className={styles.eyebrow}><i /> Extension release security</span>
          <h1>Review every<br /><em>extension release.</em></h1>
          <p>Inspect the package, compare its capabilities, and record the decision before it reaches your editors.</p>
          <div className={styles.searchShell}><HomeSearch /></div>
          <div className={styles.popular}><span>Open a report</span>{popular.map(([label, query]) => <Link href={`/registry?q=${encodeURIComponent(query)}`} key={query}>{label}</Link>)}</div>
        </div>
      </div>

      <div className={styles.productStage} aria-label="GuardRails product showing a GitHub Copilot release review">
        <div className={styles.productChrome}>
          <span><i /><i /><i /></span><code>app.guardrails.dev / releases / GitHub Copilot / 1.388.0</code>
          <div><Search /><Bell /><span>PS</span></div>
        </div>
        <div className={styles.productBody}>
          <aside>
            <b><ShieldCheck /> GuardRails</b>
            <nav aria-label="Product preview navigation">
              <span><LayoutDashboard /> Overview</span><span className={styles.navActive}><GitCompareArrows /> Release review</span>
              <span><Boxes /> Inventory</span><span><History /> Activity</span><span><UsersRound /> Team</span>
            </nav>
            <div><small>WORKSPACE</small><strong>Platform Security</strong><span>Production policy</span></div>
          </aside>
          <main>
            <header className={styles.reportHeader}>
              <div className={styles.reportBreadcrumb}>Extensions <ChevronRight /> GitHub Copilot <ChevronRight /> <strong>1.388.0</strong></div>
              <button>Export evidence</button>
            </header>
            <div className={styles.reportTitle}>
              <span className={styles.releaseGlyph}><Image src={`/api/extension-icons?url=${encodeURIComponent("https://GitHub.gallerycdn.vsassets.io/extensions/github/copilot/1.388.0/1761326434179/Microsoft.VisualStudio.Services.Icons.Default")}`} alt="" width={52} height={52} unoptimized /></span>
              <div><small>GITHUB.COPILOT</small><h2>GitHub Copilot <code>1.388.0</code></h2><p>Compared with team baseline 1.387.0</p></div>
              <div className={styles.reviewState}><i /> Needs review</div>
            </div>
            <div className={styles.reportTabs}><b>Release summary</b><span>Capabilities <em>12</em></span><span>Evidence</span><span>Files</span><span>Dependencies</span></div>
            <div className={styles.reportGrid}>
              <section className={styles.changeSummary}>
                <div><span>RELEASE VERDICT</span><b>2 changes need a human decision</b></div>
                <p>This release adds terminal execution and a new network destination. No publisher, dependency, or obfuscation changes were detected.</p>
                <div className={styles.summaryStats}><span><strong>2</strong>New capabilities</span><span><strong>94%</strong>Evidence coverage</span><span><strong>1</strong>New host</span></div>
              </section>
              <aside className={styles.artifactCard}>
                <span><Fingerprint /> ARTIFACT IDENTITY</span><b>Verified exact package</b><code>sha256:8b45118a…19e2</code><small><CircleCheck /> Publisher signature valid</small>
              </aside>
              <section className={styles.capabilityTable}>
                <header><b>Capability changes</b><span>Showing changes only</span></header>
                <article><span><TerminalSquare /></span><div><small>TERMINAL</small><b>Execute shell commands</b><p>Declared command and process APIs</p></div><em>NEW</em></article>
                <article><span><Network /></span><div><small>NETWORK</small><b>api.anthropic.com</b><p>Additional observed destination</p></div><em>+1 HOST</em></article>
                <article><span><FileCode2 /></span><div><small>FILES</small><b>Workspace read + write</b><p>Matches approved baseline</p></div><strong><Check /> UNCHANGED</strong></article>
              </section>
              <aside className={styles.decisionPanel}>
                <span>TEAM DECISION</span><h3>Review before rollout</h3><p>Attach a reason to this exact release and create the next comparison baseline.</p>
                <button>Approve release <ArrowRight /></button><Link href="/extensions/GitHub.copilot/versions/1.388.0">Open full public report</Link>
              </aside>
            </div>
          </main>
        </div>
      </div>
      <div className={styles.heroProof}><span><Check /> Check before install</span><span><Check /> Compare every update</span><span><Check /> Review history that lasts</span></div>

      <section className={styles.editorSupport} aria-labelledby="editor-support-heading">
        <div><span className={styles.eyebrow}><i /> Local inventory</span><h2 id="editor-support-heading">One review queue across your editors.</h2></div>
        <div className={styles.editorList}>
          {[
            ["VS", "VS Code"], ["CU", "Cursor"], ["WS", "Windsurf"],
            ["VC", "VSCodium"], ["IN", "Insiders"],
          ].map(([, name]) => <span key={name}><i aria-hidden="true" /><b>{name}</b></span>)}
        </div>
        <Link href="/cli"><MonitorCog /> Collect installed extensions <ArrowRight /></Link>
        <small>Independent compatibility support. GuardRails is not affiliated with or endorsed by the editor vendors listed.</small>
      </section>
    </section>
  );
}
