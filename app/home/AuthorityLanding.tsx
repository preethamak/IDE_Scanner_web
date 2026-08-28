import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import styles from "./authorityLanding.module.css";
import ReleaseReviewFilm from "./ReleaseReviewFilm";
import DecisionMemoryFilm from "./DecisionMemoryFilm";
import MarketplaceProof from "./MarketplaceProof";
import TrustProof from "./TrustProof";
import LandingFaq from "./LandingFaq";

export default function AuthorityLanding() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.eyebrow}><i /> IDE extension security</p><h1>Know what an extension<br />does <em>before you install it.</em></h1><p className={styles.heroLead}>GuardRails scans marketplace extensions before you install them, then watches every update and flags when one quietly gains access to your terminal, files, or network.</p><div className={styles.actions}><Link href="/registry">Check an extension <ArrowRight /></Link><Link href="#how">See the flow <ChevronRight /></Link></div></div>
      <div className={styles.heroVisual}><ReleaseReviewFilm /></div>
    </section>
    <section className={styles.researchLink}><p>Latest research</p><div><h2>Solidity Pro: the wallet stealer behind the audit tool.</h2><Link href="/research/solidity-pro">Read the case study <ArrowRight /></Link></div></section>
    <MarketplaceProof />
    <TrustProof />
    <section className={styles.statement}><p className={styles.eyebrow}><i /> The moment that matters</p><h2>A release changes.<br /><em>Your team decides.</em></h2><p>GuardRails keeps that moment clear, quick, and attached to the work.</p></section>
    <DecisionMemoryFilm />
    <LandingFaq />
    <section className={styles.close}><p className={styles.eyebrow}><i /> Start with one tool</p><h2>See the change.<br /><em>Make the call.</em></h2><Link href="/registry">Explore GuardRails <ArrowRight /></Link></section>
  </main>;
}
