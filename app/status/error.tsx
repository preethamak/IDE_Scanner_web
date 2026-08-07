"use client";
import styles from "./status.module.css";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className={styles.page}>
      <section className={styles.loading}>
        <h1>Status check unavailable.</h1>
        <p>
          The health response could not be rendered. This is not reported as
          operational.
        </p>
        <button onClick={reset}>Retry status check</button>
      </section>
    </main>
  );
}
