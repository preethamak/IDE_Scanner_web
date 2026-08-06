import Link from "next/link";
import { ArrowRight, ArrowUpRight, Eye, PackageSearch } from "lucide-react";
import HomeHero from "@/app/home/HomeHero";
import MarketplaceProof from "@/app/home/MarketplaceProof";
import PermissionDiff from "@/app/home/PermissionDiff";
import ReleaseWorkflow from "@/app/home/ReleaseWorkflow";
import SecurityBento from "@/app/home/SecurityBento";
import { getPublicSecurityFeed } from "@/lib/productData";
import styles from "@/app/home/landing.module.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const feed = await getPublicSecurityFeed(6);
  const recent = feed[0] ?? null;

  return (
    <main className={styles.home}>
      <HomeHero />
      <MarketplaceProof />
      <PermissionDiff />
      <SecurityBento />
      <ReleaseWorkflow />

      <section className={styles.liveSection} aria-labelledby="live-heading">
        <div className={styles.liveIntro}>
          <span className={styles.eyebrow}><i /> Live intelligence</span>
          <h2 id="live-heading">Real releases.<br />Real evidence.</h2>
          <p>Public results stay attached to an exact extension version, so your team can inspect what was actually analyzed.</p>
          <Link href="/registry" className={styles.textLink}>Explore the registry <ArrowRight /></Link>
        </div>

        <div className={styles.feedCard}>
          <header><span><i /> Latest public analysis</span><small>Version-specific</small></header>
          {recent ? (
            <Link className={styles.featuredFinding} href={`/extensions/${encodeURIComponent(recent.extension_id)}/versions/${encodeURIComponent(recent.version)}`}>
              <div className={styles.findingIcon}>{recent.display_name.slice(0, 1).toUpperCase()}</div>
              <div><small>{recent.extension_id}</small><strong>{recent.display_name}</strong><p>{shorten(recent.decision_reason, 130)}</p></div>
              <span><code>@{recent.version}</code><ArrowUpRight /></span>
            </Link>
          ) : (
            <div className={styles.feedEmpty}><Eye /><div><strong>Public analysis is refreshing.</strong><p>Use the registry to inspect the latest available extension intelligence.</p></div></div>
          )}
          <div className={styles.feedList}>
            {feed.slice(1, 4).map((item) => (
              <Link href={`/extensions/${encodeURIComponent(item.extension_id)}/versions/${encodeURIComponent(item.version)}`} key={`${item.scan_id}-${item.extension_id}`}>
                <PackageSearch /><span><strong>{item.display_name}</strong><small>{shorten(item.decision_reason, 58)}</small></span><code>@{item.version}</code><ArrowUpRight />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <span className={styles.eyebrow}><i /> Start with evidence</span>
          <h2>Make the next install<br />an informed decision.</h2>
        </div>
        <div>
          <p>Search the public catalog, inspect one exact release, and keep meaningful changes visible.</p>
          <div className={styles.ctaActions}>
            <Link href="/registry" className={styles.primaryButton}>Search extensions <ArrowRight /></Link>
            <Link href="/ide" className={styles.secondaryButton}>Explore GuardRails IDE <ArrowUpRight /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function shorten(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}
