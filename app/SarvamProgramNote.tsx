import { ArrowUpRight, Sparkles } from "lucide-react";
import styles from "./sarvamProgramNote.module.css";

export default function SarvamProgramNote() {
  return (
    <section className={styles.note} id="sarvam-ai" aria-labelledby="sarvam-heading">
      <div className={styles.signal} aria-hidden="true">
        <Sparkles />
      </div>
      <div className={styles.content}>
        <p className={styles.eyebrow}>Sarvam AI Startup Program</p>
        <h2 id="sarvam-heading">Make security findings easier to understand.</h2>
        <p>
          GuardRails has been accepted into Sarvam AI&apos;s Startup Program. We&apos;re
          exploring Sarvam APIs for clear, localized summaries of structured
          extension-security findings.
        </p>
        <p className={styles.disclosure}>
          The program supports our product exploration; GuardRails decisions still
          come from exact artifacts, published evidence, and version-specific analysis.
        </p>
        <div className={styles.links}>
          <a href="https://indus.sarvam.ai" target="_blank" rel="noreferrer">
            Explore Sarvam Indus <ArrowUpRight />
          </a>
          <a href="https://docs.sarvam.ai" target="_blank" rel="noreferrer">
            Read the API docs <ArrowUpRight />
          </a>
        </div>
      </div>
      <aside className={styles.meta} aria-label="Sarvam AI program status">
        <span>Program relationship</span>
        <strong>Exploring localized explanations</strong>
        <small>For structured findings and developer-facing summaries.</small>
      </aside>
    </section>
  );
}
