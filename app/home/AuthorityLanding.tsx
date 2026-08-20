import Link from "next/link";
import { ArrowRight, Check, CircleAlert, Fingerprint, Network, Terminal, UserRoundCheck } from "lucide-react";
import styles from "./authorityLanding.module.css";

const evidence = [
  ["01", "Artifact", "Vyper Guard 0.2.0", "sha256: 8b45118a…19e2", Fingerprint],
  ["02", "Authority added", "Terminal execution", "Declared command APIs", Terminal],
  ["03", "Authority added", "api.anthropic.com", "New network destination", Network],
] as const;

export default function AuthorityLanding() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.kicker}><i /> GuardRails / Authority ledger</p>
        <h1>Know what gets<br /><em>authority</em> before<br />the click.</h1>
        <p className={styles.lead}>GuardRails turns an extension, agent, or MCP tool into a decision your team can trust.</p>
        <div className={styles.actions}><Link href="/registry">Check an extension <ArrowRight /></Link><Link href="#story">See how it works</Link></div>
      </div>
      <div className={styles.installScene} aria-label="GuardRails reviews an extension before installation">
        <div className={styles.browser}><span /><span /><span /><code>Extensions / Vyper Guard</code></div>
        <div className={styles.installTop}><span className={styles.package}>VG</span><div><small>VYPERGUARD.VYPER-GUARD</small><strong>Vyper Guard <code>0.2.0</code></strong></div><button>Install</button></div>
        <div className={styles.freeze}><span /> Install paused · new authority detected</div>
        <div className={styles.evidence}>{evidence.map(([n,label,title,detail,Icon])=><article key={n}><span>{n}</span><Icon/><div><small>{label}</small><strong>{title}</strong><p>{detail}</p></div></article>)}</div>
        <div className={styles.verdict}><div><CircleAlert/><span><small>POLICY OUTCOME</small><strong>Review required</strong></span></div><b>2 changes</b></div>
      </div>
    </section>

    <section id="story" className={styles.story}>
      <header><p className={styles.kicker}><i /> Every decision has a trail</p><h2>From package to permission,<br />nothing stays implicit.</h2></header>
      <div className={styles.ledger}>{evidence.map(([n,label,title,detail,Icon])=><article key={n}><span>{n}</span><Icon/><small>{label}</small><h3>{title}</h3><p>{detail}</p></article>)}<article className={styles.seal}><UserRoundCheck/><small>04 · HUMAN DECISION</small><h3>Decision receipt</h3><p>Evidence, reviewer, and rationale remain attached to this release.</p><b><Check/> Signed</b></article></div>
    </section>

    <section className={styles.monitor}><div><p className={styles.kicker}><i /> Quiet by default</p><h2>Only the changes<br />that matter arrive.</h2><p>Monitor approved tools. Route meaningful changes to the right reviewer. Keep a history that holds up later.</p><Link href="/monitor">Explore release monitoring <ArrowRight /></Link></div><div className={styles.feed}><header><span><i/> Monitoring 24 extensions</span><small>LIVE</small></header><article><span>09:41</span><div><small>NEW RELEASE</small><strong>Vyper Guard 0.2.0 published</strong></div><em>Detected</em></article><article><span>09:42</span><div><small>AUTHORITY CHANGE</small><strong>Terminal + network access added</strong></div><em className={styles.review}>Review</em></article><article><span>09:43</span><div><small>DECISION QUEUE</small><strong>Routed to Platform Security</strong></div><ArrowRight/></article></div></section>

    <section className={styles.closing}><p className={styles.kicker}><i /> The decision is already attached</p><h2>Install with context.</h2><Link href="/registry">Search the registry <ArrowRight /></Link></section>
  </main>;
}
