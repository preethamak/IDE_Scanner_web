"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CircleCheck,
  Eye,
  FileCode2,
  FolderSearch2,
  PackageSearch,
  Radio,
  Search,
  ShieldCheck,
  TerminalSquare,
  UserRound,
} from "lucide-react";
import type { PublicSecurityFeedItem } from "@/lib/productData";
import styles from "./home.module.css";

type FeedItem = PublicSecurityFeedItem | null;

export function HeroProductScene({ item }: { item: FeedItem }) {
  const title = item?.display_name || "Extension package";
  const version = item?.version || "latest";
  const decision = item ? decisionLabel(item.decision) : "Ready to inspect";
  const reason = item?.decision_reason || "Search an extension to open its current public intelligence.";

  return <div className={styles.heroVisual} aria-label="GuardRails extension inspection product preview">
    <div className={styles.dotField} aria-hidden="true" />
    <div className={styles.editorWindow}>
      <header className={styles.windowBar}>
        <span><i /><i /><i /></span>
        <code>marketplace / extension / {version}</code>
        <b><Radio /> Published</b>
      </header>
      <div className={styles.editorBody}>
        <aside>
          <span>PACKAGE</span>
          <strong><PackageSearch /> Overview</strong>
          <small><FileCode2 /> Manifest</small>
          <small><FolderSearch2 /> Files</small>
          <small><TerminalSquare /> Capabilities</small>
        </aside>
        <div className={styles.packageView}>
          <div className={styles.packageIdentity}><span>{title.slice(0, 1).toUpperCase()}</span><div><small>SELECTED EXTENSION</small><strong>{title}</strong><code>@{version}</code></div></div>
          <div className={styles.mockLines} aria-hidden="true"><i /><i /><i /><i /></div>
          <div className={styles.capabilityRows}>
            <span><Check /> Package identity resolved</span>
            <span><Check /> Release contents mapped</span>
            <span><Check /> Important behavior grouped</span>
          </div>
        </div>
      </div>
      <div className={styles.scanBeam} aria-hidden="true"><span /></div>
    </div>

    <div className={styles.resultCard}>
      <header><div className={styles.resultLogo}><ShieldCheck /></div><div><small>GUARDRAILS RESULT</small><strong>{title}</strong><code>@{version}</code></div><span>{item ? "Current" : "Preview"}</span></header>
      <div className={styles.resultSummary}>
        <span>WHAT NEEDS YOUR ATTENTION</span>
        <h2>{decision}</h2>
        <p>{shorten(reason, 132)}</p>
      </div>
      <div className={styles.resultChecks}>
        <span><CircleCheck /> Exact release</span>
        <span><Eye /> Evidence available</span>
      </div>
      {item ? <Link href={`/extensions/${encodeURIComponent(item.extension_id)}/versions/${encodeURIComponent(item.version)}`}>Open Security Summary <ArrowUpRight /></Link> : <Link href="/registry">Open Extension Registry <ArrowRight /></Link>}
    </div>
  </div>;
}

/** The homepage sells the recurring team decision, not a pile of scanner UI. */
export function ReleaseDecisionScene() {
  return <div className={styles.releaseHeroScene} aria-label="Example GuardRails release-change decision">
    <div className={styles.releaseHeroDots} aria-hidden="true" />
    <div className={styles.releaseHeroWindow}>
      <header><span><i/><i/><i/></span><code>guardrails / team workspace</code><b><Radio/> Monitoring</b></header>
      <div className={styles.releaseHeroIdentity}><span>G</span><div><small>MONITORED EXTENSION</small><strong>GitHub Copilot</strong><code>Reviewed release 1.388.0</code></div><em>New release</em></div>
      <div className={styles.releaseHeroDiff}>
        <div><small>1.388.0</small><strong>Reviewed baseline</strong></div><ArrowRight/>
        <div><small>1.389.0</small><strong>New artifact</strong></div>
      </div>
      <div className={styles.releaseHeroChanges}>
        <span><b>+ 2</b> New capabilities</span><p><TerminalSquare/> Runs terminal commands <em>New</em></p><p><Radio/> Opens network connections <em>New</em></p>
      </div>
      <footer><span><UserRound/> Assigned to Priya</span><Link href="/workspace">Review change <ArrowRight/></Link></footer>
    </div>
  </div>;
}

export function CredibilityStory() {
  const count = 60000;

  return <section className={styles.credibility} aria-labelledby="marketplace-scale">
    <div className={styles.credibilityLead}>
      <span className={styles.kicker}><i /> Marketplace scale</span>
      <strong id="marketplace-scale">~{count.toLocaleString("en-US")}</strong>
      <p>extensions compete for a place inside developer environments.</p>
    </div>
    <div className={styles.publisherProof}>
      <div className={styles.publisherGrid} aria-hidden="true">{Array.from({ length: 33 }, (_, index) => <i className={index === 16 ? styles.verifiedCell : ""} key={index} />)}</div>
      <div><strong>~1,800</strong><span>from verified publishers</span><small>About 1 in 33</small></div>
    </div>
    <div className={styles.installProof}><strong>3.3 billion</strong><span>installs across the marketplace</span></div>
    <p className={styles.credibilitySource}>Industry figures, with sources and context below.</p>
  </section>;
}

