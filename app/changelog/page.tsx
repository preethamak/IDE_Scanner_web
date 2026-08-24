import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { changelogEntries } from "./entries";
import styles from "../trust.module.css";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "What shipped on Guardrails: product changes, methodology updates, and site releases, newest first.",
  alternates: { canonical: "/changelog" },
};

const tagClass: Record<string, string> = {
  Product: "allow",
  Site: "review",
  Methodology: "block",
};

export default function ChangelogPage() {
  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            <History /> Changelog
          </span>
          <h1>
            Product and
            <br />
            <em>platform updates.</em>
          </h1>
          <p>
            User-visible product, methodology, and site changes are recorded
            here as they land.
          </p>
          <div className={styles.actions}>
            <Link href="/registry">
              Check an extension <ArrowRight />
            </Link>
            <Link href="/research">Read research notes</Link>
          </div>
        </div>
        <div className={styles.assurance}>
          <header>
            <History />
            <span>
              <small>Coverage</small>
              <strong>User-visible changes</strong>
            </span>
          </header>
          <div>
            <span>Entries</span>
            <strong>{changelogEntries.length}</strong>
          </div>
          <div>
            <span>Newest</span>
            <strong>{changelogEntries[0].date}</strong>
          </div>
          <footer>
            <ArrowRight /> Only user-visible changes are listed
          </footer>
        </div>
      </section>

      <section className={styles.boundaryList}>
        {changelogEntries.map((entry) => (
          <article key={`${entry.date}-${entry.title}`}>
            <header>
              <span>
                <History />
              </span>
              <div>
                <small>{entry.date}</small>
                <h3>{entry.title}</h3>
              </div>
              <b className={`decision ${tagClass[entry.tag]}`}>{entry.tag}</b>
            </header>
            <div>
              {entry.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className={styles.linkRail}>
        <Link href="/benchmark">
          <span>Benchmark</span>
          <strong>Detection changes show up here too.</strong>
          <ArrowRight />
        </Link>
        <Link href="/metrics">
          <span>Detection catalog</span>
          <strong>The current rule set.</strong>
          <ArrowRight />
        </Link>
        <Link href="/contact">
          <span>Contact</span>
          <strong>Request a change or report one.</strong>
          <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
