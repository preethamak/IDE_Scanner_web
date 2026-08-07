import { BadgeCheck, Blocks, Download, ScanSearch } from "lucide-react";
import styles from "./landing.module.css";

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
    </section>
  );
}