const walkthrough = [
  {
    id: "select",
    label: "01 · Review",
    title: "Review one exact release.",
    body: "Start from a completed report. That exact package becomes the baseline your team reviewed—not a moving marketplace listing.",
    icon: Search,
  },
  {
    id: "inspect",
    label: "02 · Monitor",
    title: "Watch the next release.",
    body: "When the publisher ships again, GuardRails scans the new artifact and makes the difference visible to the team.",
    icon: Eye,
  },
  {
    id: "decide",
    label: "03 · Decide",
    title: "Route the decision to an owner.",
    body: "New capabilities and evidence arrive in one queue. Assign the review, record the call, and keep the delivery history.",
    icon: ShieldCheck,
  },
] as const;

export function ProductWalkthrough({ item }: { item: FeedItem }) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const step = walkthrough[active];
  const Icon = step.icon;
  const title = item?.display_name || "Choose an extension";

  const selectStep = (index: number, focus = false) => {
    const next = (index + walkthrough.length) % walkthrough.length;
    setActive(next);
    if (focus) tabRefs.current[next]?.focus();
  };

  return <div className={styles.walkthrough}>
    <div className={styles.walkthroughNav} role="tablist" aria-label="GuardRails product walkthrough">
      {walkthrough.map((candidate, index) => <button ref={(node) => { tabRefs.current[index] = node; }} type="button" role="tab" id={`walkthrough-tab-${candidate.id}`} aria-controls={`walkthrough-panel-${candidate.id}`} tabIndex={index === active ? 0 : -1} aria-selected={index === active} className={index === active ? styles.activeStep : ""} onClick={() => setActive(index)} onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); selectStep(index + 1, true); }
        if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); selectStep(index - 1, true); }
        if (event.key === "Home") { event.preventDefault(); selectStep(0, true); }
        if (event.key === "End") { event.preventDefault(); selectStep(walkthrough.length - 1, true); }
      }} key={candidate.id}>
        <span>{candidate.label}</span><strong>{candidate.title}</strong><i aria-hidden="true" />
      </button>)}
    </div>
      <div className={styles.walkthroughStage} id={`walkthrough-panel-${step.id}`} role="tabpanel" aria-labelledby={`walkthrough-tab-${step.id}`}>
      <header><span><i /><i /><i /></span><code>guardrails.app / inspection</code><small><BadgeCheck /> Public intelligence</small></header>
      <div className={styles.stageBody}>
        <div className={styles.stageExplanation}>
          <span className={styles.stageIcon}><Icon /></span>
          <small>{step.label}</small>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
          <div className={styles.stageProgress} aria-label={`Step ${active + 1} of ${walkthrough.length}`}><i style={{ width: `${((active + 1) / walkthrough.length) * 100}%` }} /></div>
        </div>
        <div className={styles.stageProduct}>
          {active === 0 ? <SelectionView title={title} version={item?.version || "latest"} /> : null}
          {active === 1 ? <InspectionView /> : null}
          {active === 2 ? <DecisionView item={item} /> : null}
        </div>
      </div>
    </div>
  </div>;
}

function SelectionView({ title, version }: { title: string; version: string }) {
  return <div className={styles.selectionView}>
    <div className={styles.miniSearch}><Search /><span>{title}</span><kbd>↵</kbd></div>
    <article><span>{title.slice(0, 1).toUpperCase()}</span><div><small>EXACT MATCH</small><strong>{title}</strong><code>@{version}</code></div><BadgeCheck /></article>
    <p><Check /> The selected identity and release stay attached to the report.</p>
  </div>;
}

function InspectionView() {
  return <div className={styles.inspectionView}>
    <div className={styles.inspectionTop}><span>What this extension can do</span><small>Grouped for a quick decision</small></div>
    <div className={styles.behaviorGrid}>
      <article><FileCode2 /><span>Project files</span><strong>Read and update</strong></article>
      <article><TerminalSquare /><span>Commands</span><strong>Start local tools</strong></article>
      <article><Radio /><span>Connections</span><strong>Reach online services</strong></article>
    </div>
    <p><Eye /> Open any behavior to see the supporting evidence.</p>
  </div>;
}

function DecisionView({ item }: { item: FeedItem }) {
  const reason = item?.decision_reason || "GuardRails presents the result, important behavior, and supporting evidence in one place.";
  return <div className={styles.decisionView}>
    <small>GUARDRAILS RESULT</small>
    <strong>{item ? decisionLabel(item.decision) : "A clearer next step"}</strong>
    <p>{shorten(reason, 155)}</p>
    <div><span><Check /> Release identified</span><span><Check /> Evidence linked</span></div>
    {item ? <Link href={`/extensions/${encodeURIComponent(item.extension_id)}/versions/${encodeURIComponent(item.version)}`}>Open Security Summary <ArrowUpRight /></Link> : <Link href="/registry">Open Extension Registry <ArrowRight /></Link>}
  </div>;
}

function decisionLabel(decision: string) {
  if (decision === "block") return "Pause before installing";
  if (decision === "review") return "Worth a closer look";
  if (decision === "allow") return "No action needed";
  return "Analysis incomplete";
}

function shorten(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}
