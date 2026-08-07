import styles from "./status.module.css";
export default function Loading() {
  return (
    <main className={styles.page}>
      <section className={styles.loading} aria-live="polite">
        <span />
        <h1>Checking service health…</h1>
        <p>
          Reading current operational signals without assuming unavailable
          systems are healthy.
        </p>
      </section>
    </main>
  );
}
