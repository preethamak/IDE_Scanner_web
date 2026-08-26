import { BadgeCheck, Blocks, Download, ScanSearch } from "lucide-react";
import styles from "./authorityLanding.module.css";

const metrics = [
  { value: "~60,000", label: "Marketplace extensions", icon: Blocks },
  { value: "~1,800", label: "Verified publishers", icon: BadgeCheck },
  { value: "3.3B", label: "Marketplace installs", icon: Download },
  { value: "4×", label: "Detection growth in 10 months", icon: ScanSearch },
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
        <a href="https://www.sonatype.com/state-of-the-software-supply-chain/open-source-security" target="_blank" rel="noreferrer">Sonatype State of the Software Supply Chain</a>
      </footer>
    </section>
  );
}
