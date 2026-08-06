import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BellRing, Check, CircleAlert, Eye, FileSearch, Layers3, ShieldCheck, Waypoints } from "lucide-react";
import BrandMark from "@/app/BrandMark";
import HomeSearch from "@/app/HomeSearch";
import SpotlightCard from "@/app/components/react-bits/SpotlightCard";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";

const signals = [
  ["New release", "A version changed"],
  ["What changed", "Capabilities and files"],
  ["What to do", "A clear next step"],
] as const;

export default function HomePage() {
  return <main className={styles.nextLanding}>
    <section className={styles.nextHero}>
      <div className={styles.nextHeroDots} aria-hidden="true" />
      <div className={styles.nextHeroCopy}>
        <span className={styles.nextEyebrow}><i /> GuardRails</span>
        <h1>Know what you install.</h1>
        <p>GuardRails helps you understand extensions before they enter your editor, then keeps the important changes in view.</p>
        <div className={styles.nextHeroActions}>
          <Link href="/registry" className={styles.nextPrimary}>Search extensions <ArrowRight /></Link>
          <Link href="/workspace" className={styles.nextSecondary}>Open workspace</Link>
        </div>
        <div className={styles.nextSearch}><HomeSearch compact /></div>
      </div>
      <div className={styles.nextHeroArt} aria-label="GuardRails extension intelligence visual">
        <Image src="/landing/release-control-room-hero.png" alt="Engineers reviewing software changes" fill priority sizes="(max-width: 800px) 100vw, 58vw" />
        <div className={styles.nextHeroShade} aria-hidden="true" />
        <SpotlightCard className={styles.nextHeroSignal} spotlightColor="rgba(198, 255, 65, 0.28)">
          <span><Waypoints /> Release noticed</span>
          <strong>A meaningful change, made clear.</strong>
          <p>See what changed in an extension without digging through the update.</p>
          <div><i /><i /><i /></div>
        </SpotlightCard>
      </div>
    </section>

    <section className={styles.nextIntro}>
      <p>Extensions are powerful software. Treat them that way.</p>
      <div><span>Before install</span><ArrowRight/><span>After every update</span></div>
    </section>

    <section className={styles.nextProduct}>
      <header><span className={styles.nextEyebrow}><i /> A simple loop</span><h2>See the change.<br/>Make the call.</h2><p>No raw scanner maze. Just the context you need, connected to the exact release.</p></header>
      <div className={styles.nextSignalGrid}>
        {signals.map(([title, detail], index) => <SpotlightCard key={title} className={styles.nextSignalCard} spotlightColor={index === 1 ? "rgba(255, 184, 77, 0.22)" : "rgba(198, 255, 65, 0.18)"}>
          <span>0{index + 1}</span><div>{index === 0 ? <BellRing/> : index === 1 ? <FileSearch/> : <ShieldCheck/>}<h3>{title}</h3><p>{detail}</p></div><ArrowRight/>
        </SpotlightCard>)}
      </div>
      <div className={styles.nextCanvas}>
        <div className={styles.nextCanvasHeader}><span><b /> GuardRails</span><small>Extension change</small><em>Ready to review</em></div>
        <div className={styles.nextCanvasBody}>
          <div className={styles.nextCanvasTitle}><span>Extension update</span><h3>The difference is the signal.</h3><p>New capabilities, removed files, and the evidence behind them.</p></div>
          <div className={styles.nextChangeList}><article><span className={styles.nextChangePlus}>+</span><div><strong>Terminal command</strong><small>New capability</small></div><em>Added</em></article><article><span className={styles.nextChangeDot} /><div><strong>Network access</strong><small>New destination found</small></div><em>Review</em></article><article><span className={styles.nextChangeCheck}><Check/></span><div><strong>Project files</strong><small>Existing capability</small></div><em>Unchanged</em></article></div>
        </div>
      </div>
    </section>

    <section className={styles.nextSplit}>
      <div className={styles.nextSplitImage}><Image src="/landing/release-control-room-hero.png" alt="Software team reviewing extension changes" fill sizes="(max-width: 800px) 100vw, 50vw" /></div>
      <div><span className={styles.nextEyebrow}><i /> Built for the moment after install</span><h2>Updates deserve the same attention as installs.</h2><p>A publisher can change what an extension can access. GuardRails gives you a visible record of the before and after.</p><Link href="/monitor">Explore monitoring <ArrowRight/></Link></div>
    </section>

    <section className={styles.nextProof}>
      <div><span className={styles.nextEyebrow}><i /> Made for clarity</span><h2>Evidence without the noise.</h2></div>
      <div className={styles.nextProofItems}><article><Eye/><strong>See the behavior</strong><p>Understand files, commands, and connections in plain language.</p></article><article><Layers3/><strong>Keep the release</strong><p>Every report stays connected to the version that was checked.</p></article><article><CircleAlert/><strong>Notice the difference</strong><p>Come back when a new release changes something that matters.</p></article></div>
    </section>

    <section className={styles.nextClosing}><BrandMark/><span>GuardRails</span><h2>A clearer way to trust what runs in your editor.</h2><Link href="/registry" className={styles.nextPrimary}>Search extensions <ArrowRight /></Link></section>
  </main>;
}
