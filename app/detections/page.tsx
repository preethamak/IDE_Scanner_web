import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Radar, ShieldAlert } from "lucide-react";
import { getPublicSecurityFeed } from "@/lib/productData";
import styles from "./detections.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recent detections · GuardRails",
  description:
    "Live feed of IDE extension releases recently flagged for review or blocked by GuardRails Deep Scan, with exact artifact evidence.",
  alternates: { canonical: "/detections" },
};

export default async function DetectionsPage() {
  const detections = await getPublicSecurityFeed(24);
  const blocked = detections.filter((item) => item.decision === "block").length;

  return (
    <main className={styles.page}>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            <Radar /> Live detections · updated continuously
          </span>
          <h1>
            Recently flagged
            <em> before anyone installed them.</em>
          </h1>
          <p>
            Every row is an exact marketplace release — extension ID, version,
            and SHA-256 — that Deep Scan flagged for review or blocked. Open any
            detection to inspect the full evidence, not a score.
          </p>
        </div>
        <aside className={styles.liveCard}>
          <header>
            <ShieldAlert />
            <span>
              <small>Current window</small>
              <strong>Latest {detections.length} flags</strong>
            </span>
          </header>
          <dl>
            <div>
              <dt>Flagged</dt>
              <dd>{detections.length}</dd>
            </div>
            <div>
              <dt>Blocked</dt>
              <dd>{blocked}</dd>
            </div>
            <div>
              <dt>Review</dt>
              <dd>{detections.length - blocked}</dd>
            </div>
          </dl>
          <footer className={styles.livePulse}>
            <i /> Feed reflects the current publication release only.
          </footer>
        </aside>
      </section>

      <section className={styles.feed} aria-label="Recent detections">
        <header className={styles.feedHeader}>
          <div>
            <span>Detection log</span>
            <h2>Open the context behind every flag.</h2>
          </div>
        </header>
        {detections.length ? (
          <div className={styles.rows}>
            {detections.map((item) => (
              <article className={styles.row} key={item.scan_id}>
                <b
                  className={`${styles.verdict} ${item.decision === "block" ? styles.block : styles.review}`}
                >
                  {item.decision === "block" ? "Blocked" : "Review"}
                </b>
                <div className={styles.identity}>
                  <Link
                    href={`/extensions/${encodeURIComponent(item.extension_id)}/versions/${encodeURIComponent(item.version)}/scans/${encodeURIComponent(item.scan_id)}`}
                  >
                    {item.display_name} <ArrowUpRight />
                  </Link>
                  <code>
                    {item.extension_id}@{item.version}
                  </code>
                </div>
                <p className={styles.reason}>{item.decision_reason}</p>
                <div className={styles.meta}>
                  <b>{item.severity}</b>
                  <small>{formatDate(item.scanned_at)}</small>
                  <small>{item.coverage_percent}% coverage</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            No releases are currently flagged in the active publication. That is
            a statement about this release window, not about the marketplace.
          </div>
        )}
      </section>

      <section className={styles.cta}>
        <div>
          <small>Stay ahead of updates</small>
          <h2>The next flag could land on something you already use.</h2>
          <p>
            Monitoring watches every release of the extensions your team depends
            on and notifies you when behavior meaningfully changes — not on
            version bumps.
          </p>
        </div>
        <Link href="/monitor">
          Start monitoring <ArrowUpRight />
        </Link>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en", { month: "short", day: "numeric" });
}
