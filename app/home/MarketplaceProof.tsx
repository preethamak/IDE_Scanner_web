import { BadgeCheck, Blocks, Download } from "lucide-react";
import styles from "./authorityLanding.module.css";

// Every tile here must be a figure a reader can verify from the cited sources
// below. Self-reported GuardRails numbers belong in the registry block, which is
// labelled as our own data.
const metrics = [
  { value: "~60,000", label: "Marketplace extensions", icon: Blocks },
  { value: "~1,800", label: "Verified publishers", icon: BadgeCheck },
  { value: "3.3B", label: "Marketplace installs", icon: Download },
] as const;

export default function MarketplaceProof() {
  return (
    <section className={styles.proof} aria-labelledby="proof-heading">
      <header><span id="proof-heading">Marketplace scale demands better context</span><small>Public industry figures</small></header>
      <div>{metrics.map(({ value, label, icon: Icon }) => <article key={label}><Icon /><strong>{value}</strong><span>{label}</span></article>)}</div>
      <footer className={styles.proofSources}>
        <span>Sources:</span>
        <a href="https://marketplace.visualstudio.com/search?target=VSCode&category=All%20categories&sortBy=Installs" target="_blank" rel="noreferrer">VS Code Marketplace</a>
        <a href="https://open-vsx.org/" target="_blank" rel="noreferrer">Open VSX Registry</a>
        <a href="https://www.sonatype.com/state-of-the-software-supply-chain" target="_blank" rel="noreferrer">Sonatype State of the Software Supply Chain</a>
      </footer>
    </section>
  );
}
