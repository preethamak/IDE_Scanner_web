import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import styles from "./authorityLanding.module.css";
import ReleaseReviewFilm from "./ReleaseReviewFilm";
import DecisionMemoryFilm from "./DecisionMemoryFilm";
import MarketplaceProof from "./MarketplaceProof";
import TrustProof from "./TrustProof";
import LandingFaq from "./LandingFaq";
import IdeCompatibility from "./IdeCompatibility";

export default function AuthorityLanding() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.eyebrow}><i /> IDE extension security</p><h1>See an extension’s access<br /><em>before it reaches your editor.</em></h1><p className={styles.heroLead}>GuardRails compares the package, permissions, and release history before you install. When a later version changes access, it shows exactly what changed.</p><div className={styles.actions}><Link href="/registry">Check an extension <ArrowRight /></Link><Link href="#how">See the flow <ChevronRight /></Link></div></div>
      <div className={styles.heroVisual}><ReleaseReviewFilm /></div>
    </section>
    <IdeCompatibility />
    <section className={styles.researchLink}><p>Case study</p><div><h2>Solidity Pro: a case study in extension supply-chain risk.</h2><Link href="/research/solidity-pro">Read the case study <ArrowRight /></Link></div></section>
    <MarketplaceProof />
    <TrustProof />
    <section className={styles.statement}><p className={styles.eyebrow}><i /> Decision context</p><h2>A version change<br /><em>needs a new decision.</em></h2><p>Keep the last review visible, then inspect only the access that changed.</p></section>
    <DecisionMemoryFilm />
    <LandingFaq />
    <section className={styles.close}><p className={styles.eyebrow}><i /> Start with one extension</p><h2>Inspect one extension.<br /><em>Keep the evidence.</em></h2><Link href="/registry">Check an extension <ArrowRight /></Link></section>
  </main>;
}
