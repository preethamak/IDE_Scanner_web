import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import HomeHero from "@/app/home/HomeHero";
import MarketplaceProof from "@/app/home/MarketplaceProof";
import PermissionDiff from "@/app/home/PermissionDiff";
import styles from "@/app/home/landing.module.css";

export default function HomePage() {
  return (
    <main className={styles.home}>
      <HomeHero />
      <MarketplaceProof />
      <PermissionDiff />

      <section className={styles.finalCta}>
        <div>
          <span className={styles.eyebrow}><i /> Start with evidence</span>
          <h2>One release.<br />One clear decision.</h2>
        </div>
        <div>
          <p>Start with the extension your team is considering now.</p>
          <div className={styles.ctaActions}>
            <Link href="/registry" className={styles.primaryButton}>Search extensions <ArrowRight /></Link>
            <Link href="/ide" className={styles.secondaryButton}>Explore GuardRails IDE <ArrowUpRight /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
