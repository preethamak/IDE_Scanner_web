import styles from "./auroraBackdrop.module.css";

// Inspired by React Bits' Aurora background. Rebuilt as a CSS-only,
// dependency-free surface so it remains server rendered and motion-safe.
export default function AuroraBackdrop({ className = "" }: { className?: string }) {
  return (
    <div className={`${styles.aurora} ${className}`} aria-hidden="true">
      <span className={styles.rose} />
      <span className={styles.peach} />
      <span className={styles.lime} />
      <span className={styles.grid} />
      <span className={styles.noise} />
    </div>
  );
}
