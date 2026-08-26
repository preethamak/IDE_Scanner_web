import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck } from "lucide-react";
import BadgeBuilder from "./BadgeBuilder";
import styles from "./badge.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Publisher trust badge · GuardRails",
  description:
    "Show your users that an exact release of your extension was analyzed by GuardRails. Pin the badge to the analyzed version and artifact hash.",
  alternates: { canonical: "/badge" },
};

export default function BadgePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>
          <BadgeCheck /> Publisher trust badge
        </span>
        <h1>
          Show what your release <em>actually is.</em>
        </h1>
        <p>
          The badge is pinned to an exact analyzed release — version and SHA-256
          — not to your extension in general. When a new release has not been
          analyzed yet, the badge says so instead of quietly inheriting the old
          verdict.
        </p>
      </section>

      <section className={styles.builder}>
        <BadgeBuilder origin="https://abscissa.dev" />
      </section>

      <section className={styles.rules}>
        <h2>The honest-badge rules.</h2>
        <ul>
          <li>
            The badge reflects the most recent completed public analysis for the
            extension — it never carries a private or superseded result.
          </li>
          <li>
            A blocked or review-needed release shows that state. Removing the
            badge does not remove the report.
          </li>
          <li>
            Reports stay immutable: the linked page preserves scanner build,
            ruleset, coverage, and limitations.
          </li>
        </ul>
        <Link href="/analyze">
          Request analysis for your latest release <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
